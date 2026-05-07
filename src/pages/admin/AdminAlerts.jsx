import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import AdminFilterExportBar from './components/AdminFilterExportBar';
import { EMPTY_STATE_FILTERED, formatAdminDateTime } from './utils/adminUi';

const tabConfig = [
  { key: 'critical', label: 'Critical Alerts', icon: AlertTriangle },
  { key: 'ai', label: 'AI Alerts', icon: Sparkles },
  { key: 'communications', label: 'Communication Alerts', icon: Volume2 },
  { key: 'security', label: 'Security Alerts', icon: ShieldAlert },
];

const AdminAlerts = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState({});
  const [tab, setTab] = useState('critical');
  const [readFilter, setReadFilter] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const out = await api.get('/admin/alerts');
      setAlerts(out?.alerts || {});
    } catch (e) {
      setError(e?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeItems = useMemo(() => alerts?.[tab] || [], [alerts, tab]);
  const filteredItems = useMemo(() => {
    if (readFilter === 'all') return activeItems;
    if (readFilter === 'unread') return activeItems.filter((it) => !Boolean(it.read));
    if (readFilter === 'read') return activeItems.filter((it) => Boolean(it.read));
    return activeItems;
  }, [activeItems, readFilter]);

  const acknowledge = async (id) => {
    if (!id) return;
    try {
      await api.put(`/admin/alerts/${id}/ack`, {});
      setAlerts((prev) => ({
        ...prev,
        [tab]: (prev?.[tab] || []).map((it) => (it.id === id ? { ...it, read: true } : it)),
      }));
    } catch (e) {
      setError(e?.message || 'Failed to acknowledge alert');
    }
  };

  const exportAlertsCsv = () => {
    const header = 'id,category,title,message,read,created_at';
    const lines = filteredItems.map((item) =>
      [item.id || '', tab, item.title || item.action_type || 'Alert', item.message || item.entity_type || '', Boolean(item.read), item.created_at || '']
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <TopHeader title="Alerts" subtitle="Critical, AI, communication, and security alert center" />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading alerts…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopHeader title="Alerts" subtitle="Unified operational and security alert center" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          {tabConfig.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                tab === t.key ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <AdminFilterExportBar label="Read Status" exportLabel="Export Alerts CSV" onExport={exportAlertsCsv}>
          <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="all">all</option>
            <option value="unread">unread</option>
            <option value="read">read</option>
          </select>
        </AdminFilterExportBar>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            {tabConfig.find((x) => x.key === tab)?.label} ({filteredItems.length})
          </div>
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item, idx) => (
              <div key={item.id || `${tab}-${idx}`} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{item.title || item.action_type || 'Alert'}</div>
                  <div className="text-xs text-gray-500 mt-1 break-words">{item.message || item.entity_type || '—'}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{formatAdminDateTime(item.created_at)}</div>
                </div>
                {'read' in item ? (
                  <button
                    onClick={() => acknowledge(item.id)}
                    disabled={Boolean(item.read)}
                    className="shrink-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {item.read ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                ) : null}
              </div>
            ))}
            {filteredItems.length === 0 && <div className="px-4 py-8 text-sm text-gray-500 text-center">{EMPTY_STATE_FILTERED}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAlerts;

