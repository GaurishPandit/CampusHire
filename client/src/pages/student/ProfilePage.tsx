import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  ShieldCheck,
  FileText,
  Phone,
  Code,
  Heart,
  Save,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { studentApi } from '@/api';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    phoneNumber: '',
    resumeUrl: '',
    skills: '',
    interests: '',
    linkedinUrl: '',
    githubUrl: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        phoneNumber: profile.phoneNumber || '',
        resumeUrl: profile.resumeUrl || '',
        skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || '',
        interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : profile.interests || '',
        linkedinUrl: profile.linkedinUrl || '',
        githubUrl: profile.githubUrl || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const interestsArray = formData.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await studentApi.updateMyProfile({
        phoneNumber: formData.phoneNumber,
        resumeUrl: formData.resumeUrl,
        skills: skillsArray,
        interests: interestsArray,
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
      });

      toast.success('Profile details updated successfully');
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Student Profile</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          View your verified college academic credentials and maintain your editable placement profile.
        </p>
      </div>

      {/* Verified Academic Card (Read-Only) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Verified Academic Record</h2>
              <p className="text-xs text-slate-400">
                Official records managed and verified by the college placement administration
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock className="w-3.5 h-3.5" />
            Locked & Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Full Name</span>
            <p className="text-sm font-bold text-white mt-1">{profile?.name || user?.name || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">College Email</span>
            <p className="text-sm font-bold text-white mt-1 truncate">{user?.email || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Roll Number</span>
            <p className="text-sm font-bold text-white mt-1">{profile?.rollNumber || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Branch / Department</span>
            <p className="text-sm font-bold text-white mt-1">{profile?.branch || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Graduation Year</span>
            <p className="text-sm font-bold text-white mt-1">{profile?.graduationYear || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Verified CGPA</span>
            <p className="text-sm font-bold text-emerald-400 mt-1">{profile?.cgpa || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Active Backlogs</span>
            <p className="text-sm font-bold text-white mt-1">{profile?.activeBacklogs ?? 0}</p>
          </div>

          {profile?.academicVerifiedAt && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase text-slate-400">Verification Timestamp</span>
              <p className="text-xs text-slate-300 mt-1">
                Verified on {new Date(profile.academicVerifiedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 italic">
          If any of your academic records are inaccurate, please submit an amendment request with your department coordinator.
        </p>
      </div>

      {/* Editable Student Profile Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Editable Profile Details</h2>
          <p className="text-xs text-slate-400">
            Provide your contact details, skills, and portfolio links for campus recruiters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contact Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resume Link (Google Drive / Cloud Storage)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.resumeUrl}
                onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Key Skills (Comma separated)
            </label>
            <div className="relative">
              <Code className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                rows={2}
                placeholder="Python, React, Node.js, Machine Learning, SQL, Git..."
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Areas of Interest (Comma separated)
            </label>
            <div className="relative">
              <Heart className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                rows={2}
                placeholder="Distributed Systems, Cloud Computing, Full-stack Web Development..."
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              GitHub Profile URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/username"
              value={formData.githubUrl}
              onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
