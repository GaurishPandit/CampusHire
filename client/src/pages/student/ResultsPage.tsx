import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Building,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { resultApi } from '@/api';

interface PublishedResult {
  _id: string;
  candidateName: string;
  branch: string;
  graduationYear?: number;
  opportunityTitle: string;
  companyName: string;
  publishedAt: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<PublishedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    fetchResults();
  }, [search, branchFilter]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (branchFilter) params.branch = branchFilter;

      const res = await resultApi.getPublishedResults(params);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.results || [];
      setResults(list);
    } catch (err) {
      console.error('Failed to load published selection results:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Officially Published Records</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Placement Results</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Verified final selection results officially announced by the college placement cell.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-400" />
          <div>
            <span className="text-xs text-slate-400">Total Selections</span>
            <p className="text-lg font-black text-white">{results.length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by candidate name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <input
          type="text"
          placeholder="Filter by branch (e.g. CSE)"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="sm:w-48 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Results Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800/50" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No published results available</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Selection results are published here once companies finalize recruitment drives and the placement cell verifies them.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3.5 px-6">Selected Candidate</th>
                  <th className="py-3.5 px-6">Branch</th>
                  <th className="py-3.5 px-6">Company</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Published Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {results.map((r: any) => {
                  const candidateName = r.candidateName || r.publicSnapshot?.studentName || r.studentName || 'Candidate';
                  const branch = r.branch || r.publicSnapshot?.branch || '—';
                  const companyName = r.companyName || r.publicSnapshot?.companyName || '—';
                  const role = r.opportunityTitle || r.publicSnapshot?.opportunityTitle || 'Position';
                  const publishedDate = r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : '—';
                  return (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400">
                            {candidateName.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-bold text-white">{candidateName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-semibold text-slate-300">
                          {branch}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-500" />
                          <span>{companyName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-indigo-300 font-medium">{role}</td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {publishedDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
