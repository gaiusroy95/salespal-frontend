import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import TopHeader from './components/TopHeader';
import AdminTable from './components/AdminTable';
import Badge from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import api from '../../lib/api';
import { EMPTY_STATE_FILTERED, formatAdminDateTime } from './utils/adminUi';

const statusColors = { active: 'success', inactive: 'default', paused: 'warning' };
const statusFilters = ['All', 'active', 'inactive', 'paused'];
const moduleFilters = ['All', 'marketing', 'sales', 'postSale', 'support', 'salespal360'];
const operationalTabs = [
    { key: 'all', label: 'All Subscriptions' },
    { key: 'active', label: 'Active Plans' },
    { key: 'trials', label: 'Trials' },
    { key: 'expiring', label: 'Expiring Soon' },
    { key: 'paused', label: 'Paused Accounts' },
    { key: 'blocked', label: 'Blocked Accounts' },
];

const pickDate = (row: any): Date | null => {
    const keys = ['expires_at', 'renews_at', 'next_billing_at', 'trial_ends_at', 'deactivated_at', 'updated_at'];
    for (const k of keys) {
        if (row?.[k]) {
            const d = new Date(row[k]);
            if (!Number.isNaN(d.getTime())) return d;
        }
    }
    return null;
};

const isTrial = (row: any) => {
    const status = String(row?.status || '').toLowerCase();
    if (status.includes('trial')) return true;
    return Boolean(row?.trial_ends_at && row?.status === 'active');
};

const isExpiringSoon = (row: any) => {
    const d = pickDate(row);
    if (!d) return false;
    const diff = d.getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
};

const AdminSubscriptions = () => {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [tab, setTab] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const data = await api.get('/admin/subscriptions');
            setSubscriptions(data.subscriptions || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (row: any) => {
        const newStatus = row.status === 'active' ? 'inactive' : 'active';
        const label = newStatus === 'active' ? 'Activate' : 'Deactivate';
        if (!window.confirm(`${label} subscription for ${row.organization_name || row.user_email}?`)) return;
        try {
            await api.patch(`/admin/subscriptions/${row.id}`, { status: newStatus });
            setSubscriptions(prev => prev.map(s => s.id === row.id ? { ...s, status: newStatus } : s));
        } catch (err: any) {
            alert(err.message || 'Failed to update subscription');
        }
    };

    const filtered = subscriptions.filter((s) => {
        const matchSearch =
            (s.organization_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.module || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        const matchModule = moduleFilter === 'All' || s.module === moduleFilter;
        const normalizedStatus = String(s?.status || '').toLowerCase();
        const matchTab =
            tab === 'all' ||
            (tab === 'active' && normalizedStatus === 'active' && !isTrial(s)) ||
            (tab === 'trials' && isTrial(s)) ||
            (tab === 'expiring' && isExpiringSoon(s)) ||
            (tab === 'paused' && normalizedStatus === 'paused') ||
            (tab === 'blocked' && ['inactive', 'suspended', 'banned'].includes(normalizedStatus));
        return matchSearch && matchStatus && matchModule && matchTab;
    });

    const columns = [
        {
            key: 'organization_name',
            label: 'Organization',
            render: (v: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(v || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{v || '—'}</span>
                </div>
            ),
        },
        { key: 'user_email', label: 'User', render: (v: any) => <span className="text-gray-500">{v || '—'}</span> },
        {
            key: 'module',
            label: 'Module',
            render: (v: any) => <Badge variant="primary" className="capitalize">{v || '—'}</Badge>,
        },
        {
            key: 'status',
            label: 'Status',
            render: (v: any) => (
                <Badge variant={(statusColors as any)[v] || 'default'} className="capitalize">
                    {v || 'inactive'}
                </Badge>
            ),
        },
        {
            key: 'activated_at',
            label: 'Activated',
            render: (v: any) => <span className="text-gray-500">{formatAdminDateTime(v)}</span>,
        },
        {
            key: 'created_at',
            label: 'Created',
            render: (v: any) => <span className="text-gray-500">{formatAdminDateTime(v)}</span>,
        },
    ];

    const statCards = [
        { label: 'Total Subscriptions', value: subscriptions.length.toString(),                                           color: 'text-blue-600'    },
        { label: 'Active',              value: subscriptions.filter((s) => s.status === 'active').length.toString(),       color: 'text-emerald-600' },
        { label: 'Trials',              value: subscriptions.filter((s) => isTrial(s)).length.toString(),                  color: 'text-violet-600'  },
        { label: 'Expiring Soon',       value: subscriptions.filter((s) => isExpiringSoon(s)).length.toString(),           color: 'text-amber-600'   },
    ];

    if (loading) {
        return (
            <div className="flex flex-col">
                <TopHeader title="Subscriptions" subtitle="Manage all active subscriptions" />
                <div className="flex items-center justify-center py-32">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-500">Loading subscriptions…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col">
                <TopHeader title="Subscriptions" subtitle="Manage all active subscriptions" />
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-700 font-medium">{error}</p>
                        <button onClick={fetchSubscriptions} className="mt-3 text-sm text-red-600 underline">Retry</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <TopHeader title="Subscriptions" subtitle="Manage all active subscriptions" />

            <div className="p-4 md:p-6 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((s) => (
                        <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">
                            All Subscriptions
                            <span className="ml-2 text-xs font-normal text-gray-400">({filtered.length})</span>
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-auto">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search subscriptions…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-full sm:w-56"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-600 w-full sm:w-auto"
                            >
                                {statusFilters.map((f) => (
                                    <option key={f} value={f}>
                                        {f === 'All' ? 'All Statuses' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={moduleFilter}
                                onChange={(e) => setModuleFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-600 w-full sm:w-auto"
                            >
                                {moduleFilters.map((f) => (
                                    <option key={f} value={f}>
                                        {f === 'All' ? 'All Modules' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="px-4 md:px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
                        {operationalTabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                    tab === t.key
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <AdminTable
                        columns={columns}
                        data={filtered}
                        actions={[
                            { label: 'View', variant: 'primary', onClick: (row: any) => navigate(`/admin/subscriptions/${row.id}`) },
                            {
                                label: (row: any) => row.status === 'active' ? 'Deactivate' : 'Activate',
                                variant: (row: any) => row.status === 'active' ? 'danger' : 'primary',
                                onClick: handleToggleStatus,
                            },
                        ] as any}
                        onRowClick={(row: any) => navigate(`/admin/subscriptions/${row.id}`)}
                        emptyMessage={EMPTY_STATE_FILTERED}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminSubscriptions;
