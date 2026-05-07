import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, PhoneCall, Server } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import AdminFilterExportBar from './components/AdminFilterExportBar';
import { EMPTY_STATE_FILTERED, formatAdminDateTime } from './utils/adminUi';

const StatCard = ({ title, value, tone = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <p className="text-xs text-gray-500 mb-1">{title}</p>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

const AdminCommunications = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const out = await api.get('/admin/communications');
        setData(out?.communications || null);
      } catch (e) {
        setError(e?.message || 'Failed to load communications');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredDeliveries = useMemo(() => {
    const rows = data?.failedDeliveries || [];
    if (deliveryFilter === 'all') return rows;
    return rows.filter((r) => String(r.type || '').toLowerCase() === deliveryFilter);
  }, [data?.failedDeliveries, deliveryFilter]);

  const deliveryTypes = useMemo(
    () => ['all', ...new Set((data?.failedDeliveries || []).map((r) => String(r.type || '').toLowerCase()).filter(Boolean))],
    [data?.failedDeliveries]
  );

  const exportFailedDeliveriesCsv = () => {
    const header = 'id,type,title,message,created_at';
    const lines = filteredDeliveries.map((row) =>
      [row.id || '', row.type || '', row.title || '', row.message || '', row.created_at || '']
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'communications-failed-deliveries.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <TopHeader title="Communications" subtitle="WhatsApp and calling control room" />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading communications…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopHeader title="Communications" subtitle="Provider health, failed deliveries, and operational events" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="WhatsApp Success Rate" value={`${Number(data?.whatsapp?.successRate ?? 100)}%`} tone="text-emerald-700" />
          <StatCard title="Call Success Rate" value={`${Number(data?.calling?.successRate ?? 100)}%`} tone="text-blue-700" />
          <StatCard title="WhatsApp Failures (7d)" value={Number(data?.whatsapp?.failed7d || 0).toLocaleString()} tone="text-amber-700" />
          <StatCard title="Call Failures (7d)" value={Number(data?.calling?.failed7d || 0).toLocaleString()} tone="text-red-700" />
        </div>

        <AdminFilterExportBar label="Failure Type" exportLabel="Export Failures CSV" onExport={exportFailedDeliveriesCsv}>
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {deliveryTypes.map((type) => (
              <option key={type} value={type}>
                {type || 'unknown'}
              </option>
            ))}
          </select>
        </AdminFilterExportBar>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageSquare size={16} className="text-emerald-600" />
              Failed Deliveries
            </div>
            <div className="divide-y divide-gray-100">
              {filteredDeliveries.slice(0, 20).map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{row.title || row.type}</div>
                  <div className="text-xs text-gray-500 mt-0.5 break-words">{row.message || '—'}</div>
                </div>
              ))}
              {filteredDeliveries.length === 0 && (
                <div className="px-4 py-8 text-sm text-gray-500 text-center">{EMPTY_STATE_FILTERED}</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Server size={16} className="text-blue-600" />
              Provider Status Events
            </div>
            <div className="divide-y divide-gray-100">
              {(data?.providerStatusEvents || []).slice(0, 20).map((row, idx) => (
                <div key={`${row.created_at}-${idx}`} className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{row.action_type || 'Provider event'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatAdminDateTime(row.created_at)}</div>
                </div>
              ))}
              {(!data?.providerStatusEvents || data.providerStatusEvents.length === 0) && (
                <div className="px-4 py-8 text-sm text-gray-500 text-center">{EMPTY_STATE_FILTERED}</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 flex items-start gap-2">
          <PhoneCall size={16} className="mt-0.5" />
          Use this panel to monitor communication reliability before changing Tata/WhatsApp production credentials.
        </div>
      </div>
    </div>
  );
};

export default AdminCommunications;

