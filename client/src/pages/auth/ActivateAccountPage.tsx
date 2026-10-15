import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '@/api';
import toast from 'react-hot-toast';

const requirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
];

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const meetsAll = requirements.every((r) => r.test(password));
  const passwordsMatch = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsAll || !passwordsMatch) return;
    setError('');
    setIsLoading(true);
    try {
      await authApi.activate({ token, password, confirmPassword: confirm });
      setSuccess(true);
      toast.success('Account activated!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Activation failed. The link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(15 23 42)' }}>
        <div className="card max-w-md w-full text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white mb-2">Invalid Activation Link</h1>
          <p style={{ color: 'rgb(148 163 184)' }} className="text-sm">
            This link is missing the activation token. Please use the link from your invitation email.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(15 23 42)' }}>
        <div className="card max-w-md w-full text-center fade-in">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Account Activated!</h1>
          <p style={{ color: 'rgb(148 163 184)' }} className="text-sm">
            Your account is ready. Redirecting you to the login page…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(15 23 42)' }}>
      <div className="w-full max-w-md fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(59 130 246), rgb(20 184 166))' }}>
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">CampusHire</span>
        </div>

        <div className="card">
          <h1 className="text-xl font-bold text-white mb-2">Activate your account</h1>
          <p className="text-sm mb-6" style={{ color: 'rgb(148 163 184)' }}>
            Set a password to activate your CampusHire account.
          </p>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border mb-5" style={{ background: 'rgb(239 68 68 / 0.1)', borderColor: 'rgb(239 68 68 / 0.3)' }}>
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="act-password" className="label">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148 163 184)' }} />
                <input
                  id="act-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Create a strong password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148 163 184)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5">
                      <CheckCircle size={12} className={req.test(password) ? 'text-green-400' : 'text-slate-600'} />
                      <span className="text-xs" style={{ color: req.test(password) ? 'rgb(74 222 128)' : 'rgb(100 116 139)' }}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="act-confirm" className="label">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148 163 184)' }} />
                <input
                  id="act-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`input pl-10 ${confirm && !passwordsMatch ? 'input-error' : ''}`}
                  placeholder="Repeat your password"
                  required
                />
              </div>
              {confirm && !passwordsMatch && (
                <p className="text-xs mt-1 text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !meetsAll || !passwordsMatch}
              className="btn btn-primary w-full"
              style={{ height: '2.75rem' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Activating…
                </span>
              ) : 'Activate Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
