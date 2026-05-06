import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Video, AlertCircle } from 'lucide-react';
import { createSlideshowVideo } from '../../../../utils/createSlideshowVideo';
import api, { getAccessToken } from '../../../../lib/api';

const NEAR_INFINITE_WAIT_MS = Number.MAX_SAFE_INTEGER;
const getApiBaseUrl = () => String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

function apiErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string' && err.message) return err.message;
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  return fallback;
}

function isLikelyPrivateStorageUrl(value) {
  const s = String(value || '').trim().toLowerCase();
  return s.startsWith('gs://') || s.includes('storage.googleapis.com/');
}

async function fetchMediaBlobWithRetry(url, headers = {}, attempts = 3) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return { blob, status: res.status };
      lastError = new Error('Empty media blob returned');
    } else {
      const txt = await res.text().catch(() => '');
      lastError = new Error(`Video stream failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ''}`);
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError || new Error('Video stream failed');
}

function nextPollDelayMs(elapsedMs) {
  // Adaptive polling to reduce backend pressure during long-running jobs.
  if (elapsedMs < 30_000) return 4_000;
  if (elapsedMs < 120_000) return 7_000;
  return 12_000;
}
/**
 * Encodes slides as a WebM slideshow the user can play inline.
 */
export default function CreativeVideoFromImages({
  imageUrls,
  durationSec = 12,
  videoPrompt = '',
  requireAiVideo = false,
  subtitleEnabled = false,
  subtitleText = '',
  enableAudio = false,
  onVideoReady = null,
  className = '',
}) {
  const key = useMemo(
    () => `${(imageUrls || []).filter(Boolean).join('|')}::${durationSec}::${videoPrompt}`,
    [imageUrls, durationSec, videoPrompt]
  );
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [videoSource, setVideoSource] = useState('local');

  useEffect(() => {
    const urls = (imageUrls || []).filter(Boolean);
    if (urls.length === 0) {
      setVideoUrl(null);
      setError(null);
      setBusy(false);
      return undefined;
    }

    let cancelled = false;
    let objectUrl;
    let remoteObjectUrl;

    (async () => {
      setBusy(true);
      setError(null);
      setVideoUrl(null);
      setVideoSource('local');
      try {
        const promptText =
          videoPrompt ||
          'Create a realistic, lifelike promotional video with dynamic motion and natural human presence.';
        const subtitleHint = subtitleEnabled
          ? `Include subtitles in the video. Subtitle text guide: ${String(subtitleText || '').trim() || 'Auto-generate from narration'}.`
          : 'Do not burn subtitles into the video.';
        const audioHint = enableAudio
          ? 'Generate with cinematic background audio.'
          : 'No background music or voiceover in final video.';
        const finalPrompt = `${promptText}\n${subtitleHint}\n${audioHint}`;

        let remoteVideo = null;
        let remoteError = '';
        try {
          const job = await api.post('/ai/video/jobs', {
            prompt: finalPrompt,
            objective: 'Conversions',
            locale: 'en',
            durationSec: Math.max(4, Number(durationSec) || 12),
            aspectRatio: '9:16',
            // Do not anchor to a single still image for "video ads";
            // this often leads to static image-to-video behavior.
            referenceImageUrl: requireAiVideo ? '' : (urls[0] || ''),
          });
          const jobId = job?.job_id || job?.id;
          if (jobId) {
            const started = Date.now();
            while (Date.now() - started < NEAR_INFINITE_WAIT_MS && !cancelled) {
              let s = null;
              try {
                s = await api.get(`/ai/video/jobs/${jobId}`);
              } catch (pollErr) {
                const msg = String(pollErr?.message || '');
                const status = Number(pollErr?.status || 0);
                if (status === 429 || /rate limit|too many requests/i.test(msg)) {
                  // Back off and continue polling instead of failing the flow.
                  await new Promise((r) => setTimeout(r, 15_000));
                  continue;
                }
                throw pollErr;
              }
              const state = String(s?.status || '').toLowerCase();
              if (state === 'completed' || state === 'done') {
                const token = getAccessToken();
                try {
                  const { blob: mediaBlob } = await fetchMediaBlobWithRetry(
                    `${getApiBaseUrl()}/ai/video/jobs/${jobId}/stream`,
                    token ? { Authorization: `Bearer ${token}` } : {},
                    3
                  );
                  if (mediaBlob && mediaBlob.size > 0) {
                    remoteObjectUrl = URL.createObjectURL(mediaBlob);
                    remoteVideo = remoteObjectUrl;
                  }
                } catch (streamErr) {
                  remoteError = streamErr?.message || 'Video stream failed. Please verify backend media stream access.';
                }
                if (!remoteVideo) {
                  const fallbackVideo =
                    s?.video_url ||
                    s?.result?.video_url ||
                    s?.result?.videoUrl ||
                    s?.result?.clips?.[0]?.videoUrl ||
                    null;
                  // Never use direct private storage URLs in browser;
                  // they commonly fail with 403 and appear as blank videos.
                  if (fallbackVideo && !isLikelyPrivateStorageUrl(fallbackVideo)) {
                    remoteVideo = fallbackVideo;
                  }
                }
                break;
              }
              if (state === 'failed' || state === 'error') {
                remoteError = s?.error || s?.result?.error || 'AI provider failed to generate video';
                break;
              }
              await new Promise((r) => setTimeout(r, nextPollDelayMs(Date.now() - started)));
            }
          }
        } catch (_) {
          // Silent fallback to local render when remote provider isn't configured.
          remoteVideo = null;
        }

        if (remoteVideo) {
          if (!cancelled) {
            setVideoSource('ai');
            setVideoUrl(remoteVideo);
            if (typeof onVideoReady === 'function') onVideoReady(remoteVideo);
          }
          return;
        }

        if (requireAiVideo) {
          throw new Error(
            remoteError ||
              'AI video generation failed. Check provider/model configuration, credits, and AI_VIDEO_VEO_STORAGE_URI on the backend, then retry.'
          );
        }

        objectUrl = await createSlideshowVideo(urls, {
          totalDurationMs: Math.max(4, Number(durationSec) || 12) * 1000,
          durationPerSlideMs: 2000,
          transitionMs: 500,
          width: 720,
          height: 1152,
          fps: 24,
        });
        if (!cancelled) {
          setVideoSource('local');
          setVideoUrl(objectUrl);
          if (typeof onVideoReady === 'function') onVideoReady(objectUrl);
        } else URL.revokeObjectURL(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Video build failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (remoteObjectUrl) URL.revokeObjectURL(remoteObjectUrl);
    };
  }, [key, requireAiVideo, subtitleEnabled, subtitleText, enableAudio, onVideoReady]);

  if (!imageUrls?.length) {
    return (
      <div className={`rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 p-8 text-gray-500 text-sm ${className}`}>
        <Video className="w-8 h-8 opacity-40" />
        <span>Add generated images to preview video</span>
      </div>
    );
  }

  if (busy) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-gray-900/5 flex flex-col items-center justify-center gap-3 p-10 ${className}`}>
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-600 text-center max-w-xs">
          Building a dynamic {durationSec}s video from {imageUrls.length} AI slides...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50/80 flex items-start gap-2 p-4 text-sm text-red-800 ${className}`}>
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!videoUrl) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 bg-black shadow-md ${className}`}>
      <video
        src={videoUrl}
        controls
        playsInline
        className="w-full max-h-[480px] object-contain bg-black"
        onError={() =>
          setError('Video file could not be loaded in browser. Please retry generation or verify media access on backend storage.')
        }
      />
      <p className="text-[11px] text-gray-500 px-3 py-2 bg-gray-50 border-t border-gray-100">
        {videoSource === 'ai'
          ? 'AI-generated motion video (server-side provider).'
          : 'Motion preview generated in-browser with cinematic pan/zoom + smooth transitions (fallback).'}
      </p>
    </div>
  );
}
