import { useState, useEffect } from 'react';
import { 
  Plus, Clock, Play, Pause, CheckCircle, Calendar,
  ChevronLeft, ChevronRight, Trash2, Edit, X, Save
} from 'lucide-react';
import { User, DailyLogEntry } from '../types';
import { dailyLogsAPI } from '../lib/api';
import { showToast } from '../store/useStore';

interface DailyLogViewProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  user: User;
  refetch?: () => Promise<void>;
}

export function DailyLogView({ store, user, refetch }: DailyLogViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'team' | 'all'>('my');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<DailyLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!refetch) return;
    setLogsLoading(true);
    if (viewMode === 'my' || user.role === 'employee') {
      dailyLogsAPI.getMy(selectedDate).then((data) => { setApiLogs(Array.isArray(data) ? data : []); setLogsLoading(false); }).catch(() => { setApiLogs([]); setLogsLoading(false); });
    } else if (viewMode === 'team' && user.departmentId) {
      dailyLogsAPI.getAll(selectedDate, undefined, user.departmentId).then((data) => { setApiLogs(Array.isArray(data) ? data : []); setLogsLoading(false); }).catch(() => { setApiLogs([]); setLogsLoading(false); });
    } else {
      dailyLogsAPI.getAll(selectedDate).then((data) => { setApiLogs(Array.isArray(data) ? data : []); setLogsLoading(false); }).catch(() => { setApiLogs([]); setLogsLoading(false); });
    }
  }, [selectedDate, viewMode, user.role, user.departmentId]);

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'in_progress' as 'in_progress' | 'paused' | 'completed',
    pauseReason: '',
  });

  const getLogs = () => {
    if (refetch) return apiLogs;
    if (user.role === 'admin') {
      if (viewMode === 'my') return store.getMyDailyLogs(selectedDate);
      return store.getAllDailyLogs(selectedDate);
    }
    if (viewMode === 'my' || user.role === 'employee') return store.getMyDailyLogs(selectedDate);
    if (viewMode === 'team' && (user.role === 'manager' || user.role === 'team_leader')) return store.getDailyLogsByDepartment(user.departmentId || '', selectedDate);
    if (viewMode === 'all' && user.role === 'ceo') return store.getAllDailyLogs(selectedDate);
    return store.getMyDailyLogs(selectedDate);
  };

  const logs = getLogs();
  const refreshApiLogs = () => {
    if (!refetch) return;
    if (viewMode === 'my' || user.role === 'employee') dailyLogsAPI.getMy(selectedDate).then((data) => setApiLogs(Array.isArray(data) ? data : [])).catch(() => setApiLogs([]));
    else if (viewMode === 'team' && user.departmentId) dailyLogsAPI.getAll(selectedDate, undefined, user.departmentId).then((data) => setApiLogs(Array.isArray(data) ? data : [])).catch(() => setApiLogs([]));
    else dailyLogsAPI.getAll(selectedDate).then((data) => setApiLogs(Array.isArray(data) ? data : [])).catch(() => setApiLogs([]));
  };

  // Filter by selected user if applicable
  const filteredLogs = selectedUserId 
    ? logs.filter(l => l.userId === selectedUserId)
    : logs;

  // Get unique users from logs
  const usersInLogs = [...new Set(logs.map(l => l.userId))].map(id => store.getUserById(id)).filter(Boolean);

  const calculateDaysDuration = (startDate: string, endDate?: string): number => {
    if (!endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: typeof Play }> = {
      in_progress: { 
        label: isAr ? 'قيد التنفيذ' : 'In Progress', 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-500/20', 
        icon: Play 
      },
      paused: { 
        label: isAr ? 'متوقفة' : 'Paused', 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/20', 
        icon: Pause 
      },
      completed: { 
        label: isAr ? 'مكتملة' : 'Completed', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20', 
        icon: CheckCircle 
      },
    };
    return configs[status] || configs.in_progress;
  };

  const handleAddLog = async () => {
    if (refetch) {
      try {
        await dailyLogsAPI.create({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          pauseReason: formData.status === 'paused' ? formData.pauseReason : undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
        });
        refreshApiLogs();
        await refetch();
        resetForm();
        setShowAddModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل إضافة النشاط' : 'Failed to add activity', 'error');
      }
      return;
    }
    store.addDailyLog({
      userId: user.id,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      pauseReason: formData.status === 'paused' ? formData.pauseReason : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
    });
    resetForm();
    setShowAddModal(false);
  };

  const handleUpdateLog = async () => {
    if (!editingLog) return;
    if (refetch) {
      try {
        await dailyLogsAPI.update(editingLog.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          pauseReason: formData.status === 'paused' ? formData.pauseReason : undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
        });
        refreshApiLogs();
        await refetch();
        resetForm();
        setEditingLog(null);
        setShowAddModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل تحديث النشاط' : 'Failed to update activity', 'error');
      }
      return;
    }
    store.updateDailyLog(editingLog.id, {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      pauseReason: formData.status === 'paused' ? formData.pauseReason : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
    });
    resetForm();
    setEditingLog(null);
    setShowAddModal(false);
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      startDate: today,
      endDate: '',
      status: 'in_progress',
      pauseReason: '',
    });
  };

  const openEditModal = (log: DailyLogEntry) => {
    setEditingLog(log);
    setFormData({
      title: log.title,
      description: log.description || '',
      startDate: log.startDate,
      endDate: log.endDate || '',
      status: log.status,
      pauseReason: log.pauseReason || '',
    });
    setShowAddModal(true);
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-100';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Date Navigation */}
        <div className={`flex items-center gap-4 backdrop-blur-xl ${cardBg} rounded-xl border ${borderColor} p-2`}>
          <button
            onClick={() => changeDate(-1)}
            className={`p-2 rounded-lg ${textMuted} hover:bg-white/10 transition`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-4">
            <Calendar className={`w-5 h-5 ${textMuted}`} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`bg-transparent ${textColor} focus:outline-none`}
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            className={`p-2 rounded-lg ${textMuted} hover:bg-white/10 transition`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition"
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>
        </div>

        <div className="flex gap-3">
          {/* View Mode Toggle */}
          {(user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'team_leader') && (
            <div className={`flex rounded-xl overflow-hidden border ${borderColor}`}>
              <button
                onClick={() => { setViewMode('my'); setSelectedUserId(null); }}
                className={`px-4 py-2 text-sm transition ${viewMode === 'my' ? 'bg-purple-600 text-white' : `${textMuted} hover:bg-white/5`}`}
              >
                {isAr ? 'سجلي' : 'My Log'}
              </button>
              <button
                onClick={() => { setViewMode('team'); setSelectedUserId(null); }}
                className={`px-4 py-2 text-sm transition ${viewMode === 'team' ? 'bg-purple-600 text-white' : `${textMuted} hover:bg-white/5`}`}
              >
                {isAr ? 'الفريق' : 'Team'}
              </button>
              {(user.role === 'ceo' || user.role === 'admin') && (
                <button
                  onClick={() => { setViewMode('all'); setSelectedUserId(null); }}
                  className={`px-4 py-2 text-sm transition ${viewMode === 'all' ? 'bg-purple-600 text-white' : `${textMuted} hover:bg-white/5`}`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
              )}
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={() => { resetForm(); setEditingLog(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">{isAr ? 'إضافة نشاط' : 'Add Activity'}</span>
          </button>
        </div>
      </div>

      {/* User Filter (for team/all view) */}
      {viewMode !== 'my' && usersInLogs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedUserId(null)}
            className={`px-3 py-1 rounded-full text-sm transition ${!selectedUserId ? 'bg-purple-600 text-white' : `${cardBg} ${textMuted} border ${borderColor} hover:bg-white/10`}`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          {usersInLogs.map(u => u && (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`px-3 py-1 rounded-full text-sm transition flex items-center gap-2 ${selectedUserId === u.id ? 'bg-purple-600 text-white' : `${cardBg} ${textMuted} border ${borderColor} hover:bg-white/10`}`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs">
                {u.name.charAt(0)}
              </div>
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`backdrop-blur-xl ${cardBg} rounded-xl border ${borderColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/20">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className={textMuted}>{isAr ? 'مكتملة' : 'Completed'}</p>
              <p className={`text-2xl font-bold ${textColor}`}>
                {filteredLogs.filter(l => l.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className={`backdrop-blur-xl ${cardBg} rounded-xl border ${borderColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20">
              <Play className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className={textMuted}>{isAr ? 'قيد التنفيذ' : 'In Progress'}</p>
              <p className={`text-2xl font-bold ${textColor}`}>
                {filteredLogs.filter(l => l.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className={`backdrop-blur-xl ${cardBg} rounded-xl border ${borderColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Pause className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className={textMuted}>{isAr ? 'متوقفة' : 'Paused'}</p>
              <p className={`text-2xl font-bold ${textColor}`}>
                {filteredLogs.filter(l => l.status === 'paused').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {refetch && logsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        ) : (
        <>
        {filteredLogs.map(log => {
          const statusConfig = getStatusConfig(log.status);
          const logUser = store.getUserById(log.userId);
          const isMultiDay = log.endDate && log.endDate !== log.startDate;

          return (
            <div
              key={log.id}
              className={`backdrop-blur-xl ${cardBg} rounded-xl border ${borderColor} p-4 hover:bg-white/10 transition group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {viewMode !== 'my' && logUser && (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm">
                          {logUser.name.charAt(0)}
                        </div>
                        <span className={textMuted}>{logUser.name}</span>
                        <span className={textMuted}>•</span>
                      </div>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    {isMultiDay && (
                      <span className={`px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400`}>
                        {calculateDaysDuration(log.startDate, log.endDate)} {isAr ? 'أيام' : 'days'}
                      </span>
                    )}
                  </div>
                  <h3 className={`${textColor} font-semibold mb-1`}>{log.title}</h3>
                  {log.description && (
                    <p className={`${textMuted} text-sm mb-2`}>{log.description}</p>
                  )}
                  {log.pauseReason && (
                    <p className="text-yellow-400 text-sm mb-2">
                      {isAr ? 'سبب التوقف: ' : 'Pause reason: '}{log.pauseReason}
                    </p>
                  )}
                  <div className={`flex flex-wrap items-center gap-4 ${textMuted} text-sm`}>
                    {/* Date range */}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {log.startDate}
                      {isMultiDay && ` → ${log.endDate}`}
                    </span>
                    {/* Multi-day indicator */}
                    {isMultiDay && (
                      <span className="flex items-center gap-1 text-[#FFAE1F]">
                        <Clock className="w-4 h-4" />
                        {calculateDaysDuration(log.startDate, log.endDate)} {isAr ? 'أيام' : 'days'}
                      </span>
                    )}
                  </div>
                </div>
                
                {log.userId === user.id && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(log)}
                      className={`p-2 rounded-lg ${textMuted} hover:bg-white/10 hover:text-white transition`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(log.id)}
                      className={`p-2 rounded-lg ${textMuted} hover:bg-red-500/10 hover:text-red-400 transition`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </>
        )}
      </div>

      {!logsLoading && filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${cardBg} flex items-center justify-center`}>
            <Calendar className={`w-10 h-10 ${textMuted}`} />
          </div>
          <h3 className={`${textColor} font-semibold text-lg mb-2`}>
            {isAr ? 'لا يوجد سجلات' : 'No logs found'}
          </h3>
          <p className={textMuted}>
            {isAr ? 'لم يتم تسجيل أي أنشطة في هذا اليوم' : 'No activities recorded for this day'}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-lg my-8 backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl`}>
            <div className={`p-6 border-b ${borderColor} flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {editingLog 
                  ? (isAr ? 'تعديل النشاط' : 'Edit Activity')
                  : (isAr ? 'إضافة نشاط جديد' : 'Add New Activity')
                }
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingLog(null); }}
                className={`p-2 rounded-lg hover:bg-white/5 ${textMuted} hover:text-white transition`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'عنوان النشاط' : 'Activity Title'} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder={isAr ? 'ماذا عملت؟' : 'What did you work on?'}
                />
              </div>

              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 h-20 resize-none`}
                  placeholder={isAr ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}
                />
              </div>

              {/* Date Range */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} space-y-4`}>
                <p className={`${textColor} font-medium text-sm`}>
                  {isAr ? 'الفترة الزمنية' : 'Time Period'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block ${textMuted} text-xs mb-1`}>
                      {isAr ? 'تاريخ البداية' : 'Start Date'} *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#FFAE1F]`}
                    />
                  </div>
                  <div>
                    <label className={`block ${textMuted} text-xs mb-1`}>
                      {isAr ? 'تاريخ النهاية (اختياري)' : 'End Date (optional)'}
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate}
                      className={`w-full px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#FFAE1F]`}
                    />
                  </div>
                </div>
              </div>

              {formData.endDate && formData.endDate !== formData.startDate && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#FFAE1F]/10' : 'bg-amber-50'} border border-[#FFAE1F]/20`}>
                  <p className="text-[#FFAE1F] text-sm">
                    {isAr ? 'عدد الأيام: ' : 'Days: '}
                    <strong>{calculateDaysDuration(formData.startDate, formData.endDate)} {isAr ? 'يوم' : 'days'}</strong>
                  </p>
                </div>
              )}

              {/* Status */}
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'in_progress' | 'paused' | 'completed' })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
                  <option value="paused">{isAr ? 'متوقفة' : 'Paused'}</option>
                  <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                </select>
              </div>

              {formData.status === 'paused' && (
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'سبب التوقف' : 'Pause Reason'} *
                  </label>
                  <input
                    type="text"
                    value={formData.pauseReason}
                    onChange={(e) => setFormData({ ...formData, pauseReason: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder={isAr ? 'لماذا توقفت؟' : 'Why did you pause?'}
                  />
                </div>
              )}
            </div>
            <div className={`p-6 border-t ${borderColor} flex gap-3 justify-end`}>
              <button
                onClick={() => { setShowAddModal(false); setEditingLog(null); }}
                className={`px-6 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={editingLog ? handleUpdateLog : handleAddLog}
                disabled={!formData.title || !formData.startDate || (formData.status === 'paused' && !formData.pauseReason)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingLog 
                  ? (isAr ? 'حفظ التغييرات' : 'Save Changes')
                  : (isAr ? 'إضافة النشاط' : 'Add Activity')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>
              {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className={`${textMuted} mb-6`}>
              {isAr 
                ? 'هل أنت متأكد من حذف هذا النشاط؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this activity? This action cannot be undone.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = showDeleteConfirm;
                  if (refetch) {
                    try {
                      await dailyLogsAPI.delete(id);
                      refreshApiLogs();
                      await refetch();
                      setShowDeleteConfirm(null);
                    } catch {
                      showToast(store.settings.language === 'ar' ? 'فشل حذف النشاط' : 'Failed to delete activity', 'error');
                    }
                  } else {
                    store.deleteDailyLog(id);
                    setShowDeleteConfirm(null);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
              >
                {isAr ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
