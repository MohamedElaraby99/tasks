import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Building2, ClipboardList, Bell,  
  LogOut, Menu, X, ChevronDown, Calendar, Sun, Moon, Globe, Settings, Wifi,
  CheckCircle, AlertCircle, Info, AlertTriangle
} from 'lucide-react';
import { User } from '../types';
import { notificationsAPI } from '../lib/api';
import { TasksView } from './TasksView';
import { UsersManagement } from './UsersManagement';
import { DepartmentsManagement } from './DepartmentsManagement';
import { StatsOverview } from './StatsOverview';
import { NotificationsPanel } from './NotificationsPanel';
import { SettingsPanel } from './SettingsPanel';
import { DailyLogView } from './DailyLogView';

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

// Global toast state
let globalToasts: Toast[] = [];
let toastListeners: Array<(toasts: Toast[]) => void> = [];

const notifyToastListeners = () => {
  toastListeners.forEach(listener => listener([...globalToasts]));
};

export const addToast = (message: string, type: ToastType = 'success') => {
  const toast: Toast = {
    id: Math.random().toString(36).substr(2, 9),
    message,
    type,
    createdAt: Date.now(),
  };
  globalToasts = [...globalToasts, toast];
  notifyToastListeners();
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(toast.id);
  }, 5000);
};

export const removeToast = (id: string) => {
  globalToasts = globalToasts.filter(t => t.id !== id);
  notifyToastListeners();
};

const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);
  
  return { toasts };
};

// Toast Icon Component
const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 text-blue-400" />;
  }
};

