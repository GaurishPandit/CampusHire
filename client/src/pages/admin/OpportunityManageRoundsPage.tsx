import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award,
  Calendar,
  Building,
  ShieldCheck,
  ChevronRight,
  Send,
  AlertCircle,
  Edit3,
  Trash2,
  RotateCcw,
  Play,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opportunityApi, applicationApi, resultApi } from '@/api';

interface Round {
  _id: string;
  name: string;
  sequence?: number;
  sequenceNumber?: number;
  type?: string;
  roundType?: string;
  status: 'scheduled' | 'upcoming' | 'active' | 'completed' | 'cancelled';
  scheduledDate?: string;
  notes?: string;
}

interface Applicant {
  _id: string;
  student?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    rollNumber?: string;
    branch?: string;
    cgpa?: number;
  };
  studentProfile?: {
    _id: string;
    rollNumber?: string;
    branch?: string;
    cgpa?: number;
    graduationYear?: number;
  };
  appliedAt: string;
  status: string;
  personalStatus: string;
  currentRoundName?: string;
  applicationMode: string;
  isExternalSelfReported?: boolean;
}

export default function OpportunityManageRoundsPage() {
  const { id } = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // New Round modal / form
  const [showAddRound, setShowAddRound] = useState(false);
  const [roundForm, setRoundForm] = useState({
    name: '',
    sequence: 1,
    type: 'Assessment',
    status: 'scheduled',
    scheduledDate: '',
    notes: '',
  });

  // Edit Round modal state
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Result publishing
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [oppRes, roundsRes, appsRes] = await Promise.allSettled([
        opportunityApi.getById(id!),
        opportunityApi.getRounds(id!),
        applicationApi.getOpportunityApplications(id!),
      ]);

      if (oppRes.status === 'fulfilled' && oppRes.value.data?.data) {
        setOpportunity(oppRes.value.data.data);
      }

      if (roundsRes.status === 'fulfilled' && roundsRes.value.data?.data) {
        const rList = Array.isArray(roundsRes.value.data.data)
          ? roundsRes.value.data.data
          : roundsRes.value.data.data.rounds || [];
        setRounds(rList);
        setRoundForm((prev) => ({ ...prev, sequence: rList.length + 1 }));
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data?.data) {
        const aList = Array.isArray(appsRes.value.data.data)
          ? appsRes.value.data.data
          : appsRes.value.data.data.applications || [];
        setApplicants(aList);
      }
    } catch (err) {
      console.error('Failed to load rounds/applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !roundForm.name.trim()) {
      toast.error('Round name is required');
      return;
    }

    const typeMap: Record<string, string> = {
      Assessment: 'online_assessment',
      Coding: 'coding_assessment',
      Technical: 'technical_interview',
      HR: 'hr_interview',
      Final: 'final_selection',
    };

    const payload: any = {
      name: roundForm.name.trim(),
      roundType: typeMap[roundForm.type] || 'other',
      type: typeMap[roundForm.type] || 'other',
      sequenceNumber: Number(roundForm.sequence) || rounds.length + 1,
      sequence: Number(roundForm.sequence) || rounds.length + 1,
      status: 'upcoming',
      isPublished: true,
      notes: roundForm.notes?.trim() || undefined,
    };

    if (roundForm.scheduledDate) {
      payload.scheduledDate = new Date(roundForm.scheduledDate).toISOString();
    }

    try {
      await opportunityApi.addRound(id, payload);
      toast.success('Recruitment round added successfully');
      setShowAddRound(false);
      setRoundForm({
        name: '',
        sequence: rounds.length + 2,
        type: 'Assessment',
        status: 'scheduled',
        scheduledDate: '',
        notes: '',
      });
      loadAll();
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Failed to add round';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const details = err.response.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        if (details) msg = `${msg} (${details})`;
      }
      toast.error(msg, { duration: 5000 });
    }
  };

  const handleUpdateRoundStatus = async (roundId: string, newStatus: string) => {
    try {
      setUpdatingStatusId(roundId);
      await opportunityApi.changeRoundStatus(roundId, newStatus);
      toast.success(`Round marked as ${newStatus}`);
      setRounds((prev) =>
        prev.map((r) => (r._id === roundId ? { ...r, status: newStatus as any } : r))
      );
      loadAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update round status';
      toast.error(msg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteRound = async (roundId: string, roundName: string) => {
    if (!window.confirm(`Are you sure you want to delete round "${roundName}"?`)) {
      return;
    }
    try {
      await opportunityApi.deleteRound(roundId);
      toast.success('Round deleted successfully');
      setRounds((prev) => prev.filter((r) => r._id !== roundId));
      loadAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete round';
      toast.error(msg);
    }
  };

  const handleEditRoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;
    try {
      const typeMap: Record<string, string> = {
        Assessment: 'online_assessment',
        Coding: 'coding_assessment',
        Technical: 'technical_interview',
        HR: 'hr_interview',
        Final: 'final_selection',
      };

      const payload: any = {
        name: editingRound.name.trim(),
        roundType: typeMap[editingRound.type || ''] || editingRound.roundType || 'other',
        type: typeMap[editingRound.type || ''] || editingRound.roundType || 'other',
        status: editingRound.status,
        sequenceNumber: Number(editingRound.sequence || editingRound.sequenceNumber) || 1,
        sequence: Number(editingRound.sequence || editingRound.sequenceNumber) || 1,
        notes: editingRound.notes?.trim() || undefined,
      };

      if (editingRound.scheduledDate) {
        payload.scheduledDate = new Date(editingRound.scheduledDate).toISOString();
      }

      await opportunityApi.updateRound(editingRound._id, payload);
      toast.success('Round updated successfully');
      setEditingRound(null);
      loadAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update round';
      toast.error(msg);
    }
  };

  const handleUpdateApplicantStatus = async (appId: string, status: string) => {
    try {
      setApplicants((prev) =>
        prev.map((a) =>
          a._id === appId ? { ...a, status, personalStatus: status } : a
        )
      );
      await applicationApi.updateStatus(appId, { status, personalStatus: status });
      toast.success(`Applicant status updated to ${status}`);
      loadAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update candidate status';
      toast.error(msg);
      loadAll();
    }
  };

  const isCompetition =
    opportunity?.opportunityType === 'hackathon' ||
    opportunity?.opportunityType === 'coding_competition' ||
    opportunity?.type === 'hackathon' ||
    opportunity?.type === 'coding_competition';
  const isHackathon =
    opportunity?.opportunityType === 'hackathon' || opportunity?.type === 'hackathon';

  const handlePublishResults = async () => {
    if (!id) return;
    if (opportunity?.resultsPublished) {
      toast.error(
        isCompetition
          ? 'Official results and winners have already been published.'
          : 'Official results have already been published for this drive.'
      );
      return;
    }

    const selectedCount = applicants.filter(
      (a: any) => (a.personalStatus || a.status) === 'selected'
    ).length;

    const confirmMsg =
      selectedCount === 0
        ? isCompetition
          ? 'No participants are marked as "Winner / Finalist". Do you want to publish results with 0 winners? This will conclude the competition.'
          : 'No candidates are marked as "Selected". Do you want to publish official results with 0 students selected? This will conclude the recruitment drive.'
        : isCompetition
        ? `Publish official competition results for ${selectedCount} winner/finalist candidate(s)? This makes the result visible to all students.`
        : `Publish official placement results for ${selectedCount} selected candidate(s)? This makes the result visible to all students.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setPublishing(true);
      await resultApi.publishResults(id);
      toast.success(
        selectedCount === 0
          ? isCompetition
            ? 'Official competition results published (0 winners).'
            : 'Official results published (0 candidates selected).'
          : isCompetition
          ? 'Official competition winners published to student body!'
          : 'Official selection results published to student body!'
      );
      setOpportunity((prev: any) =>
        prev ? { ...prev, resultsPublished: true, selectedCount } : prev
      );
      loadAll();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to publish results';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading {isCompetition ? 'competition pipeline' : 'recruitment pipeline'}...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top back navigation */}
      <div>
        <Link
          to="/admin/opportunities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Opportunities</span>
        </Link>
      </div>

      {/* Opportunity Summary Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">{opportunity?.title}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                isCompetition
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
              }`}
            >
              {isCompetition && <Trophy className="w-3 h-3 text-amber-400" />}
              {opportunity?.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span className="text-slate-200 font-semibold">{opportunity?.companyName}</span>
            <span>•</span>
            <span>
              {applicants.length} Total {isCompetition ? 'Participants' : 'Applicants'}
            </span>
            <span>•</span>
            <span>
              {rounds.length} Configured {isCompetition ? 'Phases' : 'Rounds'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddRound(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            {isCompetition ? 'Add Competition Phase' : 'Add Recruitment Round'}
          </button>

          {opportunity?.resultsPublished ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-not-allowed shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isCompetition
                  ? `Results Published (${opportunity?.selectedCount ?? 0} Winners)`
                  : `Results Published (${opportunity?.selectedCount ?? 0} Selected)`}
              </span>
            </div>
          ) : (
            <button
              onClick={handlePublishResults}
              disabled={publishing}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg transition-all hover:scale-105 ${
                isCompetition
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
              }`}
            >
              {isCompetition ? <Trophy className="w-4 h-4" /> : <Award className="w-4 h-4" />}
              {publishing
                ? 'Publishing...'
                : isCompetition
                ? 'Publish Winners & Results'
                : 'Publish Official Results'}
            </button>
          )}
        </div>
      </div>

      {/* Add Round Modal */}
      {showAddRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleCreateRound}
            className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isCompetition ? 'Add Competition Phase / Milestone' : 'Add Recruitment Stage / Round'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRound(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isCompetition ? 'Phase Name *' : 'Round Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  isCompetition
                    ? 'e.g. Prototype Submission & Shortlist'
                    : 'e.g. Technical Interview Round 1'
                }
                value={roundForm.name}
                onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sequence Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={roundForm.sequence}
                  onChange={(e) => setRoundForm({ ...roundForm, sequence: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isCompetition ? 'Phase Format' : 'Round Type'}
                </label>
                <select
                  value={roundForm.type}
                  onChange={(e) => setRoundForm({ ...roundForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {isCompetition ? (
                    <>
                      <option value="Assessment">Online Coding / Assessment</option>
                      <option value="Coding">Implementation / Hack Phase</option>
                      <option value="Technical">Prototype Evaluation</option>
                      <option value="HR">Pitch & Demo Presentation</option>
                      <option value="Final">Grand Finale & Winners</option>
                    </>
                  ) : (
                    <>
                      <option value="Assessment">Online Assessment</option>
                      <option value="Coding">Coding Test</option>
                      <option value="Technical">Technical Interview</option>
                      <option value="HR">HR Interview</option>
                      <option value="Final">Final Selection</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={roundForm.scheduledDate}
                  onChange={(e) => setRoundForm({ ...roundForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={roundForm.status}
                  onChange={(e) => setRoundForm({ ...roundForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructions / Notes
              </label>
              <textarea
                rows={2}
                placeholder={
                  isCompetition
                    ? 'Platform link, problem statement instructions, or judging rubric...'
                    : 'Platform link, reporting time, or instructions...'
                }
                value={roundForm.notes}
                onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRound(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                {isCompetition ? 'Save Phase' : 'Save Round'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Round Modal */}
      {editingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleEditRoundSubmit}
            className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isCompetition ? 'Edit Competition Phase' : 'Edit Recruitment Round'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRound(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isCompetition ? 'Phase Name *' : 'Round Name *'}
              </label>
              <input
                type="text"
                required
                value={editingRound.name}
                onChange={(e) => setEditingRound({ ...editingRound, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sequence Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingRound.sequence || editingRound.sequenceNumber || 1}
                  onChange={(e) =>
                    setEditingRound({
                      ...editingRound,
                      sequence: parseInt(e.target.value, 10) || 1,
                      sequenceNumber: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editingRound.status}
                  onChange={(e) =>
                    setEditingRound({ ...editingRound, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active (In Progress)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isCompetition ? 'Phase Format' : 'Round Type'}
                </label>
                <select
                  value={editingRound.type || editingRound.roundType || 'Assessment'}
                  onChange={(e) => setEditingRound({ ...editingRound, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {isCompetition ? (
                    <>
                      <option value="Assessment">Online Coding / Assessment</option>
                      <option value="Coding">Implementation / Hack Phase</option>
                      <option value="Technical">Prototype Evaluation</option>
                      <option value="HR">Pitch & Demo Presentation</option>
                      <option value="Final">Grand Finale & Winners</option>
                    </>
                  ) : (
                    <>
                      <option value="Assessment">Online Assessment</option>
                      <option value="Coding">Coding Test</option>
                      <option value="Technical">Technical Interview</option>
                      <option value="HR">HR Interview</option>
                      <option value="Final">Final Selection</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={
                    editingRound.scheduledDate
                      ? new Date(editingRound.scheduledDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingRound({ ...editingRound, scheduledDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={editingRound.notes || ''}
                onChange={(e) => setEditingRound({ ...editingRound, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRound(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                {isCompetition ? 'Update Phase' : 'Update Round'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rounds Sequence Cards */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            {isCompetition
              ? 'Configured Competition Phases & Milestones'
              : 'Configured Recruitment Rounds & Status'}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {rounds.length} Total{' '}
            {isCompetition
              ? rounds.length === 1
                ? 'Phase'
                : 'Phases'
              : rounds.length === 1
              ? 'Stage'
              : 'Stages'}
          </span>
        </div>

        {rounds.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center bg-slate-950/50 rounded-xl border border-slate-800/60">
            {isCompetition
              ? 'No competition phases created yet. Add evaluation phases using the button above.'
              : 'No rounds created yet. Add recruitment rounds using the button above.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rounds.map((r, idx) => {
              const seq = r.sequenceNumber || r.sequence || idx + 1;
              const isUpdating = updatingStatusId === r._id;
              return (
                <div
                  key={r._id || idx}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    r.status === 'completed'
                      ? 'bg-slate-950/80 border-emerald-900/40 shadow-sm shadow-emerald-950/20'
                      : r.status === 'active'
                      ? 'bg-slate-950/90 border-indigo-800/50 shadow-sm shadow-indigo-950/30 ring-1 ring-indigo-500/20'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Stage & Action Icons */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      {isCompetition ? 'Phase' : 'Stage'} {seq}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRound(r)}
                        title={isCompetition ? 'Edit Phase' : 'Edit Round'}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRound(r._id, r.name)}
                        title={isCompetition ? 'Delete Phase' : 'Delete Round'}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Round Details */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{r.name}</h4>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p>
                        {isCompetition ? 'Format: ' : 'Type: '}
                        <span className="text-slate-300 font-medium">
                          {r.roundType || r.type || (isCompetition ? 'Evaluation' : 'Assessment')}
                        </span>
                      </p>
                      {r.scheduledDate && (
                        <p className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>
                            {!isNaN(new Date(r.scheduledDate).getTime())
                              ? new Date(r.scheduledDate).toLocaleDateString()
                              : 'TBA'}
                          </span>
                        </p>
                      )}
                      {r.notes && (
                        <p className="text-slate-500 text-[10px] line-clamp-1 italic mt-1">
                          "{r.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Controls */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          r.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'active'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : r.status === 'scheduled'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        {r.status === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                        {r.status === 'scheduled' && (
                          <Clock className="w-3 h-3 text-amber-400" />
                        )}
                        {r.status}
                      </span>

                      {/* Dropdown status selector */}
                      <select
                        value={r.status}
                        disabled={isUpdating}
                        onChange={(e) => handleUpdateRoundStatus(r._id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Primary Status Quick-Action Button */}
                    {r.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateRoundStatus(r._id, 'completed')}
                        disabled={isUpdating}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isUpdating ? 'Updating...' : 'Mark as Completed'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateRoundStatus(r._id, 'scheduled')}
                        disabled={isUpdating}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        {isUpdating ? 'Updating...' : 'Reopen / Reschedule'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applicants / Participants List & Outcome Management Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              {isCompetition
                ? 'Participant Pipeline & Outcome Management'
                : 'Applicant Pipeline & Outcome Management'}
            </h3>
            <p className="text-xs text-slate-400">
              {isCompetition
                ? 'Advance individual participant statuses across competition phases before publishing winners.'
                : 'Update individual candidate statuses across stages before final publication.'}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {applicants.length} {isCompetition ? 'Participants' : 'Candidates'}
          </span>
        </div>

        {applicants.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isCompetition
              ? 'No registrations received for this competition yet.'
              : 'No applications received for this opportunity yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">{isCompetition ? 'Participant / Lead' : 'Candidate'}</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">CGPA</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Update Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {applicants.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">
                        {app.student?.name ||
                          `${app.student?.firstName || ''} ${app.student?.lastName || ''}`.trim() ||
                          'Participant'}
                      </div>
                      <span className="text-[11px] text-slate-500">{app.student?.email}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {app.student?.rollNumber || app.studentProfile?.rollNumber || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {app.student?.branch || app.studentProfile?.branch || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">
                      {app.student?.cgpa ?? app.studentProfile?.cgpa ?? '—'}
                    </td>
                    <td className="py-3 px-4">
                      {app.isExternalSelfReported ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          External
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          Internal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const st = app.personalStatus || app.status || 'submitted';
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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
                              ? isCompetition
                                ? 'Winner / Finalist'
                                : 'Selected (Final Offer)'
                              : st === 'shortlisted'
                              ? isCompetition
                                ? 'Qualified (Next Phase)'
                                : 'Shortlisted (Next Round)'
                              : st === 'rejected'
                              ? isCompetition
                                ? 'Eliminated'
                                : 'Rejected (Drop)'
                              : st === 'submitted'
                              ? isCompetition
                                ? 'Registered'
                                : 'Submitted'
                              : st}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleUpdateApplicantStatus(app._id, 'shortlisted')}
                          title={isCompetition ? 'Qualify for next phase' : 'Eligible for next round'}
                          className="px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-300 text-[10px] font-semibold transition-colors"
                        >
                          {isCompetition ? 'Advance (Next Phase)' : 'Shortlist (Next Round)'}
                        </button>
                        <button
                          onClick={() => handleUpdateApplicantStatus(app._id, 'selected')}
                          title={isCompetition ? 'Declare as winner or finalist' : 'Final offer at end of drive'}
                          className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-colors"
                        >
                          {isCompetition ? 'Declare Winner' : 'Select (Final Offer)'}
                        </button>
                        <button
                          onClick={() => handleUpdateApplicantStatus(app._id, 'rejected')}
                          title={isCompetition ? 'Eliminated from competition' : 'Not eligible for this drive further'}
                          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-semibold transition-colors"
                        >
                          {isCompetition ? 'Eliminate' : 'Reject (Drop)'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
