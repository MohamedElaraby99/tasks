import { useState, useEffect, useCallback } from 'react';
import { 
  AppState, User, Department, Task, Notification, 
  TaskStatus, Comment, ActivityLog, DailyLogEntry,
  AppSettings, Language, Theme, TaskTransfer, TaskRating
} from '../types';
import { getAuthToken, authAPI } from '../lib/api';
import { addToast as addToastUI } from '../components/toast';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Default admin password for dangerous operations (backup/reset)
const DEFAULT_ADMIN_PASSWORD = 'Admin@2024#Secure';

const initialSettings: AppSettings = {
  language: 'ar',
  theme: 'dark',
  notifications: true,
  autoLogout: 30,
};

const initialState: AppState = {
  users: [],
  departments: [],
  tasks: [],
  dailyLogs: [],
  notifications: [],
  performanceRecords: [],
  taskRatings: [],
  whatsappConfig: {
    enabled: true,
    companyNumber: '201000000000',
  },
  settings: initialSettings,
  currentUser: null,
  adminPassword: DEFAULT_ADMIN_PASSWORD,
};

const STORAGE_KEY = 'task_management_system_v2';

/** Read theme and language from localStorage (same key as store). Used by LoginPage. */
export function getStoredSettings(): { language: Language; theme: Theme } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        language: parsed.settings?.language ?? initialSettings.language,
        theme: parsed.settings?.theme ?? initialSettings.theme,
      };
    }
  } catch {
    // ignore
  }
  return { language: initialSettings.language, theme: initialSettings.theme };
}

/** Persist only theme/language to localStorage so store sees it after login. */
export function setStoredSettings(settings: { language?: Language; theme?: Theme }) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    const next = {
      ...parsed,
      settings: { ...initialSettings, ...parsed.settings, ...settings },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

// Toast: delegate to UI toast module so DashboardLayout's ToastContainer shows them
export const showToast = (message: string, type: ToastType = 'success') => {
  addToastUI(message, type);
};

export const hideToast = () => {};
// For backward compatibility
export const addToast = showToast;
export const removeToast = hideToast;

const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore settings and config; data comes from API after login
      return {
        ...initialState,
        settings: { ...initialSettings, ...parsed.settings },
        whatsappConfig: parsed.whatsappConfig ? { ...initialState.whatsappConfig, ...parsed.whatsappConfig } : initialState.whatsappConfig,
        adminPassword: parsed.adminPassword || DEFAULT_ADMIN_PASSWORD,
      };
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return initialState;
};

const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Note: Do not dispatch StorageEvent here. The browser fires 'storage' in other
    // tabs when localStorage changes; dispatching in our own tab causes our listener
    // to run, setState, and retrigger saveState → infinite loop.
  } catch (e) {
    console.error('Error saving state:', e);
  }
};

// Get fresh data from localStorage
const getFreshState = (): AppState => {
  return loadState();
};

