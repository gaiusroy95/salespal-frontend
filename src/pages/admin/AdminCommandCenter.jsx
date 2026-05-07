import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Bot, CreditCard, Loader2, RadioTower, Users } from 'lucide-react';
import { ADMIN_CONTROL_ROOM_SECTIONS } from '../../config/admin/controlRoom.config';
import api from '../../lib/api';

const cardTone = {
  healthy: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  degraded: 'text-amber-700 bg-amber-50 border-amber-100',
};

const AdminCommandCenter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cc, setCc] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const out = await api.get('/admin/command-center');
        setCc(out?.commandCenter || null);
      } catch (e) {
        setError(e?.message || 'Failed to load command center');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const executiveCards = useMemo(() => {
    const healthLabel =
      String(cc?.liveOverview?.platformStatus || 'healthy').toLowerCase() === 'healthy' ? 'Healthy' : 'Degraded';
    return [
      {
        label: 'Live Overview',
        value: healthLabel,
        icon: Activity,
        tone: healthLabel === 'Healthy' ? cardTone.healthy : cardTone.degraded,
      },
      {
        label: 'Revenue Snapshot',
        value: `₹${Number(cc?.revenueSnapshot?.collected || 0).toLocaleString('en-IN')}`,
        icon: CreditCard,
        tone: 'text-blue-700 bg-blue-50 border-blue-100',
      },
      {
        label: 'Active Subscriptions',
        value: Number(cc?.activeSubscriptions || 0).toLocaleString(),
        icon: Users,
        tone: 'text-violet-700 bg-violet-50 border-violet-100',
      },
      {
        label: 'AI Performance',
        value: `${Number(cc?.aiPerformance?.aiHandled24h || 0).toLocaleString()} AI / 24h`,
        icon: Bot,
        tone: 'text-indigo-700 bg-indigo-50 border-indigo-100',
      },
      {
        label: 'Communication Health',
        value: `WA ${Number(cc?.communicationHealth?.whatsappSuccessRate ?? 100)}% · Call ${Number(
          cc?.communicationHealth?.callSuccessRate ?? 100
        )}%`,
        icon: RadioTower,
        tone: 'text-cyan-700 bg-cyan-50 border-cyan-100',
      },
      {
        label: 'Critical Alerts',
        value: Number(cc?.criticalAlerts || 0).toLocaleString(),
        icon: AlertTriangle,
        tone: 'text-amber-700 bg-amber-50 border-amber-100',
      },
    ];
  }, [cc]);

  if (loading) {
    return (
      <div className="p-5 md:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={22} className="animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading command center…</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
        <div className="text-xs uppercase tracking-wide font-semibold text-blue-600 mb-1">SalesPal Super Admin</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Command Center</h1>
        <p className="text-sm text-gray-600 mt-1.5 max-w-4xl">
          AI SaaS Control Room for Revenue, AI Governance, Communications, Enterprise Operations, Security, and Growth.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {executiveCards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 shadow-sm ${c.tone}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{c.label}</span>
              <c.icon size={18} />
            </div>
            <div className="mt-2.5 text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {Array.isArray(cc?.aiInsights) && cc.aiInsights.length ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
          <h3 className="text-sm font-semibold text-indigo-900">AI Insights</h3>
          <ul className="mt-2 space-y-1 text-sm text-indigo-800">
            {cc.aiInsights.map((i, idx) => (
              <li key={`${idx}-${i}`}>• {i}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Super Admin Blueprint</h2>
          <p className="text-sm text-gray-500 mt-1">Navigate all CEO + CTO dashboard pillars.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {ADMIN_CONTROL_ROOM_SECTIONS.map((section) => (
            <Link
              key={section.key}
              to={section.key === 'command-center' ? '/admin/dashboard' : `/admin/${section.key}`}
              className="block px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
                <span className="text-xs rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">
                  {section.subHeadings.length} items
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCommandCenter;

