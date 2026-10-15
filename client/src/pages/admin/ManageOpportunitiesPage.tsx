import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Building,
  Calendar,
  Layers,
  CheckCircle,
  Eye,
  Edit,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opportunityApi } from '@/api';

interface Opportunity {
  _id: string;
  companyName: string;
  title: string;
  type: string;
  workMode: string;
  location: string;
  status: 'draft' | 'published' | 'closed' | 'completed';
  applicationMode: 'internal' | 'external';
  deadline: string;
  minCgpa: number;
  maxBacklogs: number;
  eligibleBranches: string[];
  rounds?: any[];
  applicantCount?: number;
}

export default function ManageOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await opportunityApi.list(params);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.opportunities || [];
      setOpportunities(list);
    } catch (err) {
      console.error('Failed to fetch admin opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await opportunityApi.update(id, { status: newStatus });
      toast.success(`Opportunity status updated to ${newStatus}`);
      fetchOpportunities();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Status transition failed';
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Published
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Draft
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Closed
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Manage Opportunities</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure recruitment drives, set eligibility filters, oversee candidate rounds, and publish outcomes.
          </p>
        </div>

        <Link
          to="/admin/opportunities/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New Opportunity
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No opportunities created yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by posting an internship or full-time placement drive.
          </p>
          <Link
            to="/admin/opportunities/new"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Create First Opportunity
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp._id}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{opp.title}</h3>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase">
                    {opp.type}
                  </span>
                  {getStatusBadge(opp.status)}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-200 font-medium">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {opp.companyName}
                  </span>
                  <span>{opp.location} ({opp.workMode})</span>
                  <span>Min CGPA: {opp.minCgpa || 'None'}</span>
                  <span>Max Backlogs: {opp.maxBacklogs ?? 0}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Deadline: {new Date(opp.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* State Transition Actions */}
                {opp.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(opp._id, 'published')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
                  >
                    Publish
                  </button>
                )}
                {opp.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange(opp._id, 'closed')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                  >
                    Close Applications
                  </button>
                )}
                {opp.status === 'closed' && (
                  <button
                    onClick={() => handleStatusChange(opp._id, 'completed')}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
                  >
                    Mark Completed
                  </button>
                )}

                <Link
                  to={`/admin/opportunities/${opp._id}/rounds`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Rounds & Applicants
                </Link>

                <Link
                  to={`/admin/opportunities/${opp._id}/edit`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Edit Opportunity"
                >
                  <Edit className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
