// Types for the Task Management System

export type UserRole = 'admin' | 'ceo' | 'manager' | 'team_leader' | 'employee';

export type TaskStatus = 'new' | 'seen' | 'in_progress' | 'paused' | 'completed' | 'rejected';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type Language = 'ar' | 'en';

export type Theme = 'dark' | 'light';

export interface Department {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  createdAt: string;
}

// Shift/Work Hours
export interface Shift {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  departmentId?: string;
  whatsapp: string;
  avatar?: string;
  createdAt: string;
  rating?: number; // Performance rating 0-5
  completedTasks?: number;
  totalTasks?: number;
  shift?: Shift; // Work shift
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: string;
}

// Task Transfer Record - سجل تحويل المهمة
export interface TaskTransfer {
  id: string;
  taskId: string;
  fromUserId: string;
  toUserId: string;
  transferredBy: string;
  reason?: string;
  timestamp: string;
}

// Task Rating - تقييم المهمة
export interface TaskRating {
  id: string;
  taskId: string;
  ratedBy: string; // who gave the rating
  rating: number; // 1-5 stars
  type: 'completion' | 'quality'; // completion = before deadline, quality = task quality
  comment?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate: string;
  
  createdBy: string;
  assignedTo: string;
  departmentId: string;
  
  seenAt?: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  pauseReason?: string;
  rejectReason?: string;
  
  // Ratings
  creatorRating?: number; // Rating given by task creator (1-5)
  completionRating?: number; // Auto-calculated based on deadline (1-5)
  
  // Transfer history
  transfers?: TaskTransfer[];
  
  comments: Comment[];
  activityLog: ActivityLog[];
  
  createdAt: string;
  updatedAt: string;
}

// Daily Work Log - سجل العمل اليومي
export interface DailyLogEntry {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'in_progress' | 'paused' | 'completed';
  pauseReason?: string;
  // Date range for multi-day activities
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional - if same day, only startDate is used)
  duration?: number; // in days (calculated)
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'comment' | 'status' | 'reminder';
  read: boolean;
  taskId?: string;
  createdAt: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  companyNumber: string;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  notifications: boolean;
  autoLogout: number; // minutes
}

// Rating/Performance tracking
export interface PerformanceRecord {
  id: string;
  userId: string;
  departmentId?: string;
  period: 'week' | 'month';
  periodStart: string;
  periodEnd: string;
  tasksCompleted: number;
  tasksOnTime: number;
  averageRating: number;
  createdAt: string;
}

export interface AppState {
  users: User[];
  departments: Department[];
  tasks: Task[];
  dailyLogs: DailyLogEntry[];
  notifications: Notification[];
  performanceRecords: PerformanceRecord[];
  taskRatings: TaskRating[];
  whatsappConfig: WhatsAppConfig;
  settings: AppSettings;
  currentUser: User | null;
  adminPassword: string; // For reset/delete operations
}

// Translations
export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}
