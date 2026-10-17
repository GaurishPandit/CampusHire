import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  Building,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  ExternalLink,
  Info,
  Trophy,
} from 'lucide-react';
import { resultApi } from '@/api';

interface SelectedStudentDetail {
  resultId: string;
  applicationId: string;
  candidateName: string;
  rollNumber?: string;
  branch: string;
  graduationYear?: number;
  offeredCtc?: string;
}

interface DriveSummary {
  opportunityId: string;
  opportunityTitle?: string;
  title?: string;
  companyName: string;
  opportunityType?: string;
  selectedCount: number;
  resultsPublishedAt?: string;
  selectedStudents: SelectedStudentDetail[];
}

interface PublishedResult {
  _id: string;
  candidateName: string;
  branch: string;
  graduationYear?: number;
  opportunityTitle: string;
  opportunityType?: string;
  companyName: string;
  publishedAt: string;
  offeredCTC?: number | string;
}

const formatDateSafe = (dateStr?: string) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
};

export default function ResultsPage() {
  const [results, setResults] = useState<PublishedResult[]>([]);
  const [drives, setDrives] = useState<DriveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [expandedDriveIds, setExpandedDriveIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'drives' | 'candidates'>('drives');

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
      const driveList = Array.isArray(res.data?.drives) ? res.data.drives : [];

      setResults(list);
      setDrives(driveList);

      // If user is searching and finds matching drives, auto-expand first drive
      if (search.trim() && driveList.length > 0) {
        setExpandedDriveIds({ [driveList[0].opportunityId]: true });
      }
    } catch (err) {
      console.error('Failed to load published selection results:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDriveExpand = (oppId: string) => {
    setExpandedDriveIds((prev) => ({
      ...prev,
      [oppId]: !prev[oppId],
    }));
  };

  // Filter drives based on search and branch
  const filteredDrives = drives.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.companyName.toLowerCase().includes(q) ||
      d.opportunityTitle.toLowerCase().includes(q) ||
      d.selectedStudents.some(
        (s) =>
          s.candidateName.toLowerCase().includes(q) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
      );

    const matchesBranch =
      !branchFilter.trim() ||
      d.selectedStudents.some((s) =>
        s.branch.toLowerCase().includes(branchFilter.trim().toLowerCase())
      );

    return matchesSearch && matchesBranch;
  });

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
            Verified final selection results officially announced by the college placement cell. Click any company drive to inspect selected student details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <Building className="w-7 h-7 text-indigo-400" />
            <div>
              <span className="text-xs text-slate-400">Total Drives</span>
              <p className="text-lg font-black text-white">{drives.length}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-400" />
            <div>
              <span className="text-xs text-slate-400">Total Selections</span>
              <p className="text-lg font-black text-white">{results.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* View Toggle Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('drives')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'drives'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Drives by Company ({filteredDrives.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Selected Candidates ({results.length})</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:max-w-md sm:ml-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search company, position, or candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <input
            type="text"
            placeholder="Branch (e.g. CSE)"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="sm:w-36 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800/60"
            />
          ))}
        </div>
      ) : activeTab === 'drives' ? (
        /* Company Drives Accordion View */
        filteredDrives.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No published drives match your criteria</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Selection results are announced here once recruitment drives are finalized and verified.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrives.map((drive) => {
              const isExpanded = !!expandedDriveIds[drive.opportunityId];
              const isCompetition =
                drive.opportunityType === 'hackathon' ||
                drive.opportunityType === 'coding_competition';
              const displayTitle = drive.opportunityTitle || drive.title || 'Opportunity';

              return (
                <div
                  key={drive.opportunityId}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden transition-all hover:border-slate-700"
                >
                  {/* Drive Row / Card Header */}
                  <div
                    onClick={() => toggleDriveExpand(drive.opportunityId)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-850/40 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 ${
                          isCompetition
                            ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                            : 'bg-slate-800 border-slate-700 text-indigo-400'
                        }`}
                      >
                        {isCompetition ? (
                          <Trophy className="w-5 h-5 text-amber-400" />
                        ) : drive.companyName ? (
                          drive.companyName.substring(0, 2).toUpperCase()
                        ) : (
                          'CO'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                            {drive.companyName}
                          </h3>
                          <span className="text-xs text-slate-400 font-medium">
                            • {displayTitle}
                          </span>
                          {isCompetition && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {drive.opportunityType === 'hackathon' ? 'Hackathon' : 'Coding Competition'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Published: {formatDateSafe(drive.resultsPublishedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {drive.selectedCount > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          {isCompetition ? (
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {drive.selectedCount}{' '}
                            {isCompetition
                              ? drive.selectedCount === 1
                                ? 'Winner Announced'
                                : 'Winners Announced'
                              : drive.selectedCount === 1
                              ? 'Student Selected'
                              : 'Students Selected'}
                          </span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {isCompetition ? '0 Winners Announced' : '0 Students Selected'}
                          </span>
                        </span>
                      )}

                      <button
                        type="button"
                        aria-label="Toggle Drive Results"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <span className="hidden sm:inline">
                          {isExpanded ? 'Hide Details' : 'Check Results'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details of Selected Students for This Drive */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/70 p-5 space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {isCompetition
                              ? `Winners & Top Performers for ${drive.companyName}`
                              : `Selected Candidates for ${drive.companyName}`}
                          </h4>
                        </div>
                        <Link
                          to={`/opportunities/${drive.opportunityId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <span>View Full Opportunity Details</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {drive.selectedCount === 0 || drive.selectedStudents.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                          <Info className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                          <p className="text-xs font-semibold text-slate-200">
                            {isCompetition
                              ? '0 winners/finalists announced for this competition'
                              : '0 students were selected for this recruitment drive'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isCompetition
                              ? 'The competition concluded with 0 candidates awarded top honors.'
                              : 'The recruitment drive concluded with 0 candidates selected for final offers.'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                                <th className="py-2.5 px-4">
                                  {isCompetition ? 'Winner / Finalist' : 'Candidate Name'}
                                </th>
                                <th className="py-2.5 px-4">Roll Number</th>
                                <th className="py-2.5 px-4">Branch</th>
                                <th className="py-2.5 px-4">Graduation Batch</th>
                                <th className="py-2.5 px-4">
                                  {isCompetition ? 'Prize / Award' : 'Offered Role / CTC'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 text-slate-300">
                              {drive.selectedStudents.map((student, sIdx) => (
                                <tr
                                  key={student.resultId || student.applicationId || sIdx}
                                  className="hover:bg-slate-900/40 transition-colors"
                                >
                                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                                      {student.candidateName
                                        ? student.candidateName.substring(0, 1).toUpperCase()
                                        : 'S'}
                                    </div>
                                    <span>{student.candidateName}</span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-300">
                                    {student.rollNumber || '—'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                                      {student.branch || '—'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-300">
                                    {student.graduationYear
                                      ? `Class of ${student.graduationYear}`
                                      : '—'}
                                  </td>
                                  <td className="py-3 px-4 text-emerald-400 font-semibold">
                                    {student.offeredCtc || (isCompetition ? 'Winner Award' : displayTitle)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Flat Candidates Table View */
        results.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No published results available</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Selection results will appear here once finalized by the placement cell.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3.5 px-6">Candidate / Winner</th>
                    <th className="py-3.5 px-6">Branch</th>
                    <th className="py-3.5 px-6">Company / Host</th>
                    <th className="py-3.5 px-6">Role / Competition</th>
                    <th className="py-3.5 px-6">Published Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {results.map((r: any) => {
                    const candidateName =
                      r.candidateName ||
                      r.publicSnapshot?.studentName ||
                      r.studentName ||
                      'Candidate';
                    const branch = r.branch || r.publicSnapshot?.branch || '—';
                    const companyName = r.companyName || r.publicSnapshot?.companyName || '—';
                    const role = r.opportunityTitle || r.publicSnapshot?.opportunityTitle || 'Position';
                    const publishedDate = formatDateSafe(r.publishedAt);
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
                        <td className="py-4 px-6 text-xs text-slate-400">{publishedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
