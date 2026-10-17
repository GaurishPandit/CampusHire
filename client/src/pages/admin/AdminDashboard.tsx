import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  FileCheck,
  TrendingUp,
  Upload,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { dashboardApi } from '@/api';

interface AdminStats {
  totalStudents: number;
  totalOpportunities: number;
  publishedOpportunities: number;
  totalApplications: number;
  activeRounds: number;
  totalSelections: number;
  recentActivity?: any[];
  upcomingDeadlines?: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalOpportunities: 0,
    publishedOpportunities: 0,
    totalApplications: 0,
    activeRounds: 0,
    totalSelections: 0,
    recentActivity: [],
    upcomingDeadlines: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await dashboardApi.getAdminDashboard();
        if (res.data?.data) {
          const d = res.data.data;
          setStats({
            totalStudents: d.totalStudents ?? d.studentCount ?? 0,
            totalOpportunities: d.totalOpportunities ?? 0,
            publishedOpportunities: d.publishedOpportunities ?? 0,
            totalApplications: d.totalApplications ?? d.applicationCount ?? 0,
            activeRounds: d.activeRounds ?? 0,
            totalSelections: d.totalSelections ?? 0,
            recentActivity: d.recentActivity || d.auditLogs || [],
            upcomingDeadlines: d.upcomingDeadlines || [],
          });
        }
      } catch (err) {
        console.error('Failed to load admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Placement Administration Suite</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Recruitment Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Oversee campus recruitment campaigns, import verified student cohorts, manage selection rounds, and publish official outcomes.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/admin/import-students"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-md"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            Import Student CSV
          </Link>
          <Link
            to="/admin/opportunities/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Opportunity
          </Link>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.totalStudents}
            </div>
            <p className="text-xs text-slate-400 mt-1">Eligible batch cohort</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Drives
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.publishedOpportunities}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Of {stats.totalOpportunities} total created
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Applications
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.totalApplications}
            </div>
            <p className="text-xs text-slate-400 mt-1">Internal & external logged</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Final Placements
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats.totalSelections}
            </div>
            <p className="text-xs text-slate-400 mt-1">Confirmed offers published</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Management Shortcuts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Navigation Cards */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-base font-bold text-white">Administration Operations</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/opportunities"
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                Manage Opportunities
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Configure eligibility parameters, create recruitment rounds, update candidate results, and publish final lists.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400">
                <span>View all opportunities</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/admin/import-students"
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                CSV Student Import
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload verified student academic rosters with pre-import validation, duplicate detection, and explicit commits.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-400">
                <span>Import student records</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/admin/audit-logs"
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                Audit Trail & Logs
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Review immutable audit logs of result publications, candidate status transitions, and opportunity modifications.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-400">
                <span>View audit logs</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/results"
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Published Results Portal
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Preview how official selection announcements and verified candidate placements appear to the student body.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span>View public listings</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines & Recent Logs */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Upcoming Drive Deadlines
            </h3>

            {stats.upcomingDeadlines && stats.upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map((d: any, idx: number) => {
                  const deadlineDate = d.deadline || d.applicationDeadline;
                  const isValidDate = deadlineDate && !isNaN(new Date(deadlineDate).getTime());
                  const formatted = isValidDate
                    ? new Date(deadlineDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Open / Rolling';

                  const isCompetition =
                    d.opportunityType === 'hackathon' || d.opportunityType === 'coding_competition';

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-white">{d.title}</p>
                          {isCompetition && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              {d.opportunityType === 'hackathon' ? 'Hackathon' : 'Competition'}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px]">{d.companyName}</span>
                      </div>
                      <span className="text-amber-400 font-medium ml-2 shrink-0">
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                No active deadlines in the next 30 days.
              </p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Recent System Activity
              </h3>
              <Link to="/admin/audit-logs" className="text-xs text-indigo-400 hover:underline">
                All logs
              </Link>
            </div>

            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentActivity.slice(0, 5).map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300 capitalize">
                        {log.action?.replace(/_/g, ' ') || 'Action'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log.details ? JSON.stringify(log.details) : log.entityType}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                No administrative events logged yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
