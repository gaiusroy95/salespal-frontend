import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import AdminFilterExportBar from './components/AdminFilterExportBar';
import { EMPTY_STATE_FILTERED } from './utils/adminUi';

const AdminBusinessSources = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const out = await api.get('/admin/business-sources');
        setData(out?.businessSources || null);
      } catch (e) {
        setError(e?.message || 'Failed to load business sources');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const sourceRows = data?.sourceAnalytics || [];
  const sourceOptions = useMemo(
    () => ['all', ...new Set(sourceRows.map((r) => String(r.source || 'unknown').toLowerCase()))],
    [sourceRows]
  );
  const filteredRows = useMemo(() => {
    if (selectedSource === 'all') return sourceRows;
    return sourceRows.filter((r) => String(r.source || 'unknown').toLowerCase() === selectedSource);
  }, [selectedSource, sourceRows]);

  const downloadCsv = () => {
    const header = 'source,leads,converted,lost';
    const lines = filteredRows.map((r) =>
      [r.source || 'unknown', Number(r.leads || 0), Number(r.converted || 0), Number(r.lost || 0)]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-sources.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <TopHeader title="Business Sources" subtitle="Source analytics, partner ranking, and growth channels" />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading source analytics…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopHeader title="Business Sources" subtitle="Lead source intelligence and partner contribution tracking" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <AdminFilterExportBar label="Source Filter" exportLabel="Export CSV" onExport={downloadCsv}>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </AdminFilterExportBar>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Briefcase size={16} className="text-indigo-600" />
            Source Analytics
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Source</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Converted</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((r, idx) => (
                  <tr key={`${r.source}-${idx}`}>
                    <td className="px-4 py-3 text-gray-900 capitalize">{r.source || 'unknown'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{Number(r.leads || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{Number(r.converted || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-semibold">{Number(r.lost || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">{EMPTY_STATE_FILTERED}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessSources;