export const useStore = () => {
  const [state, setState] = useState<AppState>(loadState);

  // Sync with localStorage changes (cross-tab and real-time)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newState = JSON.parse(e.newValue);
        setState(prev => ({
          ...newState,
          currentUser: prev.currentUser, // Keep current user
        }));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Force reload state from localStorage
  const reloadState = useCallback(() => {
    const freshState = getFreshState();
    setState(prev => ({
      ...freshState,
      currentUser: prev.currentUser,
    }));
  }, []);

  // Settings functions
  const setLanguage = (language: Language) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, language }
    }));
    addToast(language === 'ar' ? 'تم تغيير اللغة' : 'Language changed', 'success');
  };

  const setTheme = (theme: Theme) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, theme }
    }));
    addToast(state.settings.language === 'ar' ? 'تم تغيير المظهر' : 'Theme changed', 'success');
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings }
    }));
    addToast(state.settings.language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
  };

  // Auth functions - FIXED: Always check fresh data from localStorage
  const login = (username: string, password: string): User | null => {
    // Get fresh data from localStorage
    const freshState = getFreshState();
    const user = freshState.users.find(u => u.username === username && u.password === password);
    if (user) {
      setState(() => ({ 
        ...freshState, // Use fresh state
        currentUser: user 
      }));
      addToast(
        state.settings.language === 'ar' 
          ? `مرحباً ${user.name}` 
          : `Welcome ${user.name}`,
        'success'
      );
      return user;
    }
    return null;
  };

  const logout = () => {
    if (getAuthToken()) {
      authAPI.logout().catch(() => {});
    }
    setState(prev => ({ ...prev, currentUser: null }));
    addToast(state.settings.language === 'ar' ? 'تم تسجيل الخروج' : 'Logged out', 'info');
  };

  const setCurrentUser = (user: User | null) => {
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const hydrateFromApi = (data: {
    users?: User[];
    tasks?: Task[];
    departments?: Department[];
    notifications?: Notification[];
    dailyLogs?: DailyLogEntry[];
  }) => {
    setState(prev => ({
      ...prev,
      ...(data.users !== undefined && { users: data.users }),
      ...(data.tasks !== undefined && { tasks: data.tasks }),
      ...(data.departments !== undefined && { departments: data.departments }),
      ...(data.notifications !== undefined && {
        notifications: data.notifications.map(n => ({
          ...n,
          read: typeof n.read === 'number' ? n.read === 1 : n.read,
        })),
      }),
      ...(data.dailyLogs !== undefined && { dailyLogs: data.dailyLogs }),
    }));
  };

  // Validate admin password for dangerous operations
  const validateAdminPassword = (password: string): boolean => {
    const freshState = getFreshState();
    return password === freshState.adminPassword;
  };

  // Change admin password
  const changeAdminPassword = (oldPassword: string, newPassword: string): boolean => {
    if (!validateAdminPassword(oldPassword)) return false;
    if (newPassword.length < 8) return false;
    setState(prev => ({ ...prev, adminPassword: newPassword }));
    addToast(state.settings.language === 'ar' ? 'تم تغيير كلمة سر الأدمن' : 'Admin password changed', 'success');
    return true;
  };

  // Username validation - check if unique (FIXED: check fresh data)
  const isUsernameUnique = (username: string, excludeId?: string): boolean => {
    const freshState = getFreshState();
    return !freshState.users.some(u => u.username === username && u.id !== excludeId);
  };

  // Phone validation
  const isValidPhone = (phone: string): boolean => {
    // Accept empty phone or valid format (10-15 digits, optionally starting with +)
    if (!phone) return true;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  // Department functions
  const addDepartment = (dept: Omit<Department, 'id' | 'createdAt'>) => {
    const newDept: Department = {
      ...dept,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, departments: [...prev.departments, newDept] }));
    
    // Notify admin about new department
    notifyAdmin(
      state.settings.language === 'ar' ? 'قسم جديد' : 'New Department',
      state.settings.language === 'ar' 
        ? `تم إضافة القسم: ${dept.name}`
        : `Department added: ${dept.name}`
    );
    
    addToast(
      state.settings.language === 'ar' ? `تم إضافة القسم: ${dept.name}` : `Department added: ${dept.name}`,
      'success'
    );
    
    return newDept;
  };

  const updateDepartment = (id: string, updates: Partial<Department>) => {
    setState(prev => ({
      ...prev,
      departments: prev.departments.map(d => d.id === id ? { ...d, ...updates } : d),
    }));
    addToast(state.settings.language === 'ar' ? 'تم تحديث القسم' : 'Department updated', 'success');
  };

  const deleteDepartment = (id: string) => {
    const deptToDelete = state.departments.find(d => d.id === id);
    
    setState(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d.id !== id),
    }));
    
    // Notify admin about deleted department
    if (deptToDelete) {
      notifyAdmin(
        state.settings.language === 'ar' ? 'حذف قسم' : 'Department Deleted',
        state.settings.language === 'ar' 
          ? `تم حذف القسم: ${deptToDelete.name}`
          : `Department deleted: ${deptToDelete.name}`
      );
      addToast(
        state.settings.language === 'ar' ? `تم حذف القسم: ${deptToDelete.name}` : `Department deleted: ${deptToDelete.name}`,
        'success'
      );
    }
  };

  // User functions with validation - FIXED: Proper state update
  const addUser = (userData: Omit<User, 'id' | 'createdAt'> & { shiftStart?: string; shiftEnd?: string }): { success: boolean; error?: string; user?: User } => {
    // Required fields validation
    if (!userData.name || !userData.name.trim()) {
      addToast(state.settings.language === 'ar' ? 'الاسم مطلوب' : 'Name is required', 'error');
      return { success: false, error: 'name_required' };
    }
    if (!userData.username || !userData.username.trim()) {
      addToast(state.settings.language === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required', 'error');
      return { success: false, error: 'username_required' };
    }
    if (!userData.password) {
      addToast(state.settings.language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required', 'error');
      return { success: false, error: 'password_required' };
    }
    if (!userData.role) {
      addToast(state.settings.language === 'ar' ? 'الدور مطلوب' : 'Role is required', 'error');
      return { success: false, error: 'role_required' };
    }
    if (userData.role !== 'ceo' && userData.role !== 'admin' && !userData.departmentId) {
      addToast(state.settings.language === 'ar' ? 'القسم مطلوب' : 'Department is required', 'error');
      return { success: false, error: 'department_required' };
    }
    
    // Validate username uniqueness
    if (!isUsernameUnique(userData.username)) {
      addToast(state.settings.language === 'ar' ? 'اسم المستخدم موجود بالفعل' : 'Username already exists', 'error');
      return { success: false, error: 'username_exists' };
    }
    // Validate password length
    if (userData.password.length < 6) {
      addToast(state.settings.language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'error');
      return { success: false, error: 'password_short' };
    }
    // Validate phone format
    if (userData.whatsapp && !isValidPhone(userData.whatsapp)) {
      addToast(state.settings.language === 'ar' ? 'رقم الهاتف غير صحيح (10-15 رقم)' : 'Invalid phone number (10-15 digits)', 'error');
      return { success: false, error: 'invalid_phone' };
    }
    
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      rating: 0,
      completedTasks: 0,
      totalTasks: 0,
      shift: userData.shiftStart && userData.shiftEnd ? {
        startTime: userData.shiftStart,
        endTime: userData.shiftEnd
      } : undefined,
    };
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    
    // Notify admin about new user
    notifyAdmin(
      state.settings.language === 'ar' ? 'مستخدم جديد' : 'New User',
      state.settings.language === 'ar' 
        ? `تم إضافة المستخدم: ${userData.name} (${userData.username})`
        : `User added: ${userData.name} (${userData.username})`
    );
    
    addToast(
      state.settings.language === 'ar' ? `تم إضافة المستخدم: ${userData.name}` : `User added: ${userData.name}`,
      'success'
    );
    
    return { success: true, user: newUser };
  };

  const updateUser = (id: string, updates: Partial<User> & { shiftStart?: string; shiftEnd?: string }): { success: boolean; error?: string } => {
    // If updating username, check uniqueness
    if (updates.username && !isUsernameUnique(updates.username, id)) {
      addToast(state.settings.language === 'ar' ? 'اسم المستخدم موجود بالفعل' : 'Username already exists', 'error');
      return { success: false, error: 'username_exists' };
    }
    // If updating password, check length
    if (updates.password && updates.password.length < 6) {
      addToast(state.settings.language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'error');
      return { success: false, error: 'password_short' };
    }
    // Validate phone format
    if (updates.whatsapp && !isValidPhone(updates.whatsapp)) {
      addToast(state.settings.language === 'ar' ? 'رقم الهاتف غير صحيح (10-15 رقم)' : 'Invalid phone number (10-15 digits)', 'error');
      return { success: false, error: 'invalid_phone' };
    }
    
    // Handle shift update
    const shiftUpdate = updates.shiftStart && updates.shiftEnd ? {
      shift: { startTime: updates.shiftStart, endTime: updates.shiftEnd }
    } : {};
    
    // Clean up the updates object
    const cleanUpdates = { ...updates };
    delete cleanUpdates.shiftStart;
    delete cleanUpdates.shiftEnd;
    
    setState(prev => {
      const newUsers = prev.users.map(u => 
        u.id === id ? { ...u, ...cleanUpdates, ...shiftUpdate } : u
      );
      
      // Update currentUser if it's the same user
      const updatedCurrentUser = prev.currentUser?.id === id 
        ? { ...prev.currentUser, ...cleanUpdates, ...shiftUpdate }
        : prev.currentUser;
      
      return {
        ...prev,
        users: newUsers,
        currentUser: updatedCurrentUser,
      };
    });
    
    addToast(state.settings.language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully', 'success');
    return { success: true };
  };

  const deleteUser = (id: string) => {
    // Don't allow deleting admin
    const userToDelete = state.users.find(u => u.id === id);
    if (userToDelete?.role === 'admin') {
      addToast(state.settings.language === 'ar' ? 'لا يمكن حذف حساب الأدمن' : 'Cannot delete admin account', 'error');
      return;
    }
    
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id),
    }));
    
    // Notify admin about deleted user
    if (userToDelete) {
      notifyAdmin(
        state.settings.language === 'ar' ? 'حذف مستخدم' : 'User Deleted',
        state.settings.language === 'ar' 
          ? `تم حذف المستخدم: ${userToDelete.name} (${userToDelete.username})`
          : `User deleted: ${userToDelete.name} (${userToDelete.username})`
      );
      addToast(
        state.settings.language === 'ar' ? `تم حذف المستخدم: ${userToDelete.name}` : `User deleted: ${userToDelete.name}`,
        'success'
      );
    }
  };

  // Task functions
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activityLog'>) => {
    const newTask: Task = {
      ...task,
      id: generateId(),
      comments: [],
      activityLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    
    // Update user's total tasks count
    updateUserTaskCount(task.assignedTo, 0, 1);
    
    // Add notification
    addNotification({
      userId: task.assignedTo,
      title: state.settings.language === 'ar' ? 'مهمة جديدة' : 'New Task',
      message: state.settings.language === 'ar' 
        ? `تم تكليفك بمهمة: ${task.title}` 
        : `You have been assigned: ${task.title}`,
      type: 'task',
      taskId: newTask.id,
    });
    
    addToast(
      state.settings.language === 'ar' ? `تم إنشاء المهمة: ${task.title}` : `Task created: ${task.title}`,
      'success'
    );
    
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
    }));
    addToast(state.settings.language === 'ar' ? 'تم تحديث المهمة' : 'Task updated', 'success');
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus, reason?: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates: Partial<Task> = { status };
    
    switch (status) {
      case 'seen':
        updates.seenAt = new Date().toISOString();
        break;
      case 'in_progress':
        updates.startedAt = new Date().toISOString();
        break;
      case 'paused':
        updates.pausedAt = new Date().toISOString();
        updates.pauseReason = reason;
        break;
      case 'completed':
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
        // Update user's completed tasks count
        updateUserTaskCount(task.assignedTo, 1, 0);
        break;
      case 'rejected':
        updates.rejectReason = reason;
        break;
    }

    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
    }));
    
    // Add activity log
    addActivityLog(taskId, state.currentUser?.id || '', `تم تغيير الحالة إلى ${getStatusLabel(status)}`, reason);
    
    // Notify creator
    addNotification({
      userId: task.createdBy,
      title: state.settings.language === 'ar' ? 'تحديث المهمة' : 'Task Updated',
      message: state.settings.language === 'ar' 
        ? `تم تغيير حالة "${task.title}" إلى ${getStatusLabel(status)}`
        : `"${task.title}" status changed to ${getStatusLabelEn(status)}`,
      type: 'status',
      taskId,
    });
    
    addToast(
      state.settings.language === 'ar' ? `تم تغيير حالة المهمة إلى ${getStatusLabel(status)}` : `Task status changed to ${getStatusLabelEn(status)}`,
      'success'
    );
  };

  const deleteTask = (id: string) => {
    const taskToDelete = state.tasks.find(t => t.id === id);
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
    }));
    
    // Notify admin about deleted task
    if (taskToDelete) {
      notifyAdmin(
        state.settings.language === 'ar' ? 'حذف مهمة' : 'Task Deleted',
        state.settings.language === 'ar' 
          ? `تم حذف المهمة: ${taskToDelete.title}`
          : `Task deleted: ${taskToDelete.title}`
      );
      addToast(
        state.settings.language === 'ar' ? `تم حذف المهمة: ${taskToDelete.title}` : `Task deleted: ${taskToDelete.title}`,
        'success'
      );
    }
  };

  // Check if user can delete task
  const canDeleteTask = (taskId: string, userId: string): boolean => {
    const task = state.tasks.find(t => t.id === taskId);
    const user = state.users.find(u => u.id === userId);
    if (!task || !user) return false;
    
    // Admin can delete anything
    if (user.role === 'admin') return true;
    
    // CEO can only delete tasks that haven't been seen
    if (user.role === 'ceo' && !task.seenAt) return true;
    
    return false;
  };

  // Transfer task to another user
  const transferTask = (taskId: string, toUserId: string, reason?: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !state.currentUser) return false;
    
    const fromUserId = task.assignedTo;
    const transfer: TaskTransfer = {
      id: generateId(),
      taskId,
      fromUserId,
      toUserId,
      transferredBy: state.currentUser.id,
      reason,
      timestamp: new Date().toISOString(),
    };
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              assignedTo: toUserId, 
              transfers: [...(t.transfers || []), transfer],
              updatedAt: new Date().toISOString()
            } 
          : t
      ),
    }));
    
    // Add activity log
    const fromUser = state.users.find(u => u.id === fromUserId);
    const toUser = state.users.find(u => u.id === toUserId);
    addActivityLog(
      taskId, 
      state.currentUser.id, 
      `تم تحويل المهمة من ${fromUser?.name} إلى ${toUser?.name}`,
      reason
    );
    
    // Notify new assignee
    addNotification({
      userId: toUserId,
      title: state.settings.language === 'ar' ? 'مهمة محولة إليك' : 'Task Transferred to You',
      message: state.settings.language === 'ar' 
        ? `تم تحويل المهمة "${task.title}" إليك`
        : `Task "${task.title}" has been transferred to you`,
      type: 'task',
      taskId,
    });
    
    // Notify old assignee
    addNotification({
      userId: fromUserId,
      title: state.settings.language === 'ar' ? 'تم تحويل مهمتك' : 'Your Task Transferred',
      message: state.settings.language === 'ar' 
        ? `تم تحويل المهمة "${task.title}" إلى ${toUser?.name}`
        : `Task "${task.title}" has been transferred to ${toUser?.name}`,
      type: 'task',
      taskId,
    });
    
    addToast(
      state.settings.language === 'ar' ? `تم تحويل المهمة إلى ${toUser?.name}` : `Task transferred to ${toUser?.name}`,
      'success'
    );
    
    return true;
  };

  // Rate a task
  const rateTask = (taskId: string, rating: number, type: 'completion' | 'quality' = 'quality', comment?: string) => {
    if (!state.currentUser) return false;
    
    const newRating: TaskRating = {
      id: generateId(),
      taskId,
      ratedBy: state.currentUser.id,
      rating: Math.min(5, Math.max(1, rating)),
      type,
      comment,
      createdAt: new Date().toISOString(),
    };
    
    const task = state.tasks.find(t => t.id === taskId);
    
    setState(prev => ({
      ...prev,
      taskRatings: [...prev.taskRatings, newRating],
      tasks: prev.tasks.map(t => 
        t.id === taskId 
          ? { ...t, creatorRating: type === 'quality' ? rating : t.creatorRating }
          : t
      ),
    }));
    
    // Notify the task assignee about the rating
    if (task) {
      addNotification({
        userId: task.assignedTo,
        title: state.settings.language === 'ar' ? 'تقييم جديد' : 'New Rating',
        message: state.settings.language === 'ar' 
          ? `حصلت على تقييم ${rating}/5 على المهمة "${task.title}"`
          : `You received a rating of ${rating}/5 on "${task.title}"`,
        type: 'status',
        taskId,
      });
      
      // Update user's average rating
      const userTasks = state.tasks.filter(t => t.assignedTo === task.assignedTo && t.status === 'completed');
      const ratings = [...state.taskRatings.filter(r => userTasks.some(t => t.id === r.taskId)), newRating];
      const avgRating = ratings.length > 0 
        ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length 
        : rating;
      
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => 
          u.id === task.assignedTo 
            ? { ...u, rating: Math.round(avgRating * 10) / 10 }
            : u
        ),
      }));
    }
    
    addToast(state.settings.language === 'ar' ? 'تم إضافة التقييم' : 'Rating added', 'success');
    
    return true;
  };

  // Rate daily log
  const rateDailyLog = (logId: string, rating: number) => {
    const log = state.dailyLogs.find(l => l.id === logId);
    
    setState(prev => ({
      ...prev,
      dailyLogs: prev.dailyLogs.map(l => 
        l.id === logId ? { ...l, rating } : l
      ),
    }));
    
    // Notify the log owner
    if (log) {
      addNotification({
        userId: log.userId,
        title: state.settings.language === 'ar' ? 'تقييم نشاطك' : 'Activity Rating',
        message: state.settings.language === 'ar' 
          ? `حصلت على تقييم ${rating}/5 على "${log.title}"`
          : `You received ${rating}/5 on "${log.title}"`,
        type: 'status',
      });
    }
    
    addToast(state.settings.language === 'ar' ? 'تم إضافة التقييم' : 'Rating added', 'success');
  };

  // Backup all data
  const createBackup = (): string => {
    const backupData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users: state.users,
        departments: state.departments,
        tasks: state.tasks,
        dailyLogs: state.dailyLogs,
        notifications: state.notifications,
        performanceRecords: state.performanceRecords,
        taskRatings: state.taskRatings,
        whatsappConfig: state.whatsappConfig,
        settings: state.settings,
        adminPassword: state.adminPassword,
      }
    };
    addToast(state.settings.language === 'ar' ? 'تم إنشاء النسخة الاحتياطية' : 'Backup created', 'success');
    return JSON.stringify(backupData, null, 2);
  };

  // Restore from backup
  const restoreBackup = (backupJson: string, adminPass: string): { success: boolean; error?: string } => {
    if (!validateAdminPassword(adminPass)) {
      addToast(state.settings.language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password', 'error');
      return { success: false, error: 'invalid_password' };
    }
    
    try {
      const backup = JSON.parse(backupJson);
      if (!backup.data || !backup.version) {
        addToast(state.settings.language === 'ar' ? 'صيغة النسخة الاحتياطية غير صحيحة' : 'Invalid backup format', 'error');
        return { success: false, error: 'invalid_format' };
      }
      
      setState(currentState => ({
        ...currentState,
        users: backup.data.users || currentState.users,
        departments: backup.data.departments || currentState.departments,
        tasks: backup.data.tasks || currentState.tasks,
        dailyLogs: backup.data.dailyLogs || [],
        notifications: backup.data.notifications || [],
        performanceRecords: backup.data.performanceRecords || [],
        taskRatings: backup.data.taskRatings || [],
        whatsappConfig: backup.data.whatsappConfig || currentState.whatsappConfig,
        settings: backup.data.settings || currentState.settings,
        adminPassword: backup.data.adminPassword || currentState.adminPassword,
        currentUser: null, // Force re-login after restore
      }));
      
      addToast(state.settings.language === 'ar' ? 'تم استعادة النسخة الاحتياطية' : 'Backup restored', 'success');
      return { success: true };
    } catch {
      addToast(state.settings.language === 'ar' ? 'خطأ في قراءة النسخة الاحتياطية' : 'Error parsing backup', 'error');
      return { success: false, error: 'parse_error' };
    }
  };

  // Update user task counts
  const updateUserTaskCount = (userId: string, completedDelta: number, totalDelta: number) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id === userId) {
          const newCompleted = (u.completedTasks || 0) + completedDelta;
          const newTotal = (u.totalTasks || 0) + totalDelta;
          const newRating = newTotal > 0 ? (newCompleted / newTotal) * 5 : 0;
          return {
            ...u,
            completedTasks: newCompleted,
            totalTasks: newTotal,
            rating: Math.round(newRating * 10) / 10,
          };
        }
        return u;
      }),
    }));
  };

  // Comment functions
  const addComment = (taskId: string, content: string) => {
    const comment: Comment = {
      id: generateId(),
      taskId,
      userId: state.currentUser?.id || '',
      content,
      createdAt: new Date().toISOString(),
    };
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId 
          ? { ...t, comments: [...t.comments, comment] }
          : t
      ),
    }));
    
    // Notify task participants
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      [task.createdBy, task.assignedTo].forEach(userId => {
        if (userId !== state.currentUser?.id) {
          addNotification({
            userId,
            title: state.settings.language === 'ar' ? 'تعليق جديد' : 'New Comment',
            message: state.settings.language === 'ar' 
              ? `تعليق جديد على "${task.title}"`
              : `New comment on "${task.title}"`,
            type: 'comment',
            taskId,
          });
        }
      });
    }
    
    addToast(state.settings.language === 'ar' ? 'تم إضافة التعليق' : 'Comment added', 'success');
  };

  // Activity log
  const addActivityLog = (taskId: string, userId: string, action: string, details?: string) => {
    const log: ActivityLog = {
      id: generateId(),
      taskId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId 
          ? { ...t, activityLog: [...t.activityLog, log] }
          : t
      ),
    }));
  };

  // Daily Log functions
  const addDailyLog = (log: Omit<DailyLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLog: DailyLogEntry = {
      ...log,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, dailyLogs: [...prev.dailyLogs, newLog] }));
    addToast(state.settings.language === 'ar' ? 'تم إضافة النشاط' : 'Activity added', 'success');
    return newLog;
  };

  const updateDailyLog = (id: string, updates: Partial<DailyLogEntry>) => {
    setState(prev => ({
      ...prev,
      dailyLogs: prev.dailyLogs.map(l => 
        l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
      ),
    }));
    addToast(state.settings.language === 'ar' ? 'تم تحديث النشاط' : 'Activity updated', 'success');
  };

  const deleteDailyLog = (id: string) => {
    setState(prev => ({
      ...prev,
      dailyLogs: prev.dailyLogs.filter(l => l.id !== id),
    }));
    addToast(state.settings.language === 'ar' ? 'تم حذف النشاط' : 'Activity deleted', 'success');
  };

  const getMyDailyLogs = (date?: string) => {
    if (!state.currentUser) return [];
    const targetDate = date || new Date().toISOString().split('T')[0];
    return state.dailyLogs.filter(l => 
      l.userId === state.currentUser?.id && 
      (l.startDate === targetDate || (l.endDate && l.startDate <= targetDate && l.endDate >= targetDate))
    );
  };

  const getDailyLogsByUser = (userId: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return state.dailyLogs.filter(l => 
      l.userId === userId && 
      (l.startDate === targetDate || (l.endDate && l.startDate <= targetDate && l.endDate >= targetDate))
    );
  };

  const getDailyLogsByDepartment = (deptId: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const deptUsers = state.users.filter(u => u.departmentId === deptId).map(u => u.id);
    return state.dailyLogs.filter(l => 
      deptUsers.includes(l.userId) && 
      (l.startDate === targetDate || (l.endDate && l.startDate <= targetDate && l.endDate >= targetDate))
    );
  };

  const getAllDailyLogs = (date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return state.dailyLogs.filter(l => 
      l.startDate === targetDate || (l.endDate && l.startDate <= targetDate && l.endDate >= targetDate)
    );
  };

  // Notification functions
  const addNotification = (notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: Notification = {
      ...notif,
      id: generateId(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, notifications: [...prev.notifications, newNotif] }));
  };

  // Notify all admins about system events
  const notifyAdmin = (title: string, message: string) => {
    const admins = state.users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
      addNotification({
        userId: admin.id,
        title,
        message,
        type: 'status',
      });
    });
  };

  const markNotificationRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  };

  const markAllNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.userId === state.currentUser?.id ? { ...n, read: true } : n
      ),
    }));
  };

  // WhatsApp functions
  const updateWhatsAppConfig = (config: Partial<{ enabled: boolean; companyNumber: string }>) => {
    setState(prev => ({
      ...prev,
      whatsappConfig: { ...prev.whatsappConfig, ...config },
    }));
    addToast(state.settings.language === 'ar' ? 'تم تحديث إعدادات واتساب' : 'WhatsApp settings updated', 'success');
  };

  const sendWhatsAppWithTask = (phone: string, task: Task) => {
    const message = `🔔 *مهمة جديدة*\n\n📋 *العنوان:* ${task.title}\n\n📝 *الوصف:* ${task.description}\n\n⚡ *الأولوية:* ${getPriorityLabel(task.priority)}\n\n📅 *تاريخ الاستحقاق:* ${new Date(task.dueDate).toLocaleDateString('ar-EG')}\n\n---\nنظام إدارة المهام - تطوير Mohamed Alaa`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openWhatsApp = (phone: string, message?: string) => {
    const url = message 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${phone}`;
    window.open(url, '_blank');
  };

  // Performance tracking
  const getTopEmployees = (_period: 'week' | 'month' = 'month', limit: number = 5) => {
    return state.users
      .filter(u => u.role === 'employee' || u.role === 'team_leader')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  };

  const getTopDepartments = (limit: number = 5) => {
    const deptStats = state.departments.map(dept => {
      const deptUsers = state.users.filter(u => u.departmentId === dept.id);
      const deptTasks = state.tasks.filter(t => t.departmentId === dept.id);
      const completedTasks = deptTasks.filter(t => t.status === 'completed');
      const avgRating = deptUsers.reduce((acc, u) => acc + (u.rating || 0), 0) / (deptUsers.length || 1);
      
      return {
        ...dept,
        totalTasks: deptTasks.length,
        completedTasks: completedTasks.length,
        completionRate: deptTasks.length > 0 ? (completedTasks.length / deptTasks.length) * 100 : 0,
        avgRating,
        employeeCount: deptUsers.length,
      };
    });
    
    return deptStats.sort((a, b) => b.completionRate - a.completionRate).slice(0, limit);
  };

  // Helper functions
  const getStatusLabel = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      new: 'جديدة',
      seen: 'تم الاستلام',
      in_progress: 'قيد التنفيذ',
      paused: 'متوقفة',
      completed: 'مكتملة',
      rejected: 'مرفوضة',
    };
    return labels[status];
  };

  const getStatusLabelEn = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      new: 'New',
      seen: 'Seen',
      in_progress: 'In Progress',
      paused: 'Paused',
      completed: 'Completed',
      rejected: 'Rejected',
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      urgent: 'عاجل',
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض',
    };
    return labels[priority] || priority;
  };

  const getUserById = (id: string) => state.users.find(u => u.id === id);
  const getDepartmentById = (id: string) => state.departments.find(d => d.id === id);
  
  const getMyTasks = () => {
    if (!state.currentUser) return [];
    // Admin and CEO can see all tasks
    if (state.currentUser.role === 'ceo' || state.currentUser.role === 'admin') return state.tasks;
    if (state.currentUser.role === 'manager' || state.currentUser.role === 'team_leader') {
      return state.tasks.filter(t => 
        t.departmentId === state.currentUser?.departmentId || 
        t.assignedTo === state.currentUser?.id ||
        t.createdBy === state.currentUser?.id
      );
    }
    return state.tasks.filter(t => t.assignedTo === state.currentUser?.id);
  };

  const getMyNotifications = () => {
    if (!state.currentUser) return [];
    return state.notifications.filter(n => n.userId === state.currentUser?.id);
  };

  const getUnreadNotificationsCount = () => {
    return getMyNotifications().filter(n => !n.read).length;
  };

  const getDepartmentEmployees = (deptId: string) => {
    return state.users.filter(u => u.departmentId === deptId && (u.role === 'employee' || u.role === 'team_leader'));
  };

  const getDepartmentTeamLeaders = (deptId: string) => {
    return state.users.filter(u => u.departmentId === deptId && u.role === 'team_leader');
  };

  const getDepartmentManager = (deptId: string) => {
    return state.users.find(u => u.departmentId === deptId && u.role === 'manager');
  };

  const getTaskStats = () => {
    const tasks = getMyTasks();
    return {
      total: tasks.length,
      new: tasks.filter(t => t.status === 'new').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      paused: tasks.filter(t => t.status === 'paused').length,
      overdue: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
    };
  };

  // Reset data with admin password verification
  const resetData = (adminPass: string): boolean => {
    if (!validateAdminPassword(adminPass)) {
      addToast(state.settings.language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password', 'error');
      return false;
    }
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
    addToast(state.settings.language === 'ar' ? 'تم إعادة تعيين البيانات' : 'Data reset complete', 'success');
    return true;
  };

  // Translation helper
  const t = (ar: string, en: string): string => {
    return state.settings.language === 'ar' ? ar : en;
  };

  return {
    ...state,
    setCurrentUser,
    hydrateFromApi,
    // Settings
    setLanguage,
    setTheme,
    updateSettings,
    t,
    // Auth
    login,
    logout,
    validateAdminPassword,
    changeAdminPassword,
    isUsernameUnique,
    isValidPhone,
    reloadState,
    // Departments
    addDepartment,
    updateDepartment,
    deleteDepartment,
    // Users
    addUser,
    updateUser,
    deleteUser,
    // Tasks
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addComment,
    canDeleteTask,
    transferTask,
    rateTask,
    // Daily Logs
    addDailyLog,
    updateDailyLog,
    deleteDailyLog,
    getMyDailyLogs,
    getDailyLogsByUser,
    getDailyLogsByDepartment,
    getAllDailyLogs,
    rateDailyLog,
    // Notifications
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    // WhatsApp
    updateWhatsAppConfig,
    sendWhatsAppWithTask,
    openWhatsApp,
    // Performance
    getTopEmployees,
    getTopDepartments,
    // Helpers
    getStatusLabel,
    getStatusLabelEn,
    getPriorityLabel,
    getUserById,
    getDepartmentById,
    getMyTasks,
    getMyNotifications,
    getUnreadNotificationsCount,
    getDepartmentEmployees,
    getDepartmentTeamLeaders,
    getDepartmentManager,
    getTaskStats,
    resetData,
    // Backup
    createBackup,
    restoreBackup,
  };
};
