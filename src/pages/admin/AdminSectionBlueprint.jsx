import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ADMIN_SECTION_MAP } from '../../config/admin/controlRoom.config';

const AdminSectionBlueprint = ({ sectionKey }) => {
  const section = ADMIN_SECTION_MAP[sectionKey];
  if (!section) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          Unknown admin section.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold text-blue-600 mb-1">SalesPal Super Admin</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{section.title}</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">{section.description}</p>
        </div>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back to Command Center
        </Link>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
        CTO Blueprint Mode: section scaffolding is live with production route wiring. Each block below is implementation-ready.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {section.subHeadings.map(([name, purpose]) => (
          <div key={name} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600 mt-1">{purpose}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSectionBlueprint;

