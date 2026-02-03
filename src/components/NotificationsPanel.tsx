import { 
  Bell, CheckCheck, ClipboardList, MessageCircle, 
  Clock, AlertTriangle
} from 'lucide-react';
import { Notification } from '../types';
import { notificationsAPI } from '../lib/api';

interface NotificationsPanelProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  isPopup?: boolean;
  refetch?: () => Promise<void>;
}

export function NotificationsPanel({ store, isPopup = false, refetch }: NotificationsPanelProps) {
  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const notifications = store.getMyNotifications().sort((a: Notification, b: Notification) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <ClipboardList className="w-5 h-5 text-purple-400" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'status':
        return <Clock className="w-5 h-5 text-cyan-400" />;
      case 'reminder':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return isAr ? 'الآن' : 'Just now';
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      return isAr ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    }
    const days = Math.floor(seconds / 86400);
    return isAr ? `منذ ${days} يوم` : `${days}d ago`;
  };

  // If popup, don't show the header
  if (isPopup) {
    return (
      <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.slice(0, 10).map((notif: Notification) => (
            <div
              key={notif.id}
              onClick={() => {
                if (refetch) {
                  notificationsAPI.markAsRead(notif.id).then(() => refetch()).catch(() => {});
                } else {
                  store.markNotificationRead(notif.id);
                }
              }}
              className={`rounded-xl p-3 cursor-pointer transition-all ${
                notif.read 
                  ? `${cardBg} ${borderColor}` 
                  : `${isDark ? 'bg-purple-500/10' : 'bg-purple-50'} border-purple-500/30`
              } hover:bg-white/10 border`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${notif.read ? (isDark ? 'bg-white/5' : 'bg-gray-100') : 'bg-white/10'}`}>
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`${textColor} font-medium text-sm truncate`}>{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                    )}
                  </div>
                  <p className={`${textMuted} text-xs line-clamp-2`}>{notif.message}</p>
                  <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-xs mt-1`}>
                    {getTimeAgo(notif.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Bell className={`w-10 h-10 mx-auto mb-2 ${textMuted}`} />
            <p className={textMuted}>{isAr ? 'لا توجد إشعارات' : 'No notifications'}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${textColor}`}>
            {isAr ? 'الإشعارات' : 'Notifications'}
          </h2>
          <p className={textMuted}>
            {notifications.filter((n: Notification) => !n.read).length} {isAr ? 'إشعار غير مقروء' : 'unread notifications'}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => {
              if (refetch) {
                notificationsAPI.markAllAsRead().then(() => refetch()).catch(() => {});
              } else {
                store.markAllNotificationsRead();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${cardBg} border ${borderColor} ${textMuted} hover:bg-white/10 transition`}
          >
            <CheckCheck className="w-4 h-4" />
            {isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notif: Notification) => (
          <div
            key={notif.id}
            onClick={() => {
              if (refetch) {
                notificationsAPI.markAsRead(notif.id).then(() => refetch()).catch(() => {});
              } else {
                store.markNotificationRead(notif.id);
              }
            }}
            className={`backdrop-blur-xl rounded-xl border p-4 cursor-pointer transition-all ${
              notif.read 
                ? `${cardBg} ${borderColor}` 
                : `${isDark ? 'bg-purple-500/10' : 'bg-purple-50'} border-purple-500/30`
            } hover:bg-white/10`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${notif.read ? (isDark ? 'bg-white/5' : 'bg-gray-100') : 'bg-white/10'}`}>
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`${textColor} font-medium`}>{notif.title}</h3>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  )}
                </div>
                <p className={`${textMuted} text-sm mb-2`}>{notif.message}</p>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                  {getTimeAgo(notif.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${cardBg} flex items-center justify-center`}>
            <Bell className={`w-10 h-10 ${textMuted}`} />
          </div>
          <h3 className={`${textColor} font-semibold text-lg mb-2`}>
            {isAr ? 'لا توجد إشعارات' : 'No notifications'}
          </h3>
          <p className={textMuted}>
            {isAr ? 'ستظهر الإشعارات هنا عند وصولها' : 'Notifications will appear here when you receive them'}
          </p>
        </div>
      )}
    </div>
  );
}
