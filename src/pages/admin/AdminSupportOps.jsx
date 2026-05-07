import React, { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import AdminFilterExportBar from './components/AdminFilterExportBar';
import { EMPTY_STATE_FILTERED } from './utils/adminUi';

const AdminSupportOps = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const out = await api.get('/admin/support-ops');
        setData(out?.supportOps || null);
      } catch (e) {
        setError(e?.message || 'Failed to load support operations');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredTickets = useMemo(() => {
    const rows = data?.recent || [];
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => String(r.status || '').toLowerCase() === statusFilter);
  }, [data?.recent, statusFilter]);

  const downloadCsv = () => {
    const header = 'subject,category,priority,status,created_at,updated_at';
    const lines = filteredTickets.map((t) =>
      [t.subject || '', t.category || '', t.priority || '', t.status || '', t.created_at || '', t.updated_at || '']
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'support-ops-tickets.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <TopHeader title="Support Ops" subtitle="Ticket queues, SLA tracking, and AI resolution performance" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Loading support operations…</span>
          </div>
        ) : (
          <>
            <AdminFilterExportBar label="Status" exportLabel="Export Tickets CSV" onExport={downloadCsv}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="all">all</option>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="closed">closed</option>
              </select>
            </AdminFilterExportBar>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{data?.totals?.total || 0}</p></div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Open</p><p className="text-2xl font-bold text-blue-700">{data?.totals?.open || 0}</p></div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Critical</p><p className="text-2xl font-bold text-red-700">{data?.totals?.critical || 0}</p></div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">AI Resolution</p><p className="text-2xl font-bold text-emerald-700">{data?.aiResolutionRate || 0}%</p></div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Avg SLA (hrs)</p><p className="text-2xl font-bold text-indigo-700">{data?.slaHoursAvg || 0}</p></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900 flex items-center gap-2">
                <LifeBuoy size={16} className="text-violet-600" />
                Recent Tickets
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Subject</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Priority</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTickets.slice(0, 30).map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-gray-900">{t.subject || 'Untitled ticket'}</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{t.category || 'general'}</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{t.priority || 'normal'}</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{t.status || 'open'}</td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-gray-500">{EMPTY_STATE_FILTERED}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSupportOps;

