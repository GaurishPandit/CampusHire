import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
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
        });
        if (raw.eligibility) {
          setEligibility(raw.eligibility);
        }
      }

      if (eligRes.status === 'fulfilled' && eligRes.value.data?.data) {
        setEligibility(eligRes.value.data.data);
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
        }
      }
    } catch (err) {
      console.error('Error loading opportunity detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInternalApply = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await applicationApi.applyInternal(id);
      toast.success('Application submitted successfully!');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit application';
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
      toast.success('External application confirmation recorded!');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record external application';
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

  const isDeadlinePassed = opportunity.deadline
    ? new Date(opportunity.deadline).getTime() < Date.now()
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-slate-800 border border-indigo-500/30 flex items-center justify-center font-black text-2xl text-indigo-300 shrink-0 shadow-lg">
              {(opportunity.companyName || 'CO').substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-white">{opportunity.title}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {opportunity.type}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {opportunity.applicationMode === 'internal' ? 'Internal Application' : 'External Portal'}
                </span>
              </div>

              <div className="flex items-center gap-5 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Building className="w-4 h-4 text-slate-400" />
                  {opportunity.companyName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {opportunity.location || 'On-Campus'} ({opportunity.workMode})
                </span>
                {opportunity.ctcOrStipend && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <DollarSign className="w-4 h-4" />
                    {opportunity.ctcOrStipend}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Deadline: {opportunity.deadline ? new Date(opportunity.deadline).toLocaleString() : 'Open / Rolling'}
                </span>
              </div>
            </div>
          </div>

          {/* Existing Application Badge if user already applied */}
          {existingApplication && (
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  You Have Applied
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                  {existingApplication.personalStatus || 'Submitted'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Applied on {existingApplication.appliedAt ? new Date(existingApplication.appliedAt).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Eligibility / Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Recruitment Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Job Description */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white">About the Opportunity</h2>
            <div className="prose prose-invert prose-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {opportunity.description || 'No detailed job description provided.'}
            </div>
          </div>

          {/* Recruitment Timeline / Ordered Stages */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Recruitment Process Timeline</h2>
                <p className="text-xs text-slate-400">
                  Configured selection rounds and official recruitment stages
                </p>
              </div>
            </div>

            {(!opportunity.rounds || opportunity.rounds.length === 0) ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                No recruitment rounds have been scheduled yet. Details will be updated by the placement cell.
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
                            Round {round.sequence || idx + 1}: {round.name}
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
                          <span>Type: {round.type || 'Assessment'}</span>
                          {round.scheduledDate && (
                            <span>
                              Scheduled: {new Date(round.scheduledDate).toLocaleDateString()}
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

        {/* Right Column: Eligibility Assessment & Apply CTA */}
        <div className="space-y-6">
          {/* Eligibility Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Eligibility Criteria</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Minimum CGPA</span>
                <span className="font-semibold text-white">
                  {opportunity.minCgpa > 0 ? opportunity.minCgpa : 'No minimum'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Maximum Backlogs</span>
                <span className="font-semibold text-white">{opportunity.maxBacklogs ?? 0}</span>
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
                    <span className="text-slate-300 font-medium">All Branches</span>
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
                    <span className="text-slate-300 font-medium">Open to all</span>
                  )}
                </div>
              </div>
            </div>

            {/* Server-Side Eligibility Evaluation Box */}
            <div className="pt-3">
              {eligibility?.status === 'eligible' && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Eligible to Apply</span>
                  </div>
                  <p className="text-emerald-300/80">
                    {eligibility.reason || 'You satisfy all verified academic and branch requirements.'}
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
                    <span>Verification Required</span>
                  </div>
                  <p className="text-amber-300/80">
                    {eligibility.reason || 'Missing or unverified academic data in your profile.'}
                  </p>
                </div>
              )}
            </div>

            {/* Application CTAs */}
            <div className="pt-2">
              {isDeadlinePassed ? (
                <div className="p-3 text-center rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold">
                  Application Deadline has Passed
                </div>
              ) : existingApplication ? (
                <div className="space-y-2">
                  <div className="p-3 text-center rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Application Recorded
                  </div>
                  <Link
                    to="/applications"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                  >
                    View Status in Application Tracker
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunity.applicationMode === 'internal' ? (
                    <button
                      onClick={handleInternalApply}
                      disabled={eligibility?.status !== 'eligible' || submitting}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {submitting ? 'Submitting Application...' : 'Submit Internal Application'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <a
                        href={opportunity.externalUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all inline-flex items-center justify-center gap-2"
                      >
                        <span>Open Company Portal</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={externalConfirmed}
                            onChange={(e) => setExternalConfirmed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                          />
                          <span className="text-slate-300 text-[11px] leading-relaxed">
                            I have submitted my application on the company's external portal and want to track it on CampusHire.
                          </span>
                        </label>
                        <button
                          onClick={handleExternalApplyConfirm}
                          disabled={!externalConfirmed || submitting}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg transition-all"
                        >
                          {submitting ? 'Recording...' : 'Confirm External Submission'}
                        </button>
                      </div>
                    </div>
                  )}

                  {eligibility?.status !== 'eligible' && (
                    <p className="text-[11px] text-slate-500 text-center">
                      Applications are restricted to students meeting the verified criteria.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Fairness Note */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-1">Placement Policy</span>
            All applications are logged with timestamps and verified academic snapshots. Misrepresentation of external submissions is subject to placement cell conduct rules.
          </div>
        </div>
      </div>
    </div>
  );
}
