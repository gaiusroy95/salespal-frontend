import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Sparkles, Video } from 'lucide-react';
import api, { getAccessToken } from '../../../lib/api';

const SIZE_OPTIONS = ['1080x1080', '1080x1920', '1920x1080', '1200x627'];
const STYLE_OPTIONS = ['Tech', 'Greenery', 'Natural', 'Future', 'Dark', 'Manual'];

export default function CustomStudio() {
    const [type, setType] = useState('image');
    const [prompt, setPrompt] = useState('');
    const [stylePreset, setStylePreset] = useState('Tech');
    const [manualStyle, setManualStyle] = useState('');
    const [mediaSize, setMediaSize] = useState('1080x1080');
    const [durationSec, setDurationSec] = useState(12);
    const [brandName, setBrandName] = useState('SalesPal');
    const [objective, setObjective] = useState('Awareness');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [videoJobId, setVideoJobId] = useState('');
    const [videoStatus, setVideoStatus] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoProgress, setVideoProgress] = useState('');
    const videoBlobRef = useRef('');

    const resolvedStyle = useMemo(
        () => (stylePreset === 'Manual' ? manualStyle.trim() : stylePreset),
        [stylePreset, manualStyle]
    );

    useEffect(() => {
        return () => {
            if (videoBlobRef.current) URL.revokeObjectURL(videoBlobRef.current);
        };
    }, []);

    const clearVideoPreview = () => {
        if (videoBlobRef.current) URL.revokeObjectURL(videoBlobRef.current);
        videoBlobRef.current = '';
        setVideoUrl('');
    };

    const fetchVideoStreamBlob = async (jobId) => {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
        const token = getAccessToken();
        const res = await fetch(`${baseUrl}/ai/video/jobs/${encodeURIComponent(jobId)}/stream`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Could not load generated video stream.');
        return res.blob();
    };

    const pollVideoJob = async (jobId) => {
        const started = Date.now();
        const timeoutMs = 6 * 60 * 1000;
        let delay = 2500;
        while (Date.now() - started < timeoutMs) {
            const status = await api.get(`/ai/video/jobs/${encodeURIComponent(jobId)}`);
            const s = String(status?.status || '').toLowerCase();
            setVideoStatus(s || 'running');
            setVideoProgress(status?.message || status?.error_message || '');
            if (s === 'completed') {
                const blob = await fetchVideoStreamBlob(jobId);
                clearVideoPreview();
                videoBlobRef.current = URL.createObjectURL(blob);
                setVideoUrl(videoBlobRef.current);
                return;
            }
            if (s === 'failed') {
                throw new Error(status?.error_message || 'Video generation failed.');
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay + 1000, 7000);
        }
        throw new Error('Video generation timed out. Please try again.');
    };

    const handleGenerate = async () => {
        setError('');
        setImageUrl('');
        setVideoJobId('');
        setVideoStatus('');
        setVideoProgress('');
        clearVideoPreview();
        const p = String(prompt || '').trim();
        if (!p) {
            setError('Please enter a prompt before generating.');
            return;
        }
        if (!resolvedStyle) {
            setError('Please provide a style value.');
            return;
        }
        setBusy(true);
        try {
            const response = await api.post('/api/marketing/custom-generate', {
                type,
                prompt: p,
                style: resolvedStyle,
                mediaSize,
                durationSec: type === 'video' ? Number(durationSec) : undefined,
                brandName,
                objective,
            });
            const data = response?.data || {};
            if (data.type === 'image') {
                setImageUrl(data.imageUrl || '');
            } else {
                setVideoJobId(data.jobId || '');
                setVideoStatus(data.status || 'queued');
                await pollVideoJob(data.jobId);
            }
        } catch (e) {
            setError(e?.message || 'Could not generate creative.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Custom Creative Studio</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Generate image or video assets for any purpose, then download directly.
                        </p>
                    </div>
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setType('image')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border ${type === 'image' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                        >
                            <span className="inline-flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('video')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border ${type === 'video' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                        >
                            <span className="inline-flex items-center gap-2"><Video className="h-4 w-4" /> Video</span>
                        </button>
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe exactly what you want to generate..."
                        className="w-full h-36 rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm text-gray-700">
                            Style
                            <select
                                value={stylePreset}
                                onChange={(e) => setStylePreset(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                                {STYLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <label className="text-sm text-gray-700">
                            Size
                            <select
                                value={mediaSize}
                                onChange={(e) => setMediaSize(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                                {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                    </div>

                    {stylePreset === 'Manual' ? (
                        <input
                            value={manualStyle}
                            onChange={(e) => setManualStyle(e.target.value)}
                            placeholder="Enter custom style description"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                    ) : null}

                    {type === 'video' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className="text-sm text-gray-700">
                                Duration (sec)
                                <input
                                    type="number"
                                    min={4}
                                    max={180}
                                    value={durationSec}
                                    onChange={(e) => setDurationSec(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            </label>
                            <label className="text-sm text-gray-700">
                                Brand Name
                                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                            </label>
                            <label className="text-sm text-gray-700">
                                Objective
                                <input value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                            </label>
                        </div>
                    ) : null}

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    <button
                        type="button"
                        disabled={busy}
                        onClick={handleGenerate}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {busy ? 'Generating...' : `Generate ${type === 'image' ? 'Image' : 'Video'}`}
                    </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm min-h-[420px]">
                    <h2 className="text-base font-semibold text-gray-900 mb-3">Preview & Download</h2>
                    {!imageUrl && !videoUrl ? (
                        <div className="h-[340px] rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
                            Generated creative will appear here.
                        </div>
                    ) : null}

                    {imageUrl ? (
                        <div className="space-y-3">
                            <img src={imageUrl} alt="Generated creative" className="w-full rounded-xl border border-gray-200 object-cover" />
                            <a href={imageUrl} download="custom-image.png" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                                <Download className="h-4 w-4" /> Download image
                            </a>
                        </div>
                    ) : null}

                    {type === 'video' ? (
                        <div className="space-y-3">
                            {videoJobId && !videoUrl ? (
                                <p className="text-sm text-gray-600">
                                    Job: <span className="font-mono">{videoJobId}</span> | Status: <span className="font-medium">{videoStatus || 'running'}</span>
                                    {videoProgress ? ` - ${videoProgress}` : ''}
                                </p>
                            ) : null}
                            {videoUrl ? (
                                <>
                                    <video src={videoUrl} controls className="w-full rounded-xl border border-gray-200" />
                                    <a href={videoUrl} download="custom-video.mp4" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                                        <Download className="h-4 w-4" /> Download video
                                    </a>
                                </>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
