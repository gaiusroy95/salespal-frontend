import React, { useState } from 'react';
import TopHeader from './components/TopHeader';
import ModulePricing from './components/settings/ModulePricing';
import BillingControl from './components/settings/BillingControl';

const tabs = [
  { key: 'plans', label: 'All Plans & Limits' },
  { key: 'billing', label: 'Billing History & Actions' },
];

const AdminPlansPricing = () => {
  const [tab, setTab] = useState('plans');
  return (
    <div className="flex flex-col">
      <TopHeader title="Plans & Pricing" subtitle="Commercial controls, pricing governance, and billing actions" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 ${
                  tab === t.key ? 'border-blue-600 text-blue-700 bg-blue-50/60' : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'plans' ? <ModulePricing /> : <BillingControl />}
      </div>
    </div>
  );
};

export default AdminPlansPricing;

