import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Briefcase,
  Calendar,
  Save,
  DollarSign,
  MapPin,
  ExternalLink,
  ShieldCheck,
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
    type: 'placement',
    workMode: 'on-site',
    location: '',
    ctcOrStipend: '',
    applicationMode: 'internal',
    externalUrl: '',
    deadline: '',
    minCgpa: 0,
    maxBacklogs: 0,
    eligibleBranches: 'CSE, ECE, IT, MECH',
    eligibleGraduationYears: '2025, 2026',
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
          type: opp.type || 'placement',
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
            ? opp.eligibleGraduationYears.join(', ')
            : opp.eligibleGraduationYears || '',
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
        .map((y) => Number(y.trim()))
        .filter((y) => !isNaN(y));

      const payload: any = {
        companyName: formData.companyName.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || `${formData.title} role at ${formData.companyName}`,
        opportunityType: formData.type === 'placement' ? 'full_time' : formData.type,
        type: formData.type === 'placement' ? 'full_time' : formData.type,
        workMode: formData.workMode === 'on-site' ? 'on_site' : formData.workMode,
        location: formData.location.trim(),
        ctcOrStipend: formData.ctcOrStipend.trim(),
        applicationMode: formData.applicationMode,
        externalApplicationUrl: formData.externalUrl.trim(),
        externalUrl: formData.externalUrl.trim(),
        applicationDeadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
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
            {isEditing ? 'Edit Opportunity' : 'Create New Opportunity'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure company information, role details, and server-enforced eligibility boundaries.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-8">
        {/* Basic Role & Company Details */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            Company & Role Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Company Name *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Microsoft, Adobe"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Opportunity Title *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Development Engineer - I"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Opportunity Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="placement">Full-time Placement</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Mode
              </label>
              <select
                value={formData.workMode}
                onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="on-site">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Bengaluru / Hyderabad / Pan-India"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                CTC / Stipend Package
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. 18 LPA or 45,000 / month"
                  value={formData.ctcOrStipend}
                  onChange={(e) => setFormData({ ...formData, ctcOrStipend: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Role Description & Requirements
              </label>
              <textarea
                rows={4}
                placeholder="Outline responsibilities, qualifications, and recruitment overview..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Application Mode & Deadlines */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            Application Mode & Deadline
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Application Mode
              </label>
              <select
                value={formData.applicationMode}
                onChange={(e) => setFormData({ ...formData, applicationMode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="internal">Campus Internal Application</option>
                <option value="external">External Company Link</option>
              </select>
            </div>

            {formData.applicationMode === 'external' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  External Application URL *
                </label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://company.careers/job/123"
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Application Deadline *
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

        {/* Deterministic Eligibility Engine Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Eligibility Engine Configuration
            </h2>
          </div>

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
                Maximum Permitted Active Backlogs
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Update Opportunity' : 'Create Opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
}
