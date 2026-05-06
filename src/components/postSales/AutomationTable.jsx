import React from 'react';
import AutomationRow from './AutomationRow';
import { usePostSales } from '../../context/PostSalesContext';

const AutomationTable = ({ automations, onUpdateStatus, onDelete }) => {
    const { getCustomer } = usePostSales();

    const resolveCustomerName = (automation) => {
        if (automation.customerId === 'all') return 'All Customers';
        const customer = getCustomer(automation.customerId);
        return customer?.name || `Customer ${String(automation.customerId || '').slice(0, 4)}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Existing Automations</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{automations.length} total active rules</p>
                </div>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
                {automations.length === 0 ? (
                    <div className="px-6 py-10 text-center text-gray-400 text-sm">
                        No automations configured yet. Create one above to get started.
                    </div>
                ) : (
                    automations.map((auto) => {
                        const customerName = resolveCustomerName(auto);
                        return (
                            <div key={auto.id} className="px-4 py-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 break-words">{customerName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{auto.channel} • {auto.trigger}</p>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${auto.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>
                                        {auto.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 break-words">
                                    {auto.action}
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateStatus(auto.id, auto.status === 'Active' ? 'Paused' : 'Active')}
                                        className="min-h-11 px-3 py-2 rounded-md border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                                    >
                                        {auto.status === 'Active' ? 'Pause' : 'Resume'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(auto.id)}
                                        className="min-h-11 px-3 py-2 rounded-md border border-red-200 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Channel</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Trigger</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Action</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden xl:table-cell">Created</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {automations.map((auto, index) => (
                            <AutomationRow
                                key={auto.id}
                                automation={auto}
                                index={index}
                                onUpdateStatus={onUpdateStatus}
                                onDelete={onDelete}
                            />
                        ))}
                        {automations.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No automations configured yet. Create one above to get started.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AutomationTable;
