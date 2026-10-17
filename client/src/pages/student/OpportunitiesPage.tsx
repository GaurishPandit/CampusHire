import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Briefcase,
  Building,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
  ExternalLink,
  IndianRupee,
  Trophy,
  Award,
} from 'lucide-react';
import { opportunityApi } from '@/api';

interface Opportunity {
  _id: string;
  companyName: string;
  title: string;
  type: string;
  workMode: string;
  location: string;
  ctcOrStipend?: string;
  applicationMode: 'internal' | 'external';
  deadline: string;
  minCgpa: number;
  maxBacklogs: number;
  eligibleBranches: string[];
  eligibleGraduationYears: number[];
  eligibility?: {
    status: 'eligible' | 'not_eligible' | 'needs_verification';
    reason: string;
    details?: string[];
  };
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [applicationModeFilter, setApplicationModeFilter] = useState('');

  useEffect(() => {
    fetchOpportunities();
  }, [typeFilter, workModeFilter, applicationModeFilter]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = { status: 'published' };
      if (typeFilter) params.type = typeFilter;
      if (workModeFilter) params.workMode = workModeFilter;
      if (applicationModeFilter) params.applicationMode = applicationModeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await opportunityApi.list(params);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.opportunities || [];
      setOpportunities(list);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const isClosingSoon = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr).getTime();
    const now = Date.now();
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 72;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Opportunities</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Discover active campus placement drives, internships, hackathons, and coding competitions tailored to your academic background.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by company name, job role, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="full_time">Full-time Placement</option>
            <option value="placement">Full-time Placement (Legacy)</option>
            <option value="internship">Internship</option>
            <option value="hackathon">Hackathon</option>
            <option value="coding_competition">Coding Competition</option>
          </select>

          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Work Modes</option>
            <option value="on-site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>

          <select
            value={applicationModeFilter}
            onChange={(e) => setApplicationModeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Application Modes</option>
            <option value="internal">Campus Internal</option>
            <option value="external">Company External</option>
          </select>

          {(typeFilter || workModeFilter || applicationModeFilter || search) && (
            <button
              onClick={() => {
                setTypeFilter('');
                setWorkModeFilter('');
                setApplicationModeFilter('');
                setSearch('');
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Opportunity Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800/50" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No opportunities match your criteria</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search terms or filters to discover other available campus recruitment positions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const closingSoon = isClosingSoon(opp.deadline);
            return (
              <div
                key={opp._id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg hover:shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center font-bold text-lg text-indigo-400 shrink-0 shadow-inner">
                    {opp.companyName ? opp.companyName.substring(0, 2).toUpperCase() : 'CO'}
                  </div>

                  {(() => {
                    const isCompetition = opp.type === 'hackathon' || opp.type === 'coding_competition';
                    const dl = opp.deadline || (opp as any).applicationDeadline;
                    const deadlineStr = dl && !isNaN(new Date(dl).getTime())
                      ? new Date(dl).toLocaleDateString()
                      : 'Open / Rolling';

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {opp.title}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              opp.type === 'hackathon'
                                ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                                : opp.type === 'coding_competition'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}
                          >
                            {opp.type === 'hackathon'
                              ? '⚡ Hackathon'
                              : opp.type === 'coding_competition'
                              ? '🏆 Competition'
                              : opp.type}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {isCompetition
                              ? opp.applicationMode === 'internal'
                                ? 'Campus Registration'
                                : 'External Event Link'
                              : opp.applicationMode === 'internal'
                              ? 'Internal Application'
                              : 'External Link'}
                          </span>
                          {closingSoon && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Closing Soon
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-200 font-medium">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {isCompetition ? `Host: ${opp.companyName}` : opp.companyName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {isCompetition
                              ? opp.workMode === 'on_site' || opp.workMode === 'on-site'
                                ? 'In-Person Event'
                                : opp.workMode === 'remote'
                                ? 'Online / Virtual'
                                : 'Hybrid'
                              : `${opp.location || 'Campus'} (${opp.workMode})`}
                          </span>
                          {opp.ctcOrStipend && (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              {isCompetition ? (
                                <>
                                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                  Prize: {opp.ctcOrStipend.replace(/^[₹$]\s*/, '₹')}
                                </>
                              ) : (
                                <>
                                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">{opp.ctcOrStipend.replace(/^[₹$]\s*/, '')}</span>
                                </>
                              )}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {isCompetition ? 'Reg. Deadline:' : 'Deadline:'} {deadlineStr}
                          </span>
                        </div>

                        {/* Eligibility Snapshot Preview */}
                        <div className="pt-2 flex items-center gap-2 text-xs flex-wrap">
                          {isCompetition ? (
                            <span className="text-slate-300 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-violet-400" />
                              Participation: Open Event • Cash Prizes & Certificates • Team / Solo
                            </span>
                          ) : (
                            <>
                              <span className="text-slate-500">Eligibility Criteria:</span>
                              <span className="text-slate-300">Min CGPA: {opp.minCgpa || 'None'}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300">Max Backlogs: {opp.maxBacklogs ?? 0}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300">
                                Branches: {opp.eligibleBranches?.length ? opp.eligibleBranches.join(', ') : 'All'}
                              </span>
                            </>
                          )}
                        </div>

                        {opp.eligibility && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-slate-950">
                            {opp.eligibility.status === 'eligible' && (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300 font-semibold">
                                  {isCompetition ? 'Eligible to Register' : 'You are eligible'}
                                </span>
                              </>
                            )}
                            {opp.eligibility.status === 'not_eligible' && (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-rose-300 font-semibold">Not eligible:</span>
                                <span className="text-rose-400/80">{opp.eligibility.reason}</span>
                              </>
                            )}
                            {opp.eligibility.status === 'needs_verification' && (
                              <>
                                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-amber-300 font-semibold">Needs verification:</span>
                                <span className="text-amber-400/80">{opp.eligibility.reason}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex md:flex-col items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <Link
                    to={`/opportunities/${opp._id}`}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>
                      {opp.type === 'hackathon' || opp.type === 'coding_competition'
                        ? 'View & Register'
                        : 'View Details'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
