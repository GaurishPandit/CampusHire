import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loggedUser: any = await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!');
      if (loggedUser?.role === 'student') {
        const dest = from && !from.startsWith('/admin') ? from : '/';
        navigate(dest, { replace: true });
      } else {
        const dest = from && from.startsWith('/admin') ? from : '/admin';
        navigate(dest, { replace: true });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'rgb(15 23 42)' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(135deg, rgb(30 41 59), rgb(15 23 42))' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(59 130 246), rgb(20 184 166))' }}>
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">CampusHire</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Your campus placement journey,{' '}
            <span style={{ background: 'linear-gradient(135deg, rgb(96 165 250), rgb(45 212 191))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              simplified
            </span>
          </h2>
          <p className="text-lg" style={{ color: 'rgb(148 163 184)' }}>
            Discover eligible opportunities, track your applications, and stay updated on recruitment progress — all in one place.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Opportunities', value: '24+' },
              { label: 'Companies', value: '18+' },
              { label: 'Students Placed', value: '340+' },
              { label: 'Avg. Package', value: '₹8.5L' },
            ].map((stat) => (
              <div key={stat.label} className="card-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgb(148 163 184)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm" style={{ color: 'rgb(100 116 139)' }}>
          © 2026 CampusHire. Built for colleges, by engineers.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(59 130 246), rgb(20 184 166))' }}>
              <GraduationCap size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">CampusHire</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to your account</h1>
            <p className="text-sm" style={{ color: 'rgb(148 163 184)' }}>
              Enter your college email and password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg border" style={{ background: 'rgb(239 68 68 / 0.1)', borderColor: 'rgb(239 68 68 / 0.3)' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148 163 184)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@college.edu.in"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs" style={{ color: 'rgb(96 165 250)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148 163 184)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgb(148 163 184)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn btn-primary w-full"
              style={{ height: '2.75rem' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgb(30 41 59)', border: '1px solid rgb(71 85 105 / 0.4)' }}>
            <p className="text-xs font-medium mb-3" style={{ color: 'rgb(148 163 184)' }}>Demo accounts</p>
            <div className="space-y-1.5">
              {[
                { role: 'Placement Admin', email: 'admin@demo.edu.in', pass: 'Admin@12345' },
                { role: 'Student (eligible)', email: 'alice@demo.edu.in', pass: 'Student@12345' },
                { role: 'Student (ineligible)', email: 'dave@demo.edu.in', pass: 'Student@12345' },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                  className="w-full text-left px-3 py-2 rounded text-xs transition-colors"
                  style={{ background: 'rgb(15 23 42)', color: 'rgb(148 163 184)' }}
                >
                  <span className="font-medium text-white">{d.role}</span> — {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
