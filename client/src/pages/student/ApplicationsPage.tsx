import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { applicationApi } from '@/api';

interface RoundResult {
  roundName: string;
  roundSequence: number;
  status: 'pending' | 'advanced' | 'rejected' | 'skipped';
  updatedAt?: string;
  feedback?: string;
}

interface Application {
  _id: string;
  opportunity: {
    _id: string;
    companyName: string;
    title: string;
    type: string;
    workMode: string;
    applicationMode: 'internal' | 'external';
  };
  appliedAt: string;
  applicationMode: 'internal' | 'external';
  isExternalSelfReported?: boolean;
  personalStatus: 'submitted' | 'shortlisted' | 'in_progress' | 'selected' | 'rejected' | 'withdrawn';
  currentRoundName?: string;
  roundResults?: RoundResult[];
  notes?: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.getMyApplications();
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.applications || [];
      setApplications(list);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications.filter((app: any) => {
    if (!statusFilter) return true;
    return (app.personalStatus || app.status) === statusFilter;
  });

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
  };

  const getStatusBadge = (status: string, isCompetition: boolean = false) => {
    switch (status) {
      case 'selected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
            {isCompetition ? <Trophy className="w-3.5 h-3.5 text-amber-400" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isCompetition ? 'Winner / Finalist' : 'Selected (Final Offer)'}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-3.5 h-3.5" />
            {isCompetition ? 'Did Not Advance' : 'Not Eligible Further'}
          </span>
        );
      case 'shortlisted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            {isCompetition ? 'Qualified (Next Phase)' : 'Shortlisted (Next Round)'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isCompetition ? 'In Evaluation' : 'In Review'}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {isCompetition ? 'Registered' : 'Submitted'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Applications</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor real-time progress, round-wise transitions, and final selection outcomes.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === ''
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setStatusFilter('shortlisted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'shortlisted'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-purple-400 border border-slate-800'
            }`}
          >
            Shortlisted (Next Round)
          </button>
          <button
            onClick={() => setStatusFilter('selected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'selected'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-800'
            }`}
          >
            Selected (Final Offer)
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800'
            }`}
          >
            Not Eligible Further
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'submitted'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-800'
            }`}
          >
            Submitted
          </button>
        </div>
      </div>

      {/* Shortlisting & Status Explanation Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-purple-300">Shortlisted:</span>
            <p className="text-slate-400 mt-0.5">
              Eligible to attend the next recruitment stage of this drive.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-rose-300">Not Eligible Further:</span>
            <p className="text-slate-400 mt-0.5">
              Drive concluded for your application; not advancing further.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-300">Selected (Final Offer):</span>
            <p className="text-slate-400 mt-0.5">
              Secured final offer at the conclusion of the drive.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No applications found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You haven't submitted any applications under this filter. Explore open drives to apply.
          </p>
          <Link
            to="/opportunities"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
          >
            Browse Opportunities
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app._id}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg space-y-4"
            >
              {(() => {
                const isCompetition =
                  app.opportunity?.type === 'hackathon' ||
                  app.opportunity?.type === 'coding_competition';
                const st = (app as any).personalStatus || (app as any).status;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-base shrink-0 ${
                            isCompetition
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                              : 'bg-slate-800 border-slate-700 text-indigo-400'
                          }`}
                        >
                          {isCompetition ? (
                            <Trophy className="w-5 h-5 text-amber-400" />
                          ) : app.opportunity?.companyName ? (
                            app.opportunity.companyName.substring(0, 2).toUpperCase()
                          ) : (
                            'CO'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                              to={`/opportunities/${app.opportunity?._id}`}
                              className="font-bold text-white hover:text-indigo-400 transition-colors text-base"
                            >
                              {app.opportunity?.title}
                            </Link>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                                isCompetition
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {app.opportunity?.type?.replace('_', ' ')}
                            </span>
                            {app.isExternalSelfReported && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Self-Reported External
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-200 font-medium">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {isCompetition ? `Host: ${app.opportunity?.companyName}` : app.opportunity?.companyName}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {isCompetition ? 'Registered: ' : 'Applied: '}
                              {formatDateSafe(app.appliedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getStatusBadge(st, isCompetition)}
                        <Link
                          to={`/opportunities/${app.opportunity?._id}`}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Opportunity"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Status Meaning Banner */}
                    {st === 'selected' && (
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
                        {isCompetition ? (
                          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-emerald-200">
                            {isCompetition ? 'Winner / Finalist:' : 'Final Offer Secured (Selected):'}
                          </span>{' '}
                          <span>
                            {isCompetition
                              ? 'Congratulations! You have been declared a Winner / Finalist in this competition.'
                              : 'Congratulations! You have received a final offer at the conclusion of this drive.'}
                          </span>
                        </div>
                      </div>
                    )}
                    {st === 'shortlisted' && (
                      <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-300">
                        <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                          <span className="font-bold text-purple-200">
                            {isCompetition ? 'Advanced to Next Phase:' : 'Shortlisted for Next Round:'}
                          </span>{' '}
                          <span>
                            {isCompetition
                              ? 'You have cleared this stage and qualified to participate in the next evaluation phase.'
                              : 'You have cleared this round and are eligible to attend the next recruitment stage.'}
                          </span>
                        </div>
                      </div>
                    )}
                    {st === 'rejected' && (
                      <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                          <span className="font-bold text-rose-200">
                            {isCompetition ? 'Competition Journey Concluded:' : 'Not Eligible Further:'}
                          </span>{' '}
                          <span>
                            {isCompetition
                              ? 'You did not advance to the next phase of this competition.'
                              : 'Drive concluded for your application. You are not eligible to proceed to further rounds in this position.'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Round-wise progression timeline if recorded */}
              {app.roundResults && app.roundResults.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Round Progression
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    {app.roundResults.map((r, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{r.roundName}</p>
                          <span className="text-[10px] text-slate-500">Stage {r.roundSequence || i + 1}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'advanced'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : r.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-indigo-500/10 text-indigo-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
