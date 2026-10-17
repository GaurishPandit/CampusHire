import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FileText, BarChart3, Users,
  Settings, LogOut, Menu, X, GraduationCap, ChevronRight,
  Bell, Search, Shield, User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notificationApi } from '@/api';
import toast from 'react-hot-toast';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.list();
      const data = res.data?.data || res.data;
      if (data?.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(
          data.unreadCount ??
            data.notifications.filter((n: NotificationItem) => !n.isRead).length
        );
      }
    } catch {
      // background polling fails silently
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 25000);
      return () => clearInterval(timer);
    }
  }, [user, fetchNotifications]);

  // Close notifications dropdown when clicking anywhere else on screen or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  const handleNotificationClick = async (n: NotificationItem) => {
    setNotificationsOpen(false);
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationApi.markRead(n._id);
      } catch {
        // silent
      }
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      // silent
    }
  };

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
          className="h-16 flex items-center gap-4 px-6 border-b flex-shrink-0 relative z-40"
          style={{ borderColor: 'rgb(71 85 105 / 0.4)', background: 'rgb(15 23 42 / 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden ring-1 ring-white/10 animate-fadeIn"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
              >
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                >
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-blue-400" />
                    <h4 className="text-xs font-bold text-white tracking-wide">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div
                  className="max-h-84 overflow-y-auto divide-y"
                  style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                >
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={24} className="mx-auto text-slate-500 mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-slate-300">No notifications yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Updates on drives, competitions, applications, and results will appear here.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isComp =
                        n.title?.toLowerCase().includes('hackathon') ||
                        n.title?.toLowerCase().includes('competition') ||
                        n.title?.toLowerCase().includes('contest') ||
                        n.title?.toLowerCase().includes('winner') ||
                        n.title?.includes('🏆');
                      return (
                        <button
                          key={n._id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left p-3.5 block transition-colors group cursor-pointer ${
                            !n.isRead ? 'bg-slate-800/80 hover:bg-slate-700/80' : 'hover:bg-slate-800/40'
                          }`}
                          style={{ borderColor: 'rgb(51 65 85 / 0.5)' }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1 flex items-center justify-center shrink-0">
                              {!n.isRead ? (
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ring-2 shrink-0 group-hover:scale-125 transition-transform ${
                                    isComp ? 'bg-amber-400 ring-amber-500/30' : 'bg-blue-400 ring-blue-500/30'
                                  }`}
                                />
                              ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                  {formatRelativeTime(n.createdAt)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
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
