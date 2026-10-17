import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building,
  MapPin,
  Calendar,
  Briefcase,
  IndianRupee,
  Clock,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  ArrowLeft,
  Share2,
  Users,
  CheckCircle2,
  CircleDot,
  FileCheck,
  Award,
  Sparkles,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opportunityApi, applicationApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

interface Round {
  _id: string;
  name: string;
  sequence: number;
  type: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduledDate?: string;
  notes?: string;
  completionDate?: string;
}

interface OpportunityDetail {
  _id: string;
  companyName: string;
  title: string;
  description: string;
  type: string;
  workMode: string;
  location: string;
  ctcOrStipend?: string;
  applicationMode: 'internal' | 'external';
  externalUrl?: string;
  deadline: string;
  status: string;
  minCgpa: number;
  maxBacklogs: number;
  eligibleBranches: string[];
  eligibleGraduationYears: number[];
  rounds?: Round[];
  createdAt: string;
  resultsPublished?: boolean;
  resultsPublishedAt?: string;
  selectedCount?: number;
  results?: Array<{
    _id: string;
    candidateName: string;
    branch: string;
    graduationYear?: number;
    rollNumber?: string;
    offeredCtc?: string;
    publishedAt?: string;
  }>;
}

interface EligibilityResult {
  status: 'eligible' | 'not_eligible' | 'needs_verification';
  reason: string;
  details?: string[];
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [existingApplication, setExistingApplication] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [externalConfirmed, setExternalConfirmed] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppRes, eligRes, appsRes] = await Promise.allSettled([
        opportunityApi.getById(id!),
        opportunityApi.checkEligibility(id!),
        applicationApi.getMyApplications(),
      ]);

      if (oppRes.status === 'fulfilled' && oppRes.value.data?.data) {
        const raw = oppRes.value.data.data;
        const oppData = raw.opportunity || raw;
        setOpportunity({
          ...oppData,
          title: oppData.title || '',
          companyName: oppData.companyName || '',
          description: oppData.description || '',
          type: oppData.type || oppData.opportunityType || 'full_time',
          workMode: oppData.workMode || 'on_site',
          location: oppData.location || '',
          ctcOrStipend: oppData.ctcOrStipend || '',
          applicationMode: oppData.applicationMode || 'internal',
          externalUrl: oppData.externalUrl || oppData.externalApplicationUrl || '',
          deadline: oppData.deadline || oppData.applicationDeadline || '',
          minCgpa: oppData.minCgpa ?? oppData.eligibilityCriteria?.minCgpa ?? 0,
          maxBacklogs: oppData.maxBacklogs ?? oppData.eligibilityCriteria?.maxActiveBacklogs ?? 0,
          eligibleBranches: oppData.eligibleBranches || oppData.eligibilityCriteria?.eligibleBranches || [],
          eligibleGraduationYears: oppData.eligibleGraduationYears || oppData.eligibilityCriteria?.eligibleGraduationYears || [],
          rounds: oppData.rounds || raw.rounds || [],
          resultsPublished: oppData.resultsPublished ?? raw.resultsPublished ?? false,
          resultsPublishedAt: oppData.resultsPublishedAt ?? raw.resultsPublishedAt,
          selectedCount: oppData.selectedCount ?? raw.selectedCount ?? 0,
          results: oppData.results || raw.results || [],
        });
        if (raw.eligibility) {
          const rawE = raw.eligibility.eligibility || raw.eligibility;
          setEligibility(normalizeEligibility(rawE));
        }

        const isComp = oppData.type === 'hackathon' || oppData.type === 'coding_competition' ||
                       oppData.opportunityType === 'hackathon' || oppData.opportunityType === 'coding_competition';
        if (isComp) {
          setEligibility((prev) => {
            if (!prev || prev.status !== 'not_eligible') {
              return {
                status: 'eligible',
                reason: 'Open participation event! All registered students are eligible to participate.',
                details: ['Open participation event! All registered students are eligible to participate.'],
              };
            }
            return prev;
          });
        }
      }

      if (eligRes.status === 'fulfilled' && eligRes.value.data?.data) {
        const rawE = eligRes.value.data.data.eligibility || eligRes.value.data.data;
        setEligibility(normalizeEligibility(rawE));
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data?.data) {
        const apps = Array.isArray(appsRes.value.data.data)
          ? appsRes.value.data.data
          : appsRes.value.data.data.applications || [];
        const found = apps.find(
          (a: any) =>
            (typeof a.opportunity === 'object' ? a.opportunity?._id : a.opportunity) === id
        );
        if (found) {
          setExistingApplication(found);
          if (found.externalApplicationConfirmed || found.applicationType === 'external' || found.applicationMode === 'external') {
            setExternalConfirmed(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading opportunity detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeEligibility = (raw: any): EligibilityResult => {
    if (!raw) return { status: 'eligible', reason: 'Eligible to participate.' };
    const status = raw.status || (raw.isEligible ? 'eligible' : 'not_eligible');
    const reason = raw.reason || (Array.isArray(raw.reasons) && raw.reasons.length > 0 ? raw.reasons[0] : '') || '';
    const details = raw.details || (Array.isArray(raw.reasons) ? raw.reasons : []);
    return { status, reason, details };
  };

  const handleInternalApply = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await applicationApi.applyInternal(id);
      toast.success(
        isCompetition
          ? isHackathon
            ? 'Registered for Hackathon successfully!'
            : 'Registered for Competition successfully!'
          : 'Application submitted successfully!'
      );
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || (isCompetition ? 'Failed to register for competition' : 'Failed to submit application');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExternalApplyConfirm = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await applicationApi.applyExternal(id, { confirmed: true });
      toast.success(isCompetition ? 'Competition registration recorded!' : 'External application confirmation recorded!');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || (isCompetition ? 'Failed to record registration' : 'Failed to record external application');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-2xl bg-slate-900" />
        <div className="h-64 rounded-2xl bg-slate-900" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Opportunity not found</h3>
        <p className="text-xs text-slate-400 mt-1">This opportunity may have been removed or unpublished.</p>
        <Link
          to="/opportunities"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Opportunities
        </Link>
      </div>
    );
  }

  const isCompetition = opportunity.type === 'hackathon' || opportunity.type === 'coding_competition';
  const isHackathon = opportunity.type === 'hackathon';

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return 'Open / Rolling';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Open / Rolling' : d.toLocaleString();
  };

  const isDeadlinePassed = opportunity.deadline
    ? !isNaN(new Date(opportunity.deadline).getTime()) && new Date(opportunity.deadline).getTime() < Date.now()
    : false;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top back navigation */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-black text-2xl shrink-0 shadow-lg ${
                isCompetition
                  ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-500/30 text-amber-400'
                  : 'bg-gradient-to-br from-indigo-900/60 to-slate-800 border-indigo-500/30 text-indigo-300'
              }`}
            >
              {isCompetition ? (
                <Trophy className="w-8 h-8 text-amber-400" />
              ) : (
                (opportunity.companyName || 'CO').substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-white">{opportunity.title}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isCompetition
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                  }`}
                >
                  {isCompetition && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                  {isHackathon
                    ? 'Hackathon'
                    : opportunity.type === 'coding_competition'
                    ? 'Coding Competition'
                    : opportunity.type.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {opportunity.applicationMode === 'internal'
                    ? isCompetition
                      ? 'Direct Registration'
                      : 'Internal Application'
                    : 'External Portal'}
                </span>
              </div>

              <div className="flex items-center gap-5 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Building className="w-4 h-4 text-slate-400" />
                  {isCompetition ? `Host: ${opportunity.companyName}` : opportunity.companyName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {opportunity.location || (isCompetition ? 'Online' : 'On-Campus')} (
                  {isCompetition
                    ? opportunity.workMode === 'on_site'
                      ? 'In-Person / On-Site'
                      : 'Virtual / Online'
                    : opportunity.workMode}
                  )
                </span>
                {opportunity.ctcOrStipend && (
                  <span
                    className={`flex items-center gap-1.5 font-bold ${
                      isCompetition ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {isCompetition ? (
                      <Trophy className="w-4 h-4 text-amber-400" />
                    ) : (
                      <IndianRupee className="w-4 h-4" />
                    )}
                    {isCompetition ? `Prize Pool: ${opportunity.ctcOrStipend}` : opportunity.ctcOrStipend}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {isCompetition ? 'Registration Deadline: ' : 'Deadline: '}
                  {formatDeadline(opportunity.deadline)}
                </span>
              </div>
            </div>
          </div>

          {/* Existing Application / Registration Badge if user already participated */}
          {existingApplication && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shrink-0 max-w-xs space-y-1.5 shadow-lg">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isCompetition ? 'Your Registration Status' : 'Your Application Status'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const st = existingApplication.personalStatus || existingApplication.status;
                  if (st === 'selected') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isCompetition ? 'Winner / Finalist' : 'Selected (Final Offer)'}
                      </span>
                    );
                  }
                  if (st === 'shortlisted') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isCompetition ? 'Advanced (Next Phase)' : 'Shortlisted (Next Round)'}
                      </span>
                    );
                  }
                  if (st === 'rejected') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {isCompetition ? 'Did Not Advance' : 'Not Eligible Further'}
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                      {st === 'submitted' ? (isCompetition ? 'Registered' : 'Submitted') : st}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-slate-400">
                {existingApplication.personalStatus === 'shortlisted'
                  ? isCompetition
                    ? 'Qualified to participate in the next phase of this competition.'
                    : 'Eligible to attend the next round of this drive.'
                  : existingApplication.personalStatus === 'selected'
                  ? isCompetition
                    ? 'Congratulations! Crowned winner / finalist.'
                    : 'Congratulations! Final offer secured.'
                  : existingApplication.personalStatus === 'rejected'
                  ? isCompetition
                    ? 'Competition journey concluded for this entry.'
                    : 'Drive concluded for this application.'
                  : `${isCompetition ? 'Registered on ' : 'Applied on '}${
                      existingApplication.appliedAt
                        ? !isNaN(new Date(existingApplication.appliedAt).getTime())
                          ? new Date(existingApplication.appliedAt).toLocaleDateString()
                          : 'Recently'
                        : 'Recently'
                    }`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Eligibility / Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Recruitment Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Official Published Results for this drive or competition */}
          {opportunity.resultsPublished && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {isCompetition ? 'Official Winners & Top Performers' : 'Official Recruitment Results'}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Published
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      {isCompetition
                        ? `Official results verified for ${opportunity.companyName}`
                        : `Placement cell verified results for ${opportunity.companyName}`}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {opportunity.selectedCount ?? (opportunity.results?.length || 0)}{' '}
                  {isCompetition
                    ? (opportunity.selectedCount ?? (opportunity.results?.length || 0)) === 1
                      ? 'Winner / Finalist'
                      : 'Winners / Finalists'
                    : (opportunity.selectedCount ?? (opportunity.results?.length || 0)) === 1
                    ? 'Student Selected'
                    : 'Students Selected'}
                </span>
              </div>

              {opportunity.selectedCount === 0 || !opportunity.results || opportunity.results.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    {isCompetition
                      ? '0 winners/finalists announced for this competition'
                      : '0 students were selected for this recruitment drive'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isCompetition
                      ? 'This competition has concluded with no top selections recorded.'
                      : 'This drive has officially concluded with 0 candidates selected for final offers.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4">{isCompetition ? 'Participant / Lead' : 'Selected Student'}</th>
                        <th className="py-2.5 px-4">Roll Number</th>
                        <th className="py-2.5 px-4">Branch</th>
                        <th className="py-2.5 px-4">Graduation Batch</th>
                        <th className="py-2.5 px-4">
                          {isCompetition ? 'Prize / Recognition' : 'Package / CTC'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {opportunity.results.map((r, rIdx) => (
                        <tr key={r._id || rIdx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                              {r.candidateName ? r.candidateName.substring(0, 1).toUpperCase() : 'P'}
                            </div>
                            <span>{r.candidateName}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {r.rollNumber || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                              {r.branch || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {r.graduationYear ? `Class of ${r.graduationYear}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-semibold">
                            {r.offeredCtc || opportunity.ctcOrStipend || (isCompetition ? 'Winner Award' : 'Standard Offer')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Job or Competition Description */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white">
              {isCompetition
                ? isHackathon
                  ? 'Hackathon Overview & Themes'
                  : 'Competition Guidelines & Problem Statement'
                : 'About the Opportunity'}
            </h2>
            <div className="prose prose-invert prose-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {opportunity.description ||
                (isCompetition
                  ? 'No detailed problem statement provided. Check external rules or reach out to organizers.'
                  : 'No detailed job description provided.')}
            </div>
          </div>

          {/* Competition Phases or Recruitment Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  {isCompetition ? 'Competition Schedule & Phases' : 'Recruitment Process Timeline'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isCompetition
                    ? 'Configured competition stages and evaluation phases'
                    : 'Configured selection rounds and official recruitment stages'}
                </p>
              </div>
            </div>

            {!opportunity.rounds || opportunity.rounds.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                {isCompetition
                  ? 'No competition phases have been announced yet. Details will be updated by the organizers.'
                  : 'No recruitment rounds have been scheduled yet. Details will be updated by the placement cell.'}
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {opportunity.rounds.map((round, idx) => {
                  const isCompleted = round.status === 'completed';
                  const isActive = round.status === 'active';
                  return (
                    <div key={round._id || idx} className="relative group">
                      <div
                        className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-400'
                            : isActive
                            ? 'bg-indigo-600 border-indigo-400 ring-4 ring-indigo-500/20 animate-pulse'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      />
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {isCompetition ? 'Phase' : 'Round'} {round.sequence || idx + 1}: {round.name}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isActive
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {round.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span>Format: {round.type || (isCompetition ? 'Evaluation' : 'Assessment')}</span>
                          {round.scheduledDate && (
                            <span>
                              Scheduled:{' '}
                              {!isNaN(new Date(round.scheduledDate).getTime())
                                ? new Date(round.scheduledDate).toLocaleDateString()
                                : 'TBA'}
                            </span>
                          )}
                        </div>
                        {round.notes && (
                          <p className="text-xs text-slate-300 mt-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                            {round.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Eligibility Assessment & Apply / Register CTA */}
        <div className="space-y-6">
          {/* Eligibility Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {isCompetition ? 'Participant Eligibility' : 'Eligibility Criteria'}
            </h3>

            {isCompetition && opportunity.minCgpa === 0 && (!opportunity.eligibleBranches || opportunity.eligibleBranches.length === 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Open Participation: All students across any year and department can participate!</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Minimum CGPA</span>
                <span className="font-semibold text-white">
                  {opportunity.minCgpa > 0 ? opportunity.minCgpa : 'No minimum (Open)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">{isCompetition ? 'Active Backlog Restriction' : 'Maximum Backlogs'}</span>
                <span className="font-semibold text-white">
                  {opportunity.maxBacklogs > 0 ? `Max ${opportunity.maxBacklogs}` : 'None (Open)'}
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-800">
                <span className="text-slate-400 block mb-1">Eligible Branches</span>
                <div className="flex flex-wrap gap-1">
                  {opportunity.eligibleBranches?.length ? (
                    opportunity.eligibleBranches.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium"
                      >
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-300 font-medium">All Branches (Open to All)</span>
                  )}
                </div>
              </div>
              <div className="py-1.5 border-b border-slate-800">
                <span className="text-slate-400 block mb-1">Eligible Graduation Batches</span>
                <div className="flex flex-wrap gap-1">
                  {opportunity.eligibleGraduationYears?.length ? (
                    opportunity.eligibleGraduationYears.map((y) => (
                      <span
                        key={y}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium"
                      >
                        Class of {y}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-300 font-medium">Open to all batches</span>
                  )}
                </div>
              </div>
            </div>

            {/* Server-Side Eligibility Evaluation Box */}
            <div className="pt-3">
              {(eligibility?.status === 'eligible' || (isCompetition && eligibility?.status !== 'not_eligible')) && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isCompetition ? 'Eligible to Participate' : 'Eligible to Apply'}</span>
                  </div>
                  <p className="text-emerald-300/80">
                    {eligibility.reason ||
                      (isCompetition
                        ? 'Open participation criteria met. You are invited to register!'
                        : 'You satisfy all verified academic and branch requirements.')}
                  </p>
                </div>
              )}

              {eligibility?.status === 'not_eligible' && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Ineligible</span>
                  </div>
                  <p className="text-rose-300/80">
                    {eligibility.reason || 'You do not meet the minimum criteria for this position.'}
                  </p>
                  {eligibility.details && (
                    <ul className="mt-2 list-disc pl-4 space-y-0.5 text-rose-400/90 text-[11px]">
                      {eligibility.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {eligibility?.status === 'needs_verification' && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Profile Info Required</span>
                  </div>
                  <p className="text-amber-300/80">
                    {eligibility.reason || 'Please update your branch and roll number in profile.'}
                  </p>
                </div>
              )}
            </div>

            {/* Application / Registration CTAs */}
            <div className="pt-2">
              {isDeadlinePassed ? (
                <div className="p-3 text-center rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold">
                  {isCompetition ? 'Registration Deadline has Passed' : 'Application Deadline has Passed'}
                </div>
              ) : opportunity.applicationMode === 'external' ? (
                <div className="space-y-3">
                  <a
                    href={opportunity.externalUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <span>{isCompetition ? 'Open Registration Portal' : 'Open Form Link'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {existingApplication || externalConfirmed ? (
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs">
                      <label className="flex items-start gap-2.5 cursor-default">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled={true}
                          readOnly
                          className="mt-0.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 bg-slate-900 cursor-default"
                        />
                        <span className="text-emerald-300 text-[11px] leading-relaxed font-medium">
                          {isCompetition
                            ? 'I have registered on the external platform and want to track it on CampusHire.'
                            : 'I have submitted my application via the form link and want to track it on CampusHire.'}
                        </span>
                      </label>
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-900/40 text-[11px]">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Registration Recorded
                        </span>
                        <Link
                          to="/applications"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          View Tracker &rarr;
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={externalConfirmed}
                          onChange={(e) => setExternalConfirmed(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        <span className="text-slate-300 text-[11px] leading-relaxed">
                          {isCompetition
                            ? 'I have registered on the external platform and want to track my participation on CampusHire.'
                            : 'I have submitted my application via the form link and want to track it on CampusHire.'}
                        </span>
                      </label>
                      <button
                        onClick={handleExternalApplyConfirm}
                        disabled={!externalConfirmed || submitting}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg transition-all"
                      >
                        {submitting ? 'Recording...' : isCompetition ? 'Confirm External Registration' : 'Confirm External Submission'}
                      </button>
                    </div>
                  )}

                  {eligibility?.status !== 'eligible' && (
                    <p className="text-[11px] text-slate-500 text-center">
                      Registration is restricted to students meeting the specified criteria.
                    </p>
                  )}
                </div>
              ) : existingApplication ? (
                <div className="space-y-2">
                  <div className="p-3 text-center rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompetition ? 'Participation Registered' : 'Application Recorded'}
                  </div>
                  <Link
                    to="/applications"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                  >
                    View Status in {isCompetition ? 'Participation Tracker' : 'Application Tracker'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleInternalApply}
                    disabled={(!isCompetition ? eligibility?.status !== 'eligible' : eligibility?.status === 'not_eligible') || submitting}
                    className={`w-full py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isCompetition
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                    }`}
                  >
                    {submitting
                      ? isCompetition
                        ? 'Registering...'
                        : 'Submitting Application...'
                      : isCompetition
                      ? isHackathon
                        ? 'Register for Hackathon'
                        : 'Register for Competition'
                      : 'Submit Internal Application'}
                  </button>

                  {(!isCompetition ? eligibility?.status !== 'eligible' : eligibility?.status === 'not_eligible') && (
                    <p className="text-[11px] text-slate-500 text-center">
                      Registration is restricted to students meeting the specified criteria.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Guidelines / Conduct Note */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-1">
              {isCompetition ? 'Code of Conduct & Fair Play' : 'Placement Policy'}
            </span>
            {isCompetition
              ? 'All participants must adhere to university guidelines, ethical coding practices, and fair competition rules. Disqualification may apply for plagiarism.'
              : 'All applications are logged with timestamps and verified academic snapshots. Misrepresentation of external submissions is subject to placement cell conduct rules.'}
          </div>
        </div>
      </div>
    </div>
  );
}
