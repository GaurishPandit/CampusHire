import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Briefcase,
  Calendar,
  Save,
  IndianRupee,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Trophy,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opportunityApi } from '@/api';

export default function OpportunityFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    companyName: '',
    title: '',
    description: '',
    type: 'full_time',
    workMode: 'on-site',
    location: '',
    ctcOrStipend: '',
    applicationMode: 'internal',
    externalUrl: '',
    deadline: '',
    minCgpa: 0,
    maxBacklogs: 0,
    eligibleBranches: 'CSE, ECE, IT, MECH',
    eligibleGraduationYears: '',
    status: 'draft',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadOpportunity(id);
    }
  }, [id, isEditing]);

  const loadOpportunity = async (oppId: string) => {
    try {
      setLoading(true);
      const res = await opportunityApi.getById(oppId);
      if (res.data?.data) {
        const opp = res.data.data;
        setFormData({
          companyName: opp.companyName || '',
          title: opp.title || '',
          description: opp.description || '',
          type: opp.type || opp.opportunityType || 'full_time',
          workMode: opp.workMode || 'on-site',
          location: opp.location || '',
          ctcOrStipend: opp.ctcOrStipend || '',
          applicationMode: opp.applicationMode || 'internal',
          externalUrl: opp.externalUrl || '',
          deadline: opp.deadline ? new Date(opp.deadline).toISOString().slice(0, 16) : '',
          minCgpa: opp.minCgpa ?? 0,
          maxBacklogs: opp.maxBacklogs ?? 0,
          eligibleBranches: Array.isArray(opp.eligibleBranches)
            ? opp.eligibleBranches.join(', ')
            : opp.eligibleBranches || '',
          eligibleGraduationYears: Array.isArray(opp.eligibleGraduationYears)
            ? opp.eligibleGraduationYears.filter((y: any) => Boolean(y) && Number(y) > 0).join(', ')
            : (opp.eligibleGraduationYears && opp.eligibleGraduationYears !== '0' ? String(opp.eligibleGraduationYears) : ''),
          status: opp.status || 'draft',
        });
      }
    } catch (err) {
      toast.error('Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.title || !formData.deadline) {
      toast.error('Please fill all mandatory fields (Company, Title, Deadline)');
      return;
    }

    try {
      setSaving(true);
      const branches = formData.eligibleBranches
        .split(',')
        .map((b) => b.trim().toUpperCase())
        .filter(Boolean);
      const years = formData.eligibleGraduationYears
        .split(',')
        .map((y) => y.trim())
        .filter(Boolean)
        .map((y) => Number(y))
        .filter((y) => !isNaN(y) && y > 0);

      let deadlineIso: string | undefined = undefined;
      if (formData.deadline) {
        const rawDate = formData.deadline.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          deadlineIso = new Date(`${rawDate}T23:59:59.999Z`).toISOString();
        } else {
          const d = new Date(rawDate);
          deadlineIso = !isNaN(d.getTime()) ? d.toISOString() : undefined;
        }
      }

      const payload: any = {
        companyName: formData.companyName.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || `${formData.title} role at ${formData.companyName}`,
        opportunityType: formData.type,
        type: formData.type,
        workMode: formData.workMode === 'on-site' ? 'on_site' : formData.workMode,
        location: formData.location.trim(),
        ctcOrStipend: formData.ctcOrStipend.trim(),
        applicationMode: formData.applicationMode,
        externalApplicationUrl: formData.externalUrl.trim(),
        externalUrl: formData.externalUrl.trim(),
        applicationDeadline: deadlineIso,
        deadline: deadlineIso,
        status: formData.status || 'draft',
        minCgpa: Number(formData.minCgpa) || 0,
        maxBacklogs: Number(formData.maxBacklogs) || 0,
        eligibleBranches: branches,
        eligibleGraduationYears: years,
        eligibilityCriteria: {
          minCgpa: Number(formData.minCgpa) || 0,
          maxActiveBacklogs: Number(formData.maxBacklogs) || 0,
          eligibleBranches: branches,
          eligibleGraduationYears: years,
        },
      };

      if (isEditing && id) {
        await opportunityApi.update(id, payload);
        toast.success('Opportunity updated successfully');
      } else {
        await opportunityApi.create(payload);
        toast.success('Opportunity created successfully');
      }
      navigate('/admin/opportunities');
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Operation failed';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const details = err.response.data.errors
          .map((e: any) => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join('; ');
        if (details) msg = `${msg}: ${details}`;
      }
      toast.error(msg, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading opportunity details...</div>;
  }

  const isCompetition = formData.type === 'hackathon' || formData.type === 'coding_competition';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isEditing
              ? isCompetition
                ? formData.type === 'hackathon'
                  ? 'Edit Hackathon'
                  : 'Edit Coding Competition'
                : 'Edit Opportunity'
              : isCompetition
              ? formData.type === 'hackathon'
                ? 'Create Hackathon'
                : 'Create Coding Competition'
              : 'Create New Opportunity'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isCompetition
              ? 'Configure event themes, prize pool, registration modes, and guidelines.'
              : 'Configure company information, role details, and server-enforced eligibility boundaries.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-8">
        {/* Opportunity Type Selector (Top) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {isCompetition ? (
              <Trophy className="w-4 h-4 text-violet-400" />
            ) : (
              <Briefcase className="w-4 h-4 text-indigo-400" />
            )}
            <h2 className="text-base font-bold text-white">
              {isCompetition ? 'Event & Organizer Details' : 'Company & Role Details'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Opportunity Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="full_time">💼 Full-time Placement</option>
                <option value="internship">🎓 Internship</option>
                <option value="hackathon">⚡ Hackathon</option>
                <option value="coding_competition">🏆 Coding Competition</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Host / Organizing Entity / Sponsor *' : 'Company Name *'}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder={
                    isCompetition
                      ? 'e.g. Google Cloud, Major League Hacking, ACM Chapter'
                      : 'e.g. Google, Microsoft, Adobe'
                  }
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition
                  ? formData.type === 'hackathon'
                    ? 'Hackathon Name / Theme *'
                    : 'Competition Title *'
                  : 'Opportunity Title *'}
              </label>
              <div className="relative">
                {isCompetition ? (
                  <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                ) : (
                  <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                )}
                <input
                  type="text"
                  required
                  placeholder={
                    isCompetition
                      ? formData.type === 'hackathon'
                        ? 'e.g. National Smart AI Hackathon 2026'
                        : 'e.g. CodeCraft Annual Algorithmic Cup'
                      : 'e.g. Software Development Engineer - I'
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Event Format' : 'Work Mode'}
              </label>
              <select
                value={formData.workMode}
                onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="on-site">
                  {isCompetition ? 'In-Person / On-Campus' : 'On-site'}
                </option>
                <option value="remote">
                  {isCompetition ? 'Online / Virtual' : 'Remote'}
                </option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Venue / Platform' : 'Location'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={
                    isCompetition
                      ? 'e.g. Campus Auditorium / HackerEarth / Unstop'
                      : 'e.g. Bengaluru / Hyderabad / Pan-India'
                  }
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Prize Pool & Rewards (Cash, Swag, PPO)' : 'CTC / Stipend Package'}
              </label>
              <div className="relative">
                {isCompetition ? (
                  <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                ) : (
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                )}
                <input
                  type="text"
                  placeholder={
                    isCompetition
                      ? 'e.g. ₹1,50,000 Cash Pool + Certificates + PPI'
                      : 'e.g. ₹18 LPA or ₹45,000 / month'
                  }
                  value={formData.ctcOrStipend}
                  onChange={(e) => setFormData({ ...formData, ctcOrStipend: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Problem Statement, Themes & Rules' : 'Role Description & Requirements'}
              </label>
              <textarea
                rows={4}
                placeholder={
                  isCompetition
                    ? 'Outline the problem themes, evaluation criteria, team size limits, and submission rules...'
                    : 'Outline responsibilities, qualifications, and recruitment overview...'
                }
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Application / Registration Mode & Deadlines */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            {isCompetition ? 'Registration Mode & Deadline' : 'Application Mode & Deadline'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Registration Mode' : 'Application Mode'}
              </label>
              <select
                value={formData.applicationMode}
                onChange={(e) => setFormData({ ...formData, applicationMode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="internal">
                  {isCompetition ? 'Direct Campus Registration' : 'Campus Internal Application'}
                </option>
                <option value="external">
                  {isCompetition ? 'External Link (Unstop / Devpost / Form)' : 'External Link (Google Form or Company Portal)'}
                </option>
              </select>
            </div>

            {formData.applicationMode === 'external' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isCompetition ? 'Official Registration Portal Link *' : 'Google Form or Company Portal Link *'}
                </label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    placeholder={
                      isCompetition
                        ? 'e.g. https://unstop.com/... or https://devpost.com/...'
                        : 'e.g. https://forms.gle/... or https://company.careers/job/123'
                    }
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Registration Deadline *' : 'Application Deadline *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="datetime-local"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="draft">Draft (Visible only to Admin)</option>
                <option value="published">Published (Live for Students)</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Eligibility Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {isCompetition
                ? 'Participant Eligibility (Optional — Open by Default)'
                : 'Eligibility Engine Configuration'}
            </h2>
          </div>
          {isCompetition && (
            <p className="text-xs text-slate-400">
              Hackathons and coding competitions are open to all students by default. Leave minimum CGPA at 0 and branches empty if participation is unrestricted.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Minimum CGPA (0 for no limit)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.minCgpa}
                onChange={(e) => setFormData({ ...formData, minCgpa: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isCompetition ? 'Maximum Allowed Backlogs (leave 0 or empty for any)' : 'Maximum Permitted Active Backlogs'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxBacklogs}
                onChange={(e) => setFormData({ ...formData, maxBacklogs: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Eligible Branches (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="CSE, ECE, IT, MECH (leave empty for all)"
                value={formData.eligibleBranches}
                onChange={(e) => setFormData({ ...formData, eligibleBranches: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Eligible Graduation Years (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="2025, 2026 (leave empty for all)"
                value={formData.eligibleGraduationYears}
                onChange={(e) => setFormData({ ...formData, eligibleGraduationYears: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            to="/admin/opportunities"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving
              ? 'Saving...'
              : isEditing
              ? isCompetition
                ? 'Update Competition'
                : 'Update Opportunity'
              : isCompetition
              ? 'Create Competition'
              : 'Create Opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
}
