import React from 'react';
import { Download } from 'lucide-react';

const AdminFilterExportBar = ({ label, children, exportLabel, onExport, exportDisabled = false }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 flex-wrap min-h-9">
        {label ? <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label> : null}
        {children}
      </div>
      <button
        onClick={onExport}
        disabled={exportDisabled}
        className="inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
      >
        <Download size={15} />
        {exportLabel}
      </button>
    </div>
  );
};

export default AdminFilterExportBar;

