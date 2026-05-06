import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import NotificationsTab from '../../profile/tabs/NotificationsTab';
import api from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';

const DEFAULT_MARKETING_DEFAULTS = {
    campaignObjective: 'Conversions',
    dailyBudget: 3500,
    preferredPlatforms: ['meta', 'google'],
    adFormat: 'image',
};

const DEFAULT_MARKETING_TRACKING = {
    autoAppendUtm: true,
    utmSource: 'salespal',
    utmMedium: 'paid_social',
    utmCampaignPrefix: 'sp',
    utmContent: '',
    utmTerm: '',
};

const PLATFORM_OPTIONS = [
    { id: 'meta', label: 'Meta Ads' },
    { id: 'google', label: 'Google Ads' },
    { id: 'linkedin', label: 'LinkedIn Ads' },
    { id: 'youtube', label: 'YouTube Ads' },
    { id: 'twitter', label: 'X / Twitter Ads' },
    { id: 'instagram', label: 'Instagram Ads' },
];

function safeArrayPlatforms(value) {
    if (!Array.isArray(value)) return DEFAULT_MARKETING_DEFAULTS.preferredPlatforms;
    const cleaned = value.filter((item) => typeof item === 'string' && item.trim());
    return cleaned.length ? cleaned : DEFAULT_MARKETING_DEFAULTS.preferredPlatforms;
}

