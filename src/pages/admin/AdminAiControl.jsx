import React, { useEffect, useState } from 'react';
import { Bot, Loader2, Save } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';

const AdminAiControl = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);
  const [config, setConfig] = useState({
    llmProvider: 'gemini',
    imageProvider: 'flux',
    videoProvider: 'kling',
    voiceProvider: 'sarvam',
    fallbackEnabled: true,
    promptPolicy: 'project-first',
    escalationMode: 'ai_first',
    mediaQuality: 'hd',
    creditConsumptionRules: { text: 1, image: 5, video: 20, voiceMinute: 3 },
  });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const out = await api.get('/admin/ai-control');
      setConfig((prev) => ({ ...prev, ...(out?.aiControl?.config || {}) }));
      setUsage(out?.aiControl?.usage || null);
    } catch (e) {
      setError(e?.message || 'Failed to load AI control');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setField = (k, v) => setConfig((prev) => ({ ...prev, [k]: v }));
  const setRule = (k, v) =>
    setConfig((prev) => ({
      ...prev,
      creditConsumptionRules: { ...(prev.creditConsumptionRules || {}), [k]: Math.max(0, Number(v) || 0) },
    }));

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      await api.put('/admin/ai-control', { config });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to save AI control');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <TopHeader title="AI Control" subtitle="Provider and AI governance control room" />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading AI control…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopHeader title="AI Control" subtitle="Providers, policies, fallback and cost rules" />
      <div className="p-4 md:p-6 space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Bot size={18} className="text-blue-600" />
              Providers
            </div>
            <label className="block text-sm text-gray-700">
              LLM Provider
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.llmProvider || ''} onChange={(e) => setField('llmProvider', e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Image AI Provider
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.imageProvider || ''} onChange={(e) => setField('imageProvider', e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Video AI Provider
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.videoProvider || ''} onChange={(e) => setField('videoProvider', e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Voice Provider
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.voiceProvider || ''} onChange={(e) => setField('voiceProvider', e.target.value)} />
            </label>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="font-semibold text-gray-900">Policy & Consumption</div>
            <label className="block text-sm text-gray-700">
              Prompt Policy
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.promptPolicy || ''} onChange={(e) => setField('promptPolicy', e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Escalation Mode
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.escalationMode || ''} onChange={(e) => setField('escalationMode', e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Media Quality
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={config.mediaQuality || ''} onChange={(e) => setField('mediaQuality', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={Boolean(config.fallbackEnabled)} onChange={(e) => setField('fallbackEnabled', e.target.checked)} />
              AI Fallback Enabled
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600">Text Credit
                <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" value={config.creditConsumptionRules?.text || 0} onChange={(e) => setRule('text', e.target.value)} />
              </label>
              <label className="text-xs text-gray-600">Image Credit
                <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" value={config.creditConsumptionRules?.image || 0} onChange={(e) => setRule('image', e.target.value)} />
              </label>
              <label className="text-xs text-gray-600">Video Credit
                <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" value={config.creditConsumptionRules?.video || 0} onChange={(e) => setRule('video', e.target.value)} />
              </label>
              <label className="text-xs text-gray-600">Voice/Min Credit
                <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" value={config.creditConsumptionRules?.voiceMinute || 0} onChange={(e) => setRule('voiceMinute', e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="font-semibold text-gray-900 mb-3">AI Usage Tracking (30 days)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div className="text-gray-500">Total AI Actions</div>
              <div className="text-lg font-bold text-gray-900">{Number(usage?.total_ai_actions || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div className="text-gray-500">Action Rows</div>
              <div className="text-lg font-bold text-gray-900">{Number(usage?.action_rows || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div className="text-gray-500">AI Failures</div>
              <div className="text-lg font-bold text-red-700">{Number(usage?.failures || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save AI Control'}
        </button>
      </div>
    </div>
  );
};

export default AdminAiControl;

