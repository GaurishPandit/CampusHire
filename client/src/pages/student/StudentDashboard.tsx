import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building,
  MapPin,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, opportunityApi } from '@/api';

interface StatSummary {
  eligibleOpportunities: number;
  totalApplications: number;
  activeRounds: number;
  profileCompletion: number;
  missingProfileFields: string[];
}

interface OpportunityItem {
  _id: string;
  companyName: string;
  title: string;
  type: string;
  workMode: string;
  location: string;
  ctcOrStipend?: string;
  deadline: string;
  eligibilityStatus?: string;
  eligibilityReason?: string;
}

interface ApplicationItem {
  _id: string;
  opportunity: {
    _id: string;
    companyName: string;
    title: string;
    type: string;
  };
  currentRoundName?: string;
  personalStatus: string;
  appliedAt: string;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<StatSummary>({
    eligibleOpportunities: 0,
    totalApplications: 0,
    activeRounds: 0,
    profileCompletion: 85,
    missingProfileFields: [],
  });
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [recentApplications, setRecentApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashRes, oppRes] = await Promise.allSettled([
          dashboardApi.getStudentDashboard(),
          opportunityApi.list({ status: 'published', limit: 4 }),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
          const d = dashRes.value.data.data;
          const eligibleCount = typeof d.eligibleCount === 'number'
            ? d.eligibleCount
            : (typeof d.eligibleOpportunitiesCount === 'number'
              ? d.eligibleOpportunitiesCount
              : (typeof d.stats?.eligibleOpportunitiesCount === 'number'
                ? d.stats.eligibleOpportunitiesCount
                : (Array.isArray(d.eligibleOpportunities) ? d.eligibleOpportunities.length : 0)));

          const totalApps = typeof d.totalApplications === 'number'
            ? d.totalApplications
            : (typeof d.myApplicationsCount === 'number'
              ? d.myApplicationsCount
              : (typeof d.stats?.myApplicationsCount === 'number'
                ? d.stats.myApplicationsCount
                : (Array.isArray(d.recentApplications) ? d.recentApplications.length : 0)));

          const actRounds = typeof d.activeRounds === 'number' ? d.activeRounds : 0;
          const profCompletion = typeof d.profileCompletionPercentage === 'number'
            ? d.profileCompletionPercentage
            : (profile?.completenessScore || (profile?.isAcademicVerified ? 100 : 70));

          setStats({
            eligibleOpportunities: eligibleCount,
            totalApplications: totalApps,
            activeRounds: actRounds,
            profileCompletion: profCompletion,
            missingProfileFields: Array.isArray(d.missingFields) ? d.missingFields : [],
          });
          if (d.recentApplications && Array.isArray(d.recentApplications)) {
            setRecentApplications(d.recentApplications);
          }
        }

        if (oppRes.status === 'fulfilled' && oppRes.value.data?.data) {
          const oppList = Array.isArray(oppRes.value.data.data)
            ? oppRes.value.data.data
            : oppRes.value.data.data.opportunities || [];
          setOpportunities(oppList.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [profile]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome & Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-8 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Placement Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.name || user?.name || 'Scholar'}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Discover opportunities matching your academic profile, monitor your recruitment pipeline, and track round outcomes seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              to="/opportunities"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Briefcase className="w-4 h-4" />
              Browse Opportunities
            </Link>
            <Link
              to="/applications"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
            >
              My Applications
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Verification & Completion Notice */}
      {profile?.isAcademicVerified ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Academic Profile Verified</span>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                Roll No: {profile?.rollNumber} • CGPA: {profile?.cgpa} • Backlogs: {profile?.activeBacklogs ?? 0}
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
          >
            View Profile
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Academic Details Pending Verification</span>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Your placement cell verifies academic records. Complete your personal skills and resume in the meantime.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4"
          >
            Update Profile
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Eligible Drives</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.eligibleOpportunities}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Available for your branch & CGPA</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Applications</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.totalApplications}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Internal & confirmed applications
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Pipeline</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.activeRounds}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active recruitment rounds
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Readiness</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {stats.profileCompletion}%
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {profile?.resumeUrl ? 'Resume & details updated' : 'Upload resume to complete'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recommended & Available Opportunities */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Featured Opportunities</h2>
              <p className="text-xs text-slate-400">Active placement and internship drives open for applications</p>
            </div>
            <Link
              to="/opportunities"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {opportunities.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <Building className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No active opportunities found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  New campus hiring opportunities will appear here when published by the placement cell.
                </p>
              </div>
            ) : (
              opportunities.map((opp) => (
                <div
                  key={opp._id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-base text-indigo-400 shrink-0 uppercase shadow-inner">
                      {opp.companyName ? opp.companyName.substring(0, 2) : 'CH'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {opp.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {opp.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          {opp.companyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {opp.location || opp.workMode}
                        </span>
                        {opp.ctcOrStipend && (
                          <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {opp.ctcOrStipend.replace(/^[₹$]\s*/, '')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          Deadline: {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'Rolling'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <Link
                      to={`/opportunities/${opp._id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all"
                    >
                      <span>Check Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Applications & Pipeline */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Recent Applications</h3>
              <Link
                to="/applications"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Track All
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">You haven't applied to any drives yet.</p>
                <Link
                  to="/opportunities"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
                >
                  Browse open positions
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => (
                  <div
                    key={app._id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        {app.opportunity?.title || 'Position'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {app.opportunity?.companyName} • {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : ((app as any).createdAt ? new Date((app as any).createdAt).toLocaleDateString() : 'Recently')}
                      </p>
                    </div>
                    {(() => {
                      const st = app.personalStatus || (app as any).status || 'submitted';
                      return (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            st === 'selected'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : st === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : st === 'shortlisted'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {st === 'selected'
                            ? 'Selected (Final Offer)'
                            : st === 'shortlisted'
                            ? 'Shortlisted (Next Round)'
                            : st === 'rejected'
                            ? 'Not Eligible Further'
                            : st}
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-lg">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Recruitment Quick Guide
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Eligibility is verified server-side based on official academic records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>External opportunities require confirmation after submitting on the company portal.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Official results are published by the placement cell upon drive completion.</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <Link
                to="/results"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-between"
              >
                <span>View Published Selections</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