export const MarketingSettingsDefaults = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_MARKETING_DEFAULTS);

    const canSave = useMemo(
        () => Number(settings.dailyBudget) > 0 && settings.preferredPlatforms.length > 0,
        [settings.dailyBudget, settings.preferredPlatforms.length]
    );

    const applyDefaults = (value = {}) => {
        setSettings({
            campaignObjective: String(value.campaignObjective || DEFAULT_MARKETING_DEFAULTS.campaignObjective),
            dailyBudget: Number(value.dailyBudget || DEFAULT_MARKETING_DEFAULTS.dailyBudget),
            preferredPlatforms: safeArrayPlatforms(value.preferredPlatforms),
            adFormat: String(value.adFormat || DEFAULT_MARKETING_DEFAULTS.adFormat),
        });
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const allSettings = await api.get('/users/me/settings');
                const marketing = allSettings?.marketing && typeof allSettings.marketing === 'object' ? allSettings.marketing : {};
                const defaults = marketing.defaults && typeof marketing.defaults === 'object' ? marketing.defaults : {};
                if (mounted) applyDefaults(defaults);
            } catch (_) {
                if (mounted) applyDefaults(DEFAULT_MARKETING_DEFAULTS);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    const togglePlatform = (id) => {
        setSettings((prev) => {
            const exists = prev.preferredPlatforms.includes(id);
            const next = exists ? prev.preferredPlatforms.filter((p) => p !== id) : [...prev.preferredPlatforms, id];
            return { ...prev, preferredPlatforms: next };
        });
    };

    const saveSettings = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const payload = {
                marketing: {
                    defaults: {
                        campaignObjective: settings.campaignObjective,
                        dailyBudget: Number(settings.dailyBudget),
                        preferredPlatforms: settings.preferredPlatforms,
                        adFormat: settings.adFormat,
                    },
                },
            };
            await api.put('/users/me/settings', payload);
            showToast({
                title: 'Defaults saved',
                description: 'Campaign defaults will be prefilled in new campaign drafts.',
                variant: 'success',
            });
        } catch (err) {
            showToast({
                title: 'Failed to save defaults',
                description: err?.message || 'Please try again.',
                variant: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-gray-900">Campaign Defaults</h1>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Objective</label>
                        <select
                            value={settings.campaignObjective}
                            disabled={loading || saving}
                            onChange={(e) => setSettings((p) => ({ ...p, campaignObjective: e.target.value }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        >
                            {['Conversions', 'Leads', 'Traffic', 'Awareness', 'Sales'].map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Daily Budget</label>
                        <input
                            type="number"
                            min={1}
                            value={settings.dailyBudget}
                            disabled={loading || saving}
                            onChange={(e) => setSettings((p) => ({ ...p, dailyBudget: Number(e.target.value || 0) }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Ad Format</label>
                    <select
                        value={settings.adFormat}
                        disabled={loading || saving}
                        onChange={(e) => setSettings((p) => ({ ...p, adFormat: e.target.value }))}
                        className="w-full md:w-64 text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                    >
                        {['image', 'carousel', 'video'].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preferred Platforms</label>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {PLATFORM_OPTIONS.map((platform) => {
                            const active = settings.preferredPlatforms.includes(platform.id);
                            return (
                                <button
                                    key={platform.id}
                                    type="button"
                                    disabled={loading || saving}
                                    onClick={() => togglePlatform(platform.id)}
                                    className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                        active
                                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {platform.label}
                                </button>
                            );
                        })}
                    </div>
                    {settings.preferredPlatforms.length === 0 && (
                        <p className="mt-2 text-xs text-red-600">Select at least one platform.</p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        disabled={loading || saving}
                        onClick={() => applyDefaults(DEFAULT_MARKETING_DEFAULTS)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to defaults
                    </button>
                    <button
                        type="button"
                        disabled={loading || saving || !canSave}
                        onClick={saveSettings}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MarketingSettingsTracking = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tracking, setTracking] = useState(DEFAULT_MARKETING_TRACKING);

    const applyTracking = (value = {}) => {
        setTracking({
            autoAppendUtm: value.autoAppendUtm !== false,
            utmSource: String(value.utmSource || DEFAULT_MARKETING_TRACKING.utmSource),
            utmMedium: String(value.utmMedium || DEFAULT_MARKETING_TRACKING.utmMedium),
            utmCampaignPrefix: String(value.utmCampaignPrefix || DEFAULT_MARKETING_TRACKING.utmCampaignPrefix),
            utmContent: String(value.utmContent || DEFAULT_MARKETING_TRACKING.utmContent),
            utmTerm: String(value.utmTerm || DEFAULT_MARKETING_TRACKING.utmTerm),
        });
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const allSettings = await api.get('/users/me/settings');
                const marketing = allSettings?.marketing && typeof allSettings.marketing === 'object' ? allSettings.marketing : {};
                const saved = marketing.tracking && typeof marketing.tracking === 'object' ? marketing.tracking : {};
                if (mounted) applyTracking(saved);
            } catch (_) {
                if (mounted) applyTracking(DEFAULT_MARKETING_TRACKING);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    const saveTracking = async () => {
        setSaving(true);
        try {
            await api.put('/users/me/settings', { marketing: { tracking } });
            showToast({
                title: 'Tracking settings saved',
                description: 'UTM defaults will be attached to new campaign publishing metadata.',
                variant: 'success',
            });
        } catch (err) {
            showToast({
                title: 'Failed to save tracking',
                description: err?.message || 'Please try again.',
                variant: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-gray-900">Tracking & Attribution</h1>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Auto-append UTM tags</p>
                        <p className="text-xs text-gray-500">Attach campaign tracking tags during publishing.</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={tracking.autoAppendUtm}
                        disabled={loading || saving}
                        onChange={(e) => setTracking((p) => ({ ...p, autoAppendUtm: e.target.checked }))}
                        className="h-4 w-4"
                    />
                </label>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM Source</label>
                        <input
                            type="text"
                            value={tracking.utmSource}
                            disabled={loading || saving}
                            onChange={(e) => setTracking((p) => ({ ...p, utmSource: e.target.value }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM Medium</label>
                        <input
                            type="text"
                            value={tracking.utmMedium}
                            disabled={loading || saving}
                            onChange={(e) => setTracking((p) => ({ ...p, utmMedium: e.target.value }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM Campaign Prefix</label>
                        <input
                            type="text"
                            value={tracking.utmCampaignPrefix}
                            disabled={loading || saving}
                            onChange={(e) => setTracking((p) => ({ ...p, utmCampaignPrefix: e.target.value }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM Content (optional)</label>
                        <input
                            type="text"
                            value={tracking.utmContent}
                            disabled={loading || saving}
                            onChange={(e) => setTracking((p) => ({ ...p, utmContent: e.target.value }))}
                            className="w-full text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UTM Term (optional)</label>
                    <input
                        type="text"
                        value={tracking.utmTerm}
                        disabled={loading || saving}
                        onChange={(e) => setTracking((p) => ({ ...p, utmTerm: e.target.value }))}
                        className="w-full md:w-1/2 text-sm border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        disabled={loading || saving}
                        onClick={() => applyTracking(DEFAULT_MARKETING_TRACKING)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to defaults
                    </button>
                    <button
                        type="button"
                        disabled={loading || saving}
                        onClick={saveTracking}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MarketingSettingsNotifications = () => (
    <div className="animate-fade-in-up">
        <NotificationsTab />
    </div>
);
