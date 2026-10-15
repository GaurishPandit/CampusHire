import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Search,
  Calendar,
  User,
  Filter,
} from 'lucide-react';
import { dashboardApi } from '@/api';

interface AuditLogItem {
  _id: string;
  action: string;
  performedBy?: {
    _id: string;
    email: string;
    role: string;
  };
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getAuditLogs();
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.logs || [];
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.entityType?.toLowerCase().includes(term) ||
      log.performedBy?.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Compliance & Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Administrative Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Immutable system activity trail recording sensitive operations, result publications, and imports.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by action, administrator email, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No audit records found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Recorded events will appear here when administrative actions take place.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Audit Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-white">{log.entityType}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      {log.performedBy?.email || 'System'}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-400 text-[11px]">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
