import React, { useMemo, useState } from 'react';
import { Layers, Image as ImageIcon, Video, Download, Expand } from 'lucide-react';
import CreativeVideoFromImages from './CreativeVideoFromImages';

function downloadAsset(url, filename) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'asset';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function GeneratedCreativesPanel({
  chosenCampaign,
  selectedAdFormat,
  videoDurationSec = 12,
  subtitleEnabled = false,
  subtitleText = '',
  enableAudio = false,
}) {
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [playableVideoUrl, setPlayableVideoUrl] = useState('');
  if (!chosenCampaign) return null;

  const slides =
    (chosenCampaign.carouselImages?.length && chosenCampaign.carouselImages) ||
    chosenCampaign.images ||
    [chosenCampaign.imageUrl || chosenCampaign.image].filter(Boolean);

  const videoPrompt = useMemo(
    () =>
      [
        `Brand campaign: ${chosenCampaign.campaignName || chosenCampaign.campaignTitle || 'Campaign'}`,
        `Primary message: ${chosenCampaign.primaryText || chosenCampaign.descriptions?.[0] || ''}`,
        `Headline: ${chosenCampaign.headlines?.[0] || ''}`,
        'Create a lifelike, dynamic promotional video with natural movement and human presence.',
      ]
        .filter(Boolean)
        .join('\n'),
    [chosenCampaign]
  );

  if (!slides.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
        No AI images were returned for this campaign. Try regenerating ads, or check your backend image provider.
      </div>
    );
  }

  return (
    <>
      {lightboxSrc ? (
        <div className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightboxSrc('')}>
          <img src={lightboxSrc} alt="Fullscreen preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-linear-to-r from-blue-50/80 to-indigo-50/50">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            AI creatives
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Format: <span className="font-medium text-gray-700">{selectedAdFormat || 'image'}</span>
            {' · '}
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
            {' · '}Video {videoDurationSec}s
          </p>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Hero
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square max-h-56 mx-auto relative group">
              <img src={slides[0]} alt="Primary creative" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded bg-black/60 text-white" onClick={() => setLightboxSrc(slides[0])}>
                  <Expand className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded bg-black/60 text-white" onClick={() => downloadAsset(slides[0], 'creative-image.jpg')}>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {slides.length > 1 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Carousel slides
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {slides.map((src, i) => (
                  <div key={i} className="shrink-0 w-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex flex-col bg-white">
                    <div className="aspect-[4/5] w-full bg-gray-100 relative group">
                      <img src={src} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      <button className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100" onClick={() => setLightboxSrc(src)}>
                        <Expand className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-center text-[9px] font-semibold text-gray-500 py-0.5 bg-gray-50 border-t border-gray-100">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Video className="w-3 h-3" />
                Video preview
              </p>
              {playableVideoUrl ? (
                <button className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-1" onClick={() => downloadAsset(playableVideoUrl, 'creative-video.mp4')}>
                  <Download className="w-3.5 h-3.5" />
                  Download video
                </button>
              ) : null}
            </div>
            <CreativeVideoFromImages
              imageUrls={slides}
              durationSec={videoDurationSec}
              videoPrompt={videoPrompt}
              requireAiVideo={true}
              subtitleEnabled={subtitleEnabled}
              subtitleText={subtitleText}
              enableAudio={enableAudio}
              onVideoReady={(url) => setPlayableVideoUrl(url || '')}
            />
          </div>
        </div>
      </div>
    </>
  );
}
