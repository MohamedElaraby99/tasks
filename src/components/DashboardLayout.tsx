import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Calendar,
  Sun,
  Moon,
  Globe,
  Settings,
  Wifi,
} from 'lucide-react';
import { User } from '../types';
import { cn } from '../utils/cn';
import { notificationsAPI } from '../lib/api';
import { NotificationsPanel } from './NotificationsPanel';
import { ToastContainer } from './toast';
import type { useStore } from '../store/useStore';

export interface DashboardLayoutContext {
  user: User;
  store: ReturnType<typeof useStore>;
  refetch?: () => Promise<void>;
}

interface DashboardLayoutProps {
  user: User;
  store: ReturnType<typeof useStore>;
  refetch?: () => Promise<void>;
}

const menuItems = [
  { path: '/dashboard', id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: LayoutDashboard, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
  { path: '/tasks', id: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', icon: ClipboardList, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
  { path: '/daily-log', id: 'daily_log', labelAr: 'سجل العمل اليومي', labelEn: 'Daily Work Log', icon: Calendar, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
  { path: '/users', id: 'users', labelAr: 'المستخدمين', labelEn: 'Users', icon: Users, roles: ['admin', 'ceo'] },
  { path: '/departments', id: 'departments', labelAr: 'الأقسام', labelEn: 'Departments', icon: Building2, roles: ['admin', 'ceo'] },
];

const pathToTitle: Record<string, { ar: string; en: string }> = {
  '/dashboard': { ar: 'نظرة عامة', en: 'Overview' },
  '/tasks': { ar: 'المهام', en: 'Tasks' },
  '/daily-log': { ar: 'سجل العمل اليومي', en: 'Daily Work Log' },
  '/users': { ar: 'المستخدمين', en: 'Users' },
  '/departments': { ar: 'الأقسام', en: 'Departments' },
  '/settings': { ar: 'الإعدادات', en: 'Settings' },
};

export function DashboardLayout({ user, store, refetch }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const location = useLocation();

  const isRTL = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';
  const lang = store.settings.language;
  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user.role));
  const unreadCount = store.getUnreadNotificationsCount();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return () => document.documentElement.removeAttribute('data-theme');
  }, [isDark]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      admin: { ar: 'مدير النظام', en: 'System Admin' },
      ceo: { ar: 'المدير التنفيذي', en: 'CEO' },
      manager: { ar: 'مدير قسم', en: 'Department Manager' },
      team_leader: { ar: 'قائد فريق', en: 'Team Leader' },
      employee: { ar: 'موظف', en: 'Employee' },
    };
    return labels[role]?.[lang] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'from-red-500 to-rose-600',
      ceo: 'from-purple-500 to-pink-500',
      manager: 'from-blue-500 to-cyan-500',
      team_leader: 'from-orange-500 to-amber-500',
      employee: 'from-green-500 to-emerald-500',
    };
    return colors[role] || 'from-gray-500 to-gray-600';
  };

  const pathname = location.pathname;
  const pageTitle = pathToTitle[pathname]?.[lang] ?? (lang === 'ar' ? 'نظرة عامة' : 'Overview');

  const bgClass = isDark
    ? 'bg-gradient-to-br from-[#0C2442] via-[#003A5E]/80 to-[#0C2442]'
    : 'bg-gradient-to-br from-gray-100 via-white to-gray-100';
  const sidebarBg = isDark ? 'bg-white/5' : 'bg-white/80';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';

  const closeSidebar = () => isMobile && setSidebarOpen(false);

  return (
    <div className={`min-h-screen ${bgClass}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile overlay when sidebar open */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full z-40 transition-all duration-300 ease-out
          ${isMobile ? (sidebarOpen ? 'w-64 translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')) : (sidebarOpen ? 'w-64' : 'w-20')}`}
      >
        <div className={`h-full backdrop-blur-xl ${sidebarBg} ${isRTL ? 'border-l' : 'border-r'} ${borderColor}`}>
          <div className={`p-4 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003A5E] to-[#0C2442] flex items-center justify-center shadow-lg">
                <span className="text-[#FFAE1F] text-xl font-bold">TM</span>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className={`${textColor} font-bold text-lg`}>{isRTL ? 'إدارة المهام' : 'Task Manager'}</h1>
                  <p className={`${textMuted} text-xs`}>{getRoleLabel(user.role)}</p>
                </div>
              )}
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {filteredMenuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FFAE1F]/30 to-[#003A5E]/50 text-white shadow-lg border border-[#FFAE1F]/30'
                      : `${textMuted} hover:bg-white/5 hover:text-white`
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(sidebarOpen || isMobile) && <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>}
              </NavLink>
            ))}
          </nav>

          <div className={`absolute bottom-0 ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} p-4 border-t ${borderColor}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl ${textMuted} hover:bg-white/5 hover:text-white transition`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {sidebarOpen && <span>{lang === 'ar' ? 'تصغير القائمة' : 'Collapse'}</span>}
            </button>
          </div>
        </div>
      </aside>

      <main
        className={cn(
          'min-w-0 transition-all duration-300',
          !isRTL && 'ml-0',
          isRTL && 'mr-0',
          !isRTL && sidebarOpen && 'md:ml-64',
          !isRTL && !sidebarOpen && 'md:ml-20',
          isRTL && sidebarOpen && 'md:mr-64',
          isRTL && !sidebarOpen && 'md:mr-20'
        )}
      >
        <header className={cn('sticky top-0 z-30 backdrop-blur-xl border-b', isDark ? 'bg-slate-900/80' : 'bg-white/80', borderColor)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={cn(
                  'p-2 rounded-xl shrink-0 md:hidden',
                  textMuted,
                  'hover:bg-white/5 hover:text-white transition'
                )}
                aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h2 className={cn('font-bold truncate', 'text-base sm:text-xl', textColor)}>{pageTitle}</h2>
                <p className={cn('text-xs sm:text-sm truncate', textMuted)}>
                  {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                    weekday: isMobile ? 'short' : 'long',
                    year: 'numeric',
                    month: isMobile ? 'short' : 'long',
                    day: 'numeric',
                  })}
                </p>
                {!isMobile && (
                  <p className={cn('text-xs font-mono', textMuted)}>
                    {currentTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => store.setTheme(isDark ? 'light' : 'dark')}
                className={cn('p-2 rounded-xl transition', textMuted, 'hover:bg-white/5 hover:text-white')}
                title={isDark ? (lang === 'ar' ? 'وضع النهار' : 'Morning / Light') : (lang === 'ar' ? 'وضع الليل' : 'Night / Dark')}
                aria-label={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => store.setLanguage(lang === 'ar' ? 'en' : 'ar')}
                className={cn('p-2 rounded-xl transition', textMuted, 'hover:bg-white/5 hover:text-white')}
                title={lang === 'ar' ? 'English' : 'العربية'}
                aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              >
                <Globe className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotificationsPopup(!showNotificationsPopup)}
                  className={`relative p-2 rounded-xl ${textMuted} hover:bg-white/5 hover:text-white transition`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center notification-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotificationsPopup && (
                  <div
                    className={cn(
                      'absolute mt-2 max-h-[70vh] sm:max-h-[500px] overflow-y-auto backdrop-blur-xl rounded-2xl shadow-2xl border z-50',
                      isRTL ? 'left-0 right-auto' : 'right-0 left-auto',
                      'w-[calc(100vw-2rem)] max-w-96',
                      isDark ? 'bg-slate-800/95' : 'bg-white',
                      borderColor
                    )}
                  >
                    <div className={`sticky top-0 p-4 border-b ${borderColor} ${isDark ? 'bg-slate-800/95' : 'bg-white'} flex items-center justify-between`}>
                      <h3 className={`font-bold ${textColor}`}>{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => {
                              notificationsAPI.markAllAsRead().then(() => refetch?.()).catch(() => {});
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300"
                          >
                            {lang === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                          </button>
                        )}
                        <button onClick={() => setShowNotificationsPopup(false)} className={`p-1 rounded-lg ${textMuted} hover:bg-white/10`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <NotificationsPanel store={store} isPopup refetch={refetch} />
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className={`${isRTL ? 'text-right' : 'text-left'} hidden md:block`}>
                    <p className={`${textColor} font-medium text-sm`}>{user.name}</p>
                    <p className={`${textMuted} text-xs`}>{getRoleLabel(user.role)}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 ${textMuted}`} />
                </button>

                {showUserMenu && (
                  <div
                    className={cn(
                      'absolute mt-2 w-64 max-w-[calc(100vw-2rem)] backdrop-blur-xl rounded-xl shadow-2xl border overflow-hidden z-50',
                      isRTL ? 'left-0 right-auto' : 'right-0 left-auto',
                      isDark ? 'bg-slate-800/95' : 'bg-white',
                      borderColor
                    )}
                  >
                    <div className={`p-4 border-b ${borderColor}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold text-lg`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`${textColor} font-medium`}>{user.name}</p>
                          <p className={`${textMuted} text-sm`}>@{user.username}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Wifi className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs">{isRTL ? 'متصل' : 'Online'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      {['admin', 'ceo', 'manager'].includes(user.role) && (
                        <NavLink
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${textMuted} hover:bg-white/5 transition`}
                        >
                          <Settings className="w-4 h-4 text-purple-400" />
                          <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
                        </NavLink>
                      )}
                      <button
                        onClick={store.logout}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 overflow-x-auto">
          <Outlet context={{ user, store, refetch } satisfies DashboardLayoutContext} />
        </div>
      </main>

      {(showNotificationsPopup || showUserMenu) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowNotificationsPopup(false);
            setShowUserMenu(false);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}
