import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, UserCog } from 'lucide-react';
import api from '../../lib/api';
import TopHeader from './components/TopHeader';
import { EMPTY_STATE_FILTERED, formatAdminDateTime } from './utils/adminUi';

const AdminRolesManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [u, s] = await Promise.all([api.get('/admin/users?limit=100'), api.get('/admin/sessions')]);
      setUsers(u?.users || []);
      setSessions(s?.sessions || []);
    } catch (e) {
      setError(e?.message || 'Failed to load admin role data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const roleCounts = useMemo(() => {
    const c = { admin: 0, user: 0 };
    users.forEach((u) => {
      const r = String(u.role || 'user').toLowerCase();
      if (r === 'admin') c.admin += 1;
      else c.user += 1;
    });
    return c;
  }, [users]);

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (e) {
      setError(e?.message || 'Failed to update role');
    }
  };

  const updateStatus = async (userId, status) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await api.post(`/admin/sessions/${sessionId}/revoke`, {});
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      setError(e?.message || 'Failed to revoke session');
    }
  };

  const forceLogout = async (userId) => {
    try {
      await api.post(`/admin/force-logout/${userId}`, {});
      setSessions((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (e) {
      setError(e?.message || 'Failed to force logout');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <TopHeader title="Admin & Roles" subtitle="Role, permissions and active session governance" />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading roles and sessions…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopHeader title="Admin & Roles" subtitle="Role hierarchy, restrictions, and active sessions" />
      <div className="p-4 md:p-6 space-y-5">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Super/Admin Users</p>
            <p className="text-2xl font-bold text-blue-700">{roleCounts.admin}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Standard Users</p>
            <p className="text-2xl font-bold text-gray-800">{roleCounts.user}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Active Sessions</p>
            <p className="text-2xl font-bold text-emerald-700">{sessions.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Suspended/Banned</p>
            <p className="text-2xl font-bold text-amber-700">{users.filter((u) => ['suspended', 'banned'].includes(String(u.status || '').toLowerCase())).length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserCog size={16} className="text-blue-600" />
            Team Management
          </div>
          <div className="divide-y divide-gray-100">
            {users.slice(0, 120).map((u) => (
              <div key={u.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{u.full_name || u.email}</div>
                  <div className="text-xs text-gray-500 break-all">{u.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={u.role || 'user'}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <select
                    value={u.status || 'active'}
                    onChange={(e) => updateStatus(u.id, e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="banned">banned</option>
                  </select>
                  <button onClick={() => forceLogout(u.id)} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                    Force Logout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldCheck size={16} className="text-emerald-600" />
            Session Management
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.slice(0, 200).map((s) => (
              <div key={s.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{s.full_name || s.email}</div>
                  <div className="text-xs text-gray-500 break-words">
                    {s.email} • Created {formatAdminDateTime(s.created_at)} • Expires {formatAdminDateTime(s.expires_at)}
                  </div>
                </div>
                <button onClick={() => revokeSession(s.id)} className="px-2.5 py-1.5 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                  Revoke Session
                </button>
              </div>
            ))}
            {sessions.length === 0 && <div className="px-4 py-8 text-sm text-gray-500 text-center">{EMPTY_STATE_FILTERED}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRolesManagement;

