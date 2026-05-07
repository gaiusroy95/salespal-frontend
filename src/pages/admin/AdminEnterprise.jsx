import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import AdminFilterExportBar from './components/AdminFilterExportBar';
import { EMPTY_STATE_FILTERED, formatAdminDateTime } from './utils/adminUi';

const AdminEnterprise = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const out = await api.get('/admin/enterprise');
        setData(out?.enterprise || null);
      } catch (e) {
        setError(e?.message || 'Failed to load enterprise overview');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredRequests = useMemo(() => {
    const rows = data?.requests || [];
    if (!fromDate && !toDate) return rows;
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return rows.filter((r) => {
      const ts = r.created_at ? new Date(r.created_at).getTime() : null;
      if (!ts) return false;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [data?.requests, fromDate, toDate]);

  const downloadCsv = () => {
    const header = 'lead,company,stage,source,created_at';
    const lines = filteredRequests.map((r) =>
      [
        `${r.contact_first_name || ''} ${r.contact_last_name || ''}`.trim() || 'Unknown',
        r.company_name || '',
        r.stage || '',
        r.source || '',
        r.created_at || '',
      ]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enterprise-requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <TopHeader title="Enterprise" subtitle="Enterprise requests, alerts, and billing relationships" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Loading enterprise data…</span>
          </div>
        ) : (
          <>
            <AdminFilterExportBar label="Date Range" exportLabel="Export Requests CSV" onExport={downloadCsv}>
              <span className="text-xs uppercase tracking-wide font-semibold text-gray-500">From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <span className="text-xs uppercase tracking-wide font-semibold text-gray-500 ml-1">To</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </AdminFilterExportBar>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Enterprise Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredRequests.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Enterprise Alerts</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{(data?.alerts || []).length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Enterprise Billing Records</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{(data?.billing || []).length}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Latest Enterprise Requests
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Lead</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.slice(0, 20).map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-gray-900">{`${r.contact_first_name || ''} ${r.contact_last_name || ''}`.trim() || 'Unknown'}</td>
                        <td className="px-4 py-3 text-gray-700">{r.company_name || '—'}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{r.stage || 'new'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatAdminDateTime(r.created_at)}</td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
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

export default AdminEnterprise;