// Toast Container Component
const ToastContainer = () => {
  const { toasts } = useToasts();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-xl shadow-lg backdrop-blur-xl border animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500/20 border-green-500/30' :
            toast.type === 'error' ? 'bg-red-500/20 border-red-500/30' :
            toast.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/30' :
            'bg-blue-500/20 border-blue-500/30'
          }`}
        >
          <ToastIcon type={toast.type} />
          <p className="text-white text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

interface DashboardProps {
  user: User;
  store: ReturnType<typeof import('../store/useStore').useStore>;
  refetch?: () => Promise<void>;
}

type ActiveView = 'overview' | 'tasks' | 'daily_log' | 'users' | 'departments' | 'settings';

export function Dashboard({ user, store, refetch }: DashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const [, setOnlineUsers] = useState<string[]>([user.id]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simulate online status (in real app, use WebSocket)
  useEffect(() => {
    // Mark current user as online
    const updateOnlineStatus = () => {
      const storedOnline = localStorage.getItem('online_users');
      const online = storedOnline ? JSON.parse(storedOnline) : [];
      if (!online.includes(user.id)) {
        online.push(user.id);
        localStorage.setItem('online_users', JSON.stringify(online));
      }
      setOnlineUsers(online);
    };
    updateOnlineStatus();
    
    // Clean up on logout
    return () => {
      const storedOnline = localStorage.getItem('online_users');
      const online = storedOnline ? JSON.parse(storedOnline) : [];
      const filtered = online.filter((id: string) => id !== user.id);
      localStorage.setItem('online_users', JSON.stringify(filtered));
    };
  }, [user.id]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isRTL = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      admin: { ar: 'مدير النظام', en: 'System Admin' },
      ceo: { ar: 'المدير التنفيذي', en: 'CEO' },
      manager: { ar: 'مدير قسم', en: 'Department Manager' },
      team_leader: { ar: 'قائد فريق', en: 'Team Leader' },
      employee: { ar: 'موظف', en: 'Employee' },
    };
    return labels[role]?.[store.settings.language] || role;
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

  const menuItems = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: LayoutDashboard, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
    { id: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', icon: ClipboardList, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
    { id: 'daily_log', labelAr: 'سجل العمل اليومي', labelEn: 'Daily Work Log', icon: Calendar, roles: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
    { id: 'users', labelAr: 'المستخدمين', labelEn: 'Users', icon: Users, roles: ['admin', 'ceo'] },
    { id: 'departments', labelAr: 'الأقسام', labelEn: 'Departments', icon: Building2, roles: ['admin', 'ceo'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));
  const unreadCount = store.getUnreadNotificationsCount();

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <StatsOverview store={store} user={user} />;
      case 'tasks':
        return <TasksView store={store} user={user} refetch={refetch} />;
      case 'daily_log':
        return <DailyLogView store={store} user={user} refetch={refetch} />;
      case 'users':
        return <UsersManagement store={store} user={user} refetch={refetch} />;
      case 'departments':
        return <DepartmentsManagement store={store} refetch={refetch} />;
      case 'settings':
        return <SettingsPanel store={store} />;
      default:
        return <StatsOverview store={store} user={user} />;
    }
  };

  const bgClass = isDark 
    ? 'bg-gradient-to-br from-[#0C2442] via-[#003A5E]/80 to-[#0C2442]' 
    : 'bg-gradient-to-br from-gray-100 via-white to-gray-100';

  const sidebarBg = isDark ? 'bg-white/5' : 'bg-white/80';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className={`h-full backdrop-blur-xl ${sidebarBg} ${isRTL ? 'border-l' : 'border-r'} ${borderColor}`}>
          {/* Header */}
          <div className={`p-4 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003A5E] to-[#0C2442] flex items-center justify-center shadow-lg">
                <span className="text-[#FFAE1F] text-xl font-bold">TM</span>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className={`${textColor} font-bold text-lg`}>
                    {isRTL ? 'إدارة المهام' : 'Task Manager'}
                  </h1>
                  <p className={`${textMuted} text-xs`}>{getRoleLabel(user.role)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Menu */}
          <nav className="p-4 space-y-2">
            {filteredMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-[#FFAE1F]/30 to-[#003A5E]/50 text-white shadow-lg border border-[#FFAE1F]/30'
                    : `${textMuted} hover:bg-white/5 hover:text-white`
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span>{store.settings.language === 'ar' ? item.labelAr : item.labelEn}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom section */}
          <div className={`absolute bottom-0 ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} p-4 border-t ${borderColor}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl ${textMuted} hover:bg-white/5 hover:text-white transition`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {sidebarOpen && <span>{store.settings.language === 'ar' ? 'تصغير القائمة' : 'Collapse'}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? (isRTL ? 'mr-64' : 'ml-64') : (isRTL ? 'mr-20' : 'ml-20')}`}>
        {/* Top bar */}
        <header className={`sticky top-0 z-30 backdrop-blur-xl ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} border-b ${borderColor}`}>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {filteredMenuItems.find(i => i.id === activeView)?.[store.settings.language === 'ar' ? 'labelAr' : 'labelEn'] || 
                  (store.settings.language === 'ar' ? 'نظرة عامة' : 'Overview')}
              </h2>
              <p className={`${textMuted} text-sm`}>
                {new Date().toLocaleDateString(store.settings.language === 'ar' ? 'ar-EG' : 'en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
              <p className={`${textMuted} text-xs font-mono`}>
                {currentTime.toLocaleTimeString(store.settings.language === 'ar' ? 'ar-EG' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Theme Toggle */}
              <button 
                onClick={() => store.setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-xl ${textMuted} hover:bg-white/5 hover:text-white transition`}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Quick Language Toggle */}
              <button 
                onClick={() => store.setLanguage(store.settings.language === 'ar' ? 'en' : 'ar')}
                className={`p-2 rounded-xl ${textMuted} hover:bg-white/5 hover:text-white transition`}
                title={store.settings.language === 'ar' ? 'English' : 'العربية'}
              >
                <Globe className="w-5 h-5" />
              </button>

              {/* Notifications - Popup */}
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

                {/* Notifications Popup */}
                {showNotificationsPopup && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-96 max-h-[500px] overflow-y-auto backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl shadow-2xl border ${borderColor} z-50`}>
                    <div className={`sticky top-0 p-4 border-b ${borderColor} ${isDark ? 'bg-slate-800/95' : 'bg-white'} flex items-center justify-between`}>
                      <h3 className={`font-bold ${textColor}`}>
                        {store.settings.language === 'ar' ? 'الإشعارات' : 'Notifications'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => {
                              if (refetch) {
                                notificationsAPI.markAllAsRead().then(() => refetch()).catch(() => {});
                              } else {
                                store.markAllNotificationsRead();
                              }
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300"
                          >
                            {store.settings.language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotificationsPopup(false)}
                          className={`p-1 rounded-lg ${textMuted} hover:bg-white/10`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <NotificationsPanel store={store} isPopup refetch={refetch} />
                  </div>
                )}
              </div>

              {/* User menu */}
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
                  <div className={`absolute ${isRTL ? 'left-0 right-auto' : 'right-0 left-auto'} mt-2 w-64 backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-xl shadow-2xl border ${borderColor} overflow-hidden z-50`}>
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
                      {/* Settings Button */}
                      {['admin', 'ceo', 'manager'].includes(user.role) && (
                        <button
                          onClick={() => { setActiveView('settings'); setShowUserMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${textMuted} hover:bg-white/5 transition`}
                        >
                          <Settings className="w-4 h-4 text-purple-400" />
                          <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
                        </button>
                      )}
                      {/* Logout Button */}
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

        {/* Page content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      {/* Click outside to close popups */}
      {(showNotificationsPopup || showUserMenu) && (
        <div 
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowNotificationsPopup(false);
            setShowUserMenu(false);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
