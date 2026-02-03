import { useState } from 'react';
import { 
  Plus, Search, Clock, CheckCircle, 
  Pause, X, Eye, MessageCircle, Calendar,
  Play, Send, ClipboardList, ArrowRightLeft, Star, Trash2
} from 'lucide-react';
import { User, Task, TaskStatus, TaskPriority } from '../types';
import { tasksAPI } from '../lib/api';
import { showToast } from '../store/useStore';

interface TasksViewProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  user: User;
  refetch?: () => Promise<void>;
}

export function TasksView({ store, user, refetch }: TasksViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [taskRating, setTaskRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  // Form state - Default dueDate to today
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: '',
    departmentId: '',
  });

  const tasks = store.getMyTasks();
  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusConfig = (status: TaskStatus) => {
    const configs: Record<TaskStatus, { labelAr: string; labelEn: string; color: string; bg: string; icon: typeof Clock }> = {
      new: { labelAr: 'جديدة', labelEn: 'New', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Clock },
      seen: { labelAr: 'تم الاستلام', labelEn: 'Seen', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Eye },
      in_progress: { labelAr: 'قيد التنفيذ', labelEn: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: Play },
      paused: { labelAr: 'متوقفة', labelEn: 'Paused', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Pause },
      completed: { labelAr: 'مكتملة', labelEn: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
      rejected: { labelAr: 'مرفوضة', labelEn: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20', icon: X },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TaskPriority) => {
    const configs: Record<TaskPriority, { labelAr: string; labelEn: string; color: string; bg: string }> = {
      urgent: { labelAr: 'عاجل', labelEn: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/20' },
      high: { labelAr: 'عالي', labelEn: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' },
      medium: { labelAr: 'متوسط', labelEn: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
      low: { labelAr: 'منخفض', labelEn: 'Low', color: 'text-green-400', bg: 'bg-green-500/20' },
    };
    return configs[priority];
  };

  const handleAddTask = async () => {
    if (!formData.title || !formData.assignedTo) return;
    if (refetch) {
      try {
        const newTask = await tasksAPI.create({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          dueDate: formData.dueDate,
          assignedTo: formData.assignedTo,
          departmentId: formData.departmentId || undefined,
        });
        const assignedUser = store.getUserById(formData.assignedTo);
        if (assignedUser && store.whatsappConfig.enabled) {
          store.sendWhatsAppWithTask(assignedUser.whatsapp, newTask as Task);
        }
        await refetch();
        setFormData({ title: '', description: '', priority: 'medium', dueDate: new Date().toISOString().split('T')[0], assignedTo: '', departmentId: '' });
        setShowAddModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل إنشاء المهمة' : 'Failed to create task', 'error');
      }
      return;
    }
    const newTask = store.addTask({ ...formData, status: 'new', progress: 0, createdBy: user.id });
    const assignedUser = store.getUserById(formData.assignedTo);
    if (assignedUser && store.whatsappConfig.enabled) store.sendWhatsAppWithTask(assignedUser.whatsapp, newTask);
    setFormData({ title: '', description: '', priority: 'medium', dueDate: new Date().toISOString().split('T')[0], assignedTo: '', departmentId: '' });
    setShowAddModal(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'paused') {
      setShowPauseModal(true);
      return;
    }
    if (refetch) {
      try {
        await tasksAPI.updateStatus(taskId, newStatus);
        await refetch();
        if (selectedTask?.id === taskId) {
          const updated = store.tasks.find((t: Task) => t.id === taskId);
          if (updated) setSelectedTask(updated);
        }
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status', 'error');
      }
      return;
    }
    store.updateTaskStatus(taskId, newStatus);
    if (selectedTask) {
      const updatedTask = store.tasks.find((t: Task) => t.id === selectedTask.id);
      if (updatedTask) setSelectedTask(updatedTask);
    }
  };

  const handlePauseWithReason = async () => {
    if (!selectedTask || !pauseReason) return;
    if (refetch) {
      try {
        await tasksAPI.updateStatus(selectedTask.id, 'paused', pauseReason);
        await refetch();
        const updated = store.tasks.find((t: Task) => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status', 'error');
      }
      setPauseReason('');
      setShowPauseModal(false);
      return;
    }
    store.updateTaskStatus(selectedTask.id, 'paused', pauseReason);
    setPauseReason('');
    setShowPauseModal(false);
    const updatedTask = store.tasks.find((t: Task) => t.id === selectedTask.id);
    if (updatedTask) setSelectedTask(updatedTask);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    if (refetch) {
      try {
        await tasksAPI.addComment(selectedTask.id, newComment);
        setNewComment('');
        await refetch();
        const updated = store.tasks.find((t: Task) => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل إضافة التعليق' : 'Failed to add comment', 'error');
      }
      return;
    }
    store.addComment(selectedTask.id, newComment);
    setNewComment('');
    const updatedTask = store.tasks.find((t: Task) => t.id === selectedTask.id);
    if (updatedTask) setSelectedTask(updatedTask);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
    if (task.status === 'new' && task.assignedTo === user.id) {
      if (refetch) {
        tasksAPI.updateStatus(task.id, 'seen').then(() => refetch()).catch(() => {});
      } else {
        store.updateTaskStatus(task.id, 'seen');
      }
    }
  };

  const getAssignableUsers = () => {
    // Admin can assign to anyone
    if (user.role === 'admin') {
      return store.users.filter((u: User) => u.role !== 'admin');
    }
    // CEO can assign to anyone in any department
    if (user.role === 'ceo') {
      return store.users.filter((u: User) => u.role !== 'admin' && u.role !== 'ceo');
    } else if (user.role === 'manager' || user.role === 'team_leader') {
      return store.users.filter((u: User) => 
        u.departmentId === user.departmentId && (u.role === 'employee' || u.role === 'team_leader')
      );
    }
    return [];
  };

  // Get users for transfer (same department only for manager/team_leader)
  const getTransferableUsers = () => {
    if (!selectedTask) return [];
    // Admin and CEO can transfer to anyone
    if (user.role === 'admin' || user.role === 'ceo') {
      return store.users.filter((u: User) => 
        u.role !== 'admin' && u.id !== selectedTask.assignedTo
      );
    }
    // Manager/Team Leader can only transfer within department
    return store.users.filter((u: User) => 
      u.departmentId === selectedTask.departmentId && 
      u.id !== selectedTask.assignedTo &&
      (u.role === 'employee' || u.role === 'team_leader')
    );
  };

  // Check if user can transfer tasks
  const canTransferTask = () => {
    return user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'team_leader';
  };

  // Check if user can rate task
  const canRateTask = () => {
    if (!selectedTask) return false;
    return selectedTask.createdBy === user.id || user.role === 'admin' || user.role === 'ceo';
  };

  const handleTransfer = async () => {
    if (!selectedTask || !transferTo) return;
    if (refetch) {
      try {
        await tasksAPI.transfer(selectedTask.id, transferTo, transferReason);
        await refetch();
        setShowTransferModal(false);
        setTransferTo('');
        setTransferReason('');
        setShowDetailModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل تحويل المهمة' : 'Failed to transfer task', 'error');
      }
      return;
    }
    store.transferTask(selectedTask.id, transferTo, transferReason);
    setShowTransferModal(false);
    setTransferTo('');
    setTransferReason('');
    setShowDetailModal(false);
  };

  const handleRating = async () => {
    if (!selectedTask) return;
    if (refetch) {
      try {
        await tasksAPI.rate(selectedTask.id, taskRating, 'quality', ratingComment);
        await refetch();
        setShowRatingModal(false);
        setTaskRating(5);
        setRatingComment('');
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل إضافة التقييم' : 'Failed to add rating', 'error');
      }
      return;
    }
    store.rateTask(selectedTask.id, taskRating, 'quality', ratingComment);
    setShowRatingModal(false);
    setTaskRating(5);
    setRatingComment('');
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!store.canDeleteTask(selectedTask.id, user.id)) return;
    if (refetch) {
      try {
        await tasksAPI.delete(selectedTask.id);
        await refetch();
        setShowDeleteConfirm(false);
        setShowDetailModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل حذف المهمة' : 'Failed to delete task', 'error');
      }
      return;
    }
    store.deleteTask(selectedTask.id);
    setShowDeleteConfirm(false);
    setShowDetailModal(false);
  };

  const handleWhatsAppContact = () => {
    if (!selectedTask) return;
    const assignedUser = store.getUserById(selectedTask.assignedTo);
    if (assignedUser) {
      const message = isAr 
        ? `مرحباً ${assignedUser.name}، بخصوص المهمة: ${selectedTask.title}`
        : `Hello ${assignedUser.name}, regarding the task: ${selectedTask.title}`;
      store.openWhatsApp(assignedUser.whatsapp, message);
    }
  };

  const canAddTasks = user.role === 'admin' || user.role === 'ceo' || user.role === 'manager' || user.role === 'team_leader';

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-100';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
            <input
              type="text"
              placeholder={isAr ? 'البحث في المهام...' : 'Search tasks...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All Status'}</option>
            <option value="new">{isAr ? 'جديدة' : 'New'}</option>
            <option value="seen">{isAr ? 'تم الاستلام' : 'Seen'}</option>
            <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
            <option value="paused">{isAr ? 'متوقفة' : 'Paused'}</option>
            <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="all">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
            <option value="urgent">{isAr ? 'عاجل' : 'Urgent'}</option>
            <option value="high">{isAr ? 'عالي' : 'High'}</option>
            <option value="medium">{isAr ? 'متوسط' : 'Medium'}</option>
            <option value="low">{isAr ? 'منخفض' : 'Low'}</option>
          </select>

          {/* Add Button - Only show if can add tasks */}
          {canAddTasks && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">{isAr ? 'إضافة مهمة' : 'Add Task'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task: Task) => {
          const statusConfig = getStatusConfig(task.status);
          const priorityConfig = getPriorityConfig(task.priority);
          const assignedUser = store.getUserById(task.assignedTo);
          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

          return (
            <div
              key={task.id}
              onClick={() => openTaskDetail(task)}
              className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-5 hover:bg-white/10 transition-all cursor-pointer group hover:scale-[1.02]`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  {isAr ? statusConfig.labelAr : statusConfig.labelEn}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
                  {isAr ? priorityConfig.labelAr : priorityConfig.labelEn}
                </div>
              </div>

              {/* Title */}
              <h3 className={`${textColor} font-semibold text-lg mb-2 line-clamp-1`}>{task.title}</h3>
              <p className={`${textMuted} text-sm mb-4 line-clamp-2`}>{task.description}</p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className={textMuted}>{isAr ? 'التقدم' : 'Progress'}</span>
                  <span className={textColor}>{task.progress}%</span>
                </div>
                <div className={`h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between pt-3 border-t ${borderColor}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {assignedUser?.name.charAt(0)}
                  </div>
                  <span className={`${textMuted} text-sm`}>{assignedUser?.name}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-400' : textMuted}`}>
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(task.dueDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>

              {/* Comments indicator */}
              {task.comments.length > 0 && (
                <div className={`mt-3 flex items-center gap-1 ${textMuted} text-sm`}>
                  <MessageCircle className="w-4 h-4" />
                  <span>{task.comments.length} {isAr ? 'تعليق' : 'comments'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${cardBg} flex items-center justify-center`}>
            <ClipboardList className={`w-10 h-10 ${textMuted}`} />
          </div>
          <h3 className={`${textColor} font-semibold text-lg mb-2`}>
            {isAr ? 'لا توجد مهام' : 'No tasks found'}
          </h3>
          <p className={textMuted}>
            {isAr ? 'لم يتم العثور على مهام مطابقة للبحث' : 'No tasks matching your search'}
          </p>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl`}>
            <div className={`p-6 border-b ${borderColor}`}>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {isAr ? 'إضافة مهمة جديدة' : 'Add New Task'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'عنوان المهمة' : 'Task Title'}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder={isAr ? 'أدخل عنوان المهمة' : 'Enter task title'}
                />
              </div>
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none`}
                  placeholder={isAr ? 'أدخل وصف المهمة' : 'Enter task description'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="urgent">{isAr ? 'عاجل' : 'Urgent'}</option>
                    <option value="high">{isAr ? 'عالي' : 'High'}</option>
                    <option value="medium">{isAr ? 'متوسط' : 'Medium'}</option>
                    <option value="low">{isAr ? 'منخفض' : 'Low'}</option>
                  </select>
                </div>
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
              </div>
              {/* Department Selection - Only for Admin and CEO */}
              {(user.role === 'admin' || user.role === 'ceo') && (
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'اختر القسم أولاً' : 'Select Department First'}
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, assignedTo: '' })}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">{isAr ? 'اختر القسم' : 'Select department'}</option>
                    {store.departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'تكليف إلى' : 'Assign To'}
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  disabled={(user.role === 'admin' || user.role === 'ceo') && !formData.departmentId}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
                >
                  <option value="">
                    {(user.role === 'admin' || user.role === 'ceo') 
                      ? (formData.departmentId ? (isAr ? 'اختر الموظف' : 'Select employee') : (isAr ? 'اختر القسم أولاً' : 'Select department first'))
                      : (isAr ? 'اختر الموظف' : 'Select employee')
                    }
                  </option>
                  {/* For Admin/CEO - show employees from selected department */}
                  {(user.role === 'admin' || user.role === 'ceo') && formData.departmentId && getAssignableUsers()
                    .filter((u: User) => u.departmentId === formData.departmentId)
                    .map((u: User) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'manager' ? (isAr ? 'مدير' : 'Manager') : u.role === 'team_leader' ? (isAr ? 'قائد فريق' : 'Team Leader') : (isAr ? 'موظف' : 'Employee')})
                      </option>
                    ))}
                  {/* For Manager/Team Leader - show only their department employees */}
                  {(user.role === 'manager' || user.role === 'team_leader') && getAssignableUsers()
                    .map((u: User) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'team_leader' ? (isAr ? 'قائد فريق' : 'Team Leader') : (isAr ? 'موظف' : 'Employee')})
                      </option>
                    ))}
                </select>
                {(user.role === 'admin' || user.role === 'ceo') && formData.departmentId && getAssignableUsers().filter((u: User) => u.departmentId === formData.departmentId).length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">{isAr ? 'لا يوجد موظفين في هذا القسم' : 'No employees in this department'}</p>
                )}
              </div>
            </div>
            <div className={`p-6 border-t ${borderColor} flex gap-3 justify-end`}>
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-6 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAddTask}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg transition"
              >
                {isAr ? 'إضافة المهمة' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl my-8 backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl`}>
            <div className={`p-6 border-b ${borderColor} flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {isAr ? 'تفاصيل المهمة' : 'Task Details'}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`p-2 rounded-lg hover:bg-white/5 ${textMuted} hover:text-white transition`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Task Info */}
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedTask.status).bg} ${getStatusConfig(selectedTask.status).color}`}>
                    {isAr ? getStatusConfig(selectedTask.status).labelAr : getStatusConfig(selectedTask.status).labelEn}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityConfig(selectedTask.priority).bg} ${getPriorityConfig(selectedTask.priority).color}`}>
                    {isAr ? getPriorityConfig(selectedTask.priority).labelAr : getPriorityConfig(selectedTask.priority).labelEn}
                  </div>
                </div>
                <h3 className={`text-2xl font-bold ${textColor} mb-2`}>{selectedTask.title}</h3>
                <p className={textMuted}>{selectedTask.description}</p>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <p className={`${textMuted} text-sm mb-1`}>{isAr ? 'المكلف' : 'Assigned To'}</p>
                  <p className={`${textColor} font-medium`}>{store.getUserById(selectedTask.assignedTo)?.name}</p>
                </div>
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <p className={`${textMuted} text-sm mb-1`}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                  <p className={`${textColor} font-medium`}>{new Date(selectedTask.dueDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                </div>
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <p className={`${textMuted} text-sm mb-1`}>{isAr ? 'تاريخ الإنشاء' : 'Created At'}</p>
                  <p className={`${textColor} font-medium`}>{new Date(selectedTask.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                </div>
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <p className={`${textMuted} text-sm mb-1`}>{isAr ? 'المنشئ' : 'Created By'}</p>
                  <p className={`${textColor} font-medium`}>{store.getUserById(selectedTask.createdBy)?.name}</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className={textMuted}>{isAr ? 'نسبة الإنجاز' : 'Progress'}</span>
                  <span className={`${textColor} font-semibold`}>{selectedTask.progress}%</span>
                </div>
                <div className={`h-3 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${selectedTask.progress}%` }}
                  ></div>
                </div>
                {selectedTask.assignedTo === user.id && selectedTask.status === 'in_progress' && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (refetch) {
                        tasksAPI.update(selectedTask.id, { progress: value }).then(() => refetch()).then(() => setSelectedTask({ ...selectedTask, progress: value })).catch(() => {});
                      } else {
                        store.updateTask(selectedTask.id, { progress: value });
                        setSelectedTask({ ...selectedTask, progress: value });
                      }
                    }}
                    className="w-full mt-2"
                  />
                )}
              </div>

              {/* Action Buttons */}
              {selectedTask.assignedTo === user.id && (
                <div className="flex flex-wrap gap-3">
                  {selectedTask.status === 'seen' && (
                    <button
                      onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                    >
                      <Play className="w-4 h-4" />
                      {isAr ? 'بدء التنفيذ' : 'Start'}
                    </button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedTask.id, 'paused')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
                      >
                        <Pause className="w-4 h-4" />
                        {isAr ? 'إيقاف مؤقت' : 'Pause'}
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedTask.id, 'completed')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isAr ? 'إنهاء المهمة' : 'Complete'}
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                    >
                      <Play className="w-4 h-4" />
                      {isAr ? 'استئناف' : 'Resume'}
                    </button>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 space-y-2 border ${borderColor}`}>
                <h4 className={`${textColor} font-medium mb-3`}>{isAr ? 'سجل الأوقات' : 'Time Log'}</h4>
                <div className="flex justify-between text-sm">
                  <span className={textMuted}>{isAr ? 'تاريخ الإنشاء' : 'Created'}</span>
                  <span className={textColor}>{new Date(selectedTask.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
                {selectedTask.seenAt && (
                  <div className="flex justify-between text-sm bg-blue-500/10 p-2 rounded-lg">
                    <span className="text-blue-400">{isAr ? '👁️ تم الاستلام (فتح المهمة)' : '👁️ Seen (Opened)'}</span>
                    <span className="text-blue-400 font-medium">{new Date(selectedTask.seenAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                )}
                {selectedTask.startedAt && (
                  <div className="flex justify-between text-sm">
                    <span className={textMuted}>{isAr ? '▶️ بدء التنفيذ' : '▶️ Started'}</span>
                    <span className={textColor}>{new Date(selectedTask.startedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                )}
                {selectedTask.completedAt && (
                  <div className="flex justify-between text-sm bg-green-500/10 p-2 rounded-lg">
                    <span className="text-green-400">{isAr ? '✅ تم الإنهاء' : '✅ Completed'}</span>
                    <span className="text-green-400 font-medium">{new Date(selectedTask.completedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                )}
                {selectedTask.pauseReason && (
                  <div className="flex justify-between text-sm bg-yellow-500/10 p-2 rounded-lg">
                    <span className="text-yellow-400">{isAr ? '⏸️ سبب التوقف' : '⏸️ Pause Reason'}</span>
                    <span className="text-yellow-400">{selectedTask.pauseReason}</span>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h4 className={`${textColor} font-medium mb-3`}>
                  {isAr ? 'التعليقات' : 'Comments'} ({selectedTask.comments.length})
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {selectedTask.comments.map((comment) => (
                    <div key={comment.id} className={`backdrop-blur-xl ${cardBg} rounded-xl p-3 border ${borderColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm">
                          {store.getUserById(comment.userId)?.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`${textColor} text-sm font-medium`}>{store.getUserById(comment.userId)?.name}</p>
                          <p className={`${textMuted} text-xs`}>{new Date(comment.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</p>
                        </div>
                      </div>
                      <p className={`${textMuted} text-sm`}>{comment.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                    placeholder={isAr ? 'أضف تعليقاً... (Enter للإرسال)' : 'Add a comment... (Enter to send)'}
                    className={`flex-1 px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transition"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* WhatsApp Contact */}
              <button
                onClick={handleWhatsAppContact}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
              >
                <MessageCircle className="w-5 h-5" />
                {isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
              </button>

              {/* Transfer History */}
              {selectedTask.transfers && selectedTask.transfers.length > 0 && (
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 space-y-2 border ${borderColor}`}>
                  <h4 className={`${textColor} font-medium mb-3 flex items-center gap-2`}>
                    <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                    {isAr ? 'سجل التحويلات' : 'Transfer History'}
                  </h4>
                  {selectedTask.transfers.map((transfer, idx) => (
                    <div key={idx} className={`text-sm p-2 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                      <p className="text-blue-400">
                        {isAr ? 'من' : 'From'}: {store.getUserById(transfer.fromUserId)?.name} → {store.getUserById(transfer.toUserId)?.name}
                      </p>
                      <p className={textMuted}>
                        {isAr ? 'بواسطة' : 'By'}: {store.getUserById(transfer.transferredBy)?.name}
                      </p>
                      <p className={textMuted}>
                        {new Date(transfer.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </p>
                      {transfer.reason && <p className={textMuted}>{isAr ? 'السبب' : 'Reason'}: {transfer.reason}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons for Managers */}
              <div className="flex flex-wrap gap-3">
                {/* Transfer Button */}
                {canTransferTask() && selectedTask.status !== 'completed' && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                    {isAr ? 'تحويل المهمة' : 'Transfer Task'}
                  </button>
                )}

                {/* Rate Button */}
                {canRateTask() && selectedTask.status === 'completed' && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
                  >
                    <Star className="w-5 h-5" />
                    {isAr ? 'تقييم المهمة' : 'Rate Task'}
                  </button>
                )}

                {/* Delete Button */}
                {store.canDeleteTask(selectedTask.id, user.id) && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                    {isAr ? 'حذف المهمة' : 'Delete Task'}
                  </button>
                )}
              </div>

              {/* Show rating if exists */}
              {selectedTask.creatorRating && (
                <div className={`backdrop-blur-xl ${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <p className={`${textMuted} text-sm mb-2`}>{isAr ? 'تقييم المهمة' : 'Task Rating'}</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-5 h-5 ${star <= selectedTask.creatorRating! ? 'text-yellow-400 fill-yellow-400' : textMuted}`} 
                      />
                    ))}
                    <span className={`${textColor} font-bold`}>{selectedTask.creatorRating}/5</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pause Reason Modal */}
      {showPauseModal && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6`}>
            <h3 className={`text-lg font-bold ${textColor} mb-4`}>
              {isAr ? 'سبب التوقف' : 'Pause Reason'}
            </h3>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder={isAr ? 'أدخل سبب التوقف...' : 'Enter pause reason...'}
              className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none mb-4`}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowPauseModal(false); setPauseReason(''); }}
                className={`px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handlePauseWithReason}
                disabled={!pauseReason}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 transition disabled:opacity-50"
              >
                {isAr ? 'تأكيد التوقف' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Task Modal */}
      {showTransferModal && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <ArrowRightLeft className="w-6 h-6 text-blue-400" />
              <h3 className={`text-lg font-bold ${textColor}`}>
                {isAr ? 'تحويل المهمة' : 'Transfer Task'}
              </h3>
            </div>
            <p className={`${textMuted} text-sm mb-4`}>
              {isAr 
                ? `تحويل "${selectedTask.title}" إلى موظف آخر`
                : `Transfer "${selectedTask.title}" to another employee`
              }
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'تحويل إلى' : 'Transfer To'} *
                </label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">{isAr ? 'اختر الموظف' : 'Select employee'}</option>
                  {getTransferableUsers().map((u: User) => (
                    <option key={u.id} value={u.id}>
                      {u.name} - {store.getDepartmentById(u.departmentId || '')?.name || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'سبب التحويل (اختياري)' : 'Transfer Reason (optional)'}
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder={isAr ? 'سبب تحويل المهمة...' : 'Reason for transfer...'}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowTransferModal(false); setTransferTo(''); setTransferReason(''); }}
                className={`px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferTo}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
              >
                {isAr ? 'تأكيد التحويل' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <h3 className={`text-lg font-bold ${textColor}`}>
                {isAr ? 'تقييم المهمة' : 'Rate Task'}
              </h3>
            </div>
            <p className={`${textMuted} text-sm mb-4`}>
              {isAr 
                ? `تقييم "${selectedTask.title}"`
                : `Rate "${selectedTask.title}"`
              }
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'التقييم' : 'Rating'}
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTaskRating(star)}
                      className={`p-2 rounded-lg transition ${star <= taskRating ? 'text-yellow-400' : textMuted}`}
                    >
                      <Star className={`w-8 h-8 ${star <= taskRating ? 'fill-yellow-400' : ''}`} />
                    </button>
                  ))}
                </div>
                <p className={`text-center ${textColor} font-bold mt-2`}>
                  {taskRating} / 5
                </p>
              </div>
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'تعليق (اختياري)' : 'Comment (optional)'}
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={isAr ? 'أضف تعليقاً على التقييم...' : 'Add a comment...'}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-yellow-500 h-20 resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowRatingModal(false); setTaskRating(5); setRatingComment(''); }}
                className={`px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleRating}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 transition"
              >
                {isAr ? 'حفظ التقييم' : 'Save Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>
              {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className={`${textMuted} mb-6`}>
              {isAr 
                ? 'هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this task? This action cannot be undone.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteTask}
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
