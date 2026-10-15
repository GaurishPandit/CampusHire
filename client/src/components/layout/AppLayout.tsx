import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FileText, BarChart3, Users,
  Settings, LogOut, Menu, X, GraduationCap, ChevronRight,
  Bell, Search, Shield, User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['student'] },
  { label: 'Opportunities', href: '/opportunities', icon: <Briefcase size={18} />, roles: ['student'] },
  { label: 'My Applications', href: '/applications', icon: <FileText size={18} />, roles: ['student'] },
  { label: 'Results', href: '/results', icon: <BarChart3 size={18} />, roles: ['student'] },
  { label: 'My Profile', href: '/profile', icon: <User size={18} />, roles: ['student'] },

  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} />, roles: ['placement_admin', 'sys_admin'] },
  { label: 'Students', href: '/admin/students', icon: <Users size={18} />, roles: ['placement_admin', 'sys_admin'] },
  { label: 'Opportunities', href: '/admin/opportunities', icon: <Briefcase size={18} />, roles: ['placement_admin', 'sys_admin'] },
  { label: 'Results', href: '/admin/results', icon: <BarChart3 size={18} />, roles: ['placement_admin', 'sys_admin'] },
  { label: 'Audit Logs', href: '/admin/audit', icon: <Shield size={18} />, roles: ['placement_admin', 'sys_admin'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const isStudent = user?.role === 'student';
  const notifications = isStudent
    ? [
        {
          id: '1',
          title: 'Academic Profile Verified',
          message: 'Your official CGPA and enrollment details have been verified by the placement office.',
          time: '1h ago',
          link: '/profile',
        },
        {
          id: '2',
          title: 'New Campus Opportunity',
          message: 'Microsoft and FinServ campus placement drives are open for eligible branches.',
          time: '3h ago',
          link: '/opportunities',
        },
        {
          id: '3',
          title: 'Official Selection Results',
          message: 'New selection results published by the placement cell.',
          time: '1d ago',
          link: '/results',
        },
      ]
    : [
        {
          id: '1',
          title: 'System Operational',
          message: 'CampusHire recruitment engine is active and tracking live candidate pipelines.',
          time: 'Just now',
          link: '/admin',
        },
        {
          id: '2',
          title: 'Candidate Applications',
          message: 'New student applications submitted for review across opportunities.',
          time: '2h ago',
          link: '/admin/opportunities',
        },
        {
          id: '3',
          title: 'Audit Logging Active',
          message: 'Administrative and publishing actions are being recorded to compliance audit trail.',
          time: '1d ago',
          link: '/admin/audit',
        },
      ];

  const userNavItems = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'rgb(71 85 105 / 0.4)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(59 130 246), rgb(20 184 166))' }}>
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white">CampusHire</h1>
          <p className="text-xs" style={{ color: 'rgb(148 163 184)' }}>
            {user?.role === 'student' ? 'Student Portal' : 'Admin Portal'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {userNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-blue-400' : 'group-hover:text-white transition-colors'}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t" style={{ borderColor: 'rgb(71 85 105 / 0.4)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgb(30 41 59)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, rgb(59 130 246), rgb(20 184 166))' }}>
            {(user?.name?.[0] || user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email)}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgb(148 163 184)' }}>
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md transition-colors hover:bg-red-500/20 hover:text-red-400 text-slate-500"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(15 23 42)' }}>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-width hidden lg:flex flex-col flex-shrink-0 border-r"
        style={{ background: 'rgb(15 23 42)', borderColor: 'rgb(71 85 105 / 0.4)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col border-r"
            style={{ background: 'rgb(15 23 42)', borderColor: 'rgb(71 85 105 / 0.4)' }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="h-16 flex items-center gap-4 px-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(71 85 105 / 0.4)', background: 'rgb(15 23 42 / 0.8)', backdropFilter: 'blur(8px)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn"
                style={{ background: 'rgb(15 23 42)', borderColor: 'rgb(51 65 85)' }}
              >
                <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: 'rgb(51 65 85)' }}>
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-indigo-400" />
                    <h4 className="text-xs font-bold text-white tracking-wide">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => setUnreadCount(0)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'rgb(30 41 59)' }}>
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      to={n.link || '#'}
                      onClick={() => {
                        setNotificationsOpen(false);
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                      }}
                      className="p-3.5 block hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0 group-hover:scale-125 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                            {n.time}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
