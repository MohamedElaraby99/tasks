import PocketBase, { RecordModel } from 'pocketbase';

// غيّر الـ URL حسب السيرفر بتاعك
const pb = new PocketBase('http://localhost:8090');

// تفعيل Auto-refresh للـ token
pb.autoCancellation(false);

export default pb;

// Types for PocketBase records
export interface PBUser extends RecordModel {
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'ceo' | 'manager' | 'team_leader' | 'employee';
  department?: string;
  phone?: string;
  shiftStart?: string;
  shiftEnd?: string;
  isActive: boolean;
  password?: string;
}

export interface PBDepartment extends RecordModel {
  name: string;
  description?: string;
  managerId?: string;
}

export interface PBTask extends RecordModel {
  title: string;
  description: string;
  status: 'new' | 'seen' | 'in_progress' | 'paused' | 'completed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignedTo: string;
  createdBy: string;
  department: string;
  dueDate: string;
  seenAt?: string;
  startedAt?: string;
  completedAt?: string;
  pauseReason?: string;
  progress: number;
}

export interface PBComment extends RecordModel {
  taskId: string;
  userId: string;
  content: string;
}

export interface PBNotification extends RecordModel {
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedTaskId?: string;
}

export interface PBDailyLog extends RecordModel {
  userId: string;
  title: string;
  description?: string;
  status: 'in_progress' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  pauseReason?: string;
}

export interface PBTaskRating extends RecordModel {
  taskId: string;
  oderId: string;
  odedId: string;
  odeedRating: number;
  autoRating: number;
}

// Auth functions
export const authFunctions = {
  async login(username: string, _password: string) {
    try {
      // البحث عن المستخدم بالـ username
      const users = await pb.collection('users').getList<PBUser>(1, 1, {
        filter: `username = "${username}"`,
      });
      
      if (users.items.length === 0) {
        throw new Error('اسم المستخدم غير موجود');
      }
      
      const user = users.items[0];
      
      // ملاحظة: في الإنتاج، يجب التحقق من كلمة المرور في الـ Backend
      // PocketBase يدعم Auth collections للتحقق الآمن
      
      return user;
    } catch (error) {
      throw error;
    }
  },
  
  logout() {
    pb.authStore.clear();
  },
  
  isLoggedIn() {
    return pb.authStore.isValid;
  },
  
  getCurrentUser() {
    return pb.authStore.model;
  }
};

// Users functions
export const userFunctions = {
  async getAll() {
    const records = await pb.collection('users').getFullList<PBUser>({
      sort: '-created',
    });
    return records;
  },
  
  async getById(id: string) {
    const record = await pb.collection('users').getOne<PBUser>(id);
    return record;
  },
  
  async create(data: Partial<PBUser>) {
    const record = await pb.collection('users').create<PBUser>(data);
    return record;
  },
  
  async update(id: string, data: Partial<PBUser>) {
    const record = await pb.collection('users').update<PBUser>(id, data);
    return record;
  },
  
  async delete(id: string) {
    await pb.collection('users').delete(id);
  }
};

// Departments functions
export const departmentFunctions = {
  async getAll() {
    const records = await pb.collection('departments').getFullList<PBDepartment>({
      sort: '-created',
    });
    return records;
  },
  
  async create(data: Partial<PBDepartment>) {
    const record = await pb.collection('departments').create<PBDepartment>(data);
    return record;
  },
  
  async update(id: string, data: Partial<PBDepartment>) {
    const record = await pb.collection('departments').update<PBDepartment>(id, data);
    return record;
  },
  
  async delete(id: string) {
    await pb.collection('departments').delete(id);
  }
};

// Tasks functions
export const taskFunctions = {
  async getAll() {
    const records = await pb.collection('tasks').getFullList<PBTask>({
      sort: '-created',
      expand: 'assignedTo,createdBy,department',
    });
    return records;
  },
  
  async getByUser(userId: string) {
    const records = await pb.collection('tasks').getFullList<PBTask>({
      filter: `assignedTo = "${userId}"`,
      sort: '-created',
    });
    return records;
  },
  
  async getByDepartment(departmentId: string) {
    const records = await pb.collection('tasks').getFullList<PBTask>({
      filter: `department = "${departmentId}"`,
      sort: '-created',
    });
    return records;
  },
  
  async create(data: Partial<PBTask>) {
    const record = await pb.collection('tasks').create<PBTask>(data);
    return record;
  },
  
  async update(id: string, data: Partial<PBTask>) {
    const record = await pb.collection('tasks').update<PBTask>(id, data);
    return record;
  },
  
  async delete(id: string) {
    await pb.collection('tasks').delete(id);
  }
};

// Comments functions
export const commentFunctions = {
  async getByTask(taskId: string) {
    const records = await pb.collection('comments').getFullList<PBComment>({
      filter: `taskId = "${taskId}"`,
      sort: 'created',
      expand: 'userId',
    });
    return records;
  },
  
  async create(data: Partial<PBComment>) {
    const record = await pb.collection('comments').create<PBComment>(data);
    return record;
  },
  
  async delete(id: string) {
    await pb.collection('comments').delete(id);
  }
};

// Notifications functions
export const notificationFunctions = {
  async getByUser(userId: string) {
    const records = await pb.collection('notifications').getFullList<PBNotification>({
      filter: `userId = "${userId}"`,
      sort: '-created',
    });
    return records;
  },
  
  async create(data: Partial<PBNotification>) {
    const record = await pb.collection('notifications').create<PBNotification>(data);
    return record;
  },
  
  async markAsRead(id: string) {
    const record = await pb.collection('notifications').update<PBNotification>(id, { isRead: true });
    return record;
  },
  
  async markAllAsRead(userId: string) {
    const notifications = await pb.collection('notifications').getFullList<PBNotification>({
      filter: `userId = "${userId}" && isRead = false`,
    });
    
    for (const notification of notifications) {
      await pb.collection('notifications').update(notification.id, { isRead: true });
    }
  }
};

// Daily Logs functions
export const dailyLogFunctions = {
  async getByUser(userId: string) {
    const records = await pb.collection('daily_logs').getFullList<PBDailyLog>({
      filter: `userId = "${userId}"`,
      sort: '-created',
    });
    return records;
  },
  
  async getAll() {
    const records = await pb.collection('daily_logs').getFullList<PBDailyLog>({
      sort: '-created',
      expand: 'userId',
    });
    return records;
  },
  
  async create(data: Partial<PBDailyLog>) {
    const record = await pb.collection('daily_logs').create<PBDailyLog>(data);
    return record;
  },
  
  async update(id: string, data: Partial<PBDailyLog>) {
    const record = await pb.collection('daily_logs').update<PBDailyLog>(id, data);
    return record;
  },
  
  async delete(id: string) {
    await pb.collection('daily_logs').delete(id);
  }
};

// Task Ratings functions
export const taskRatingFunctions = {
  async getByTask(taskId: string) {
    const records = await pb.collection('task_ratings').getFullList<PBTaskRating>({
      filter: `taskId = "${taskId}"`,
    });
    return records.length > 0 ? records[0] : null;
  },
  
  async create(data: Partial<PBTaskRating>) {
    const record = await pb.collection('task_ratings').create<PBTaskRating>(data);
    return record;
  },
  
  async update(id: string, data: Partial<PBTaskRating>) {
    const record = await pb.collection('task_ratings').update<PBTaskRating>(id, data);
    return record;
  }
};

// Real-time subscriptions
export const subscriptions = {
  subscribeToTasks(callback: (data: { action: string; record: PBTask }) => void) {
    return pb.collection('tasks').subscribe('*', callback);
  },
  
  subscribeToNotifications(userId: string, callback: (data: { action: string; record: PBNotification }) => void) {
    return pb.collection('notifications').subscribe('*', (e: { action: string; record: PBNotification }) => {
      if (e.record.userId === userId) {
        callback(e);
      }
    });
  },
  
  subscribeToComments(taskId: string, callback: (data: { action: string; record: PBComment }) => void) {
    return pb.collection('comments').subscribe('*', (e: { action: string; record: PBComment }) => {
      if (e.record.taskId === taskId) {
        callback(e);
      }
    });
  },
  
  unsubscribeAll() {
    pb.collection('tasks').unsubscribe('*');
    pb.collection('notifications').unsubscribe('*');
    pb.collection('comments').unsubscribe('*');
  }
};

// Backup data type
export interface BackupData {
  version: string;
  exportDate: string;
  data: {
    users: RecordModel[];
    departments: RecordModel[];
    tasks: RecordModel[];
    notifications: RecordModel[];
    dailyLogs: RecordModel[];
    comments: RecordModel[];
  };
}

// Backup & Restore functions
export const backupFunctions = {
  async exportAll(): Promise<BackupData> {
    const [users, departments, tasks, notifications, dailyLogs, comments] = await Promise.all([
      pb.collection('users').getFullList(),
      pb.collection('departments').getFullList(),
      pb.collection('tasks').getFullList(),
      pb.collection('notifications').getFullList(),
      pb.collection('daily_logs').getFullList(),
      pb.collection('comments').getFullList(),
    ]);
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        users,
        departments,
        tasks,
        notifications,
        dailyLogs,
        comments,
      }
    };
  },
  
  async importAll(backupData: BackupData) {
    // Import departments first (no dependencies)
    for (const dept of backupData.data.departments) {
      try {
        await pb.collection('departments').create(dept);
      } catch (e) {
        console.error('Error importing department:', e);
      }
    }
    
    // Import users
    for (const user of backupData.data.users) {
      try {
        await pb.collection('users').create(user);
      } catch (e) {
        console.error('Error importing user:', e);
      }
    }
    
    // Import tasks
    for (const task of backupData.data.tasks) {
      try {
        await pb.collection('tasks').create(task);
      } catch (e) {
        console.error('Error importing task:', e);
      }
    }
    
    // Import comments
    for (const comment of backupData.data.comments) {
      try {
        await pb.collection('comments').create(comment);
      } catch (e) {
        console.error('Error importing comment:', e);
      }
    }
    
    // Import notifications
    for (const notification of backupData.data.notifications) {
      try {
        await pb.collection('notifications').create(notification);
      } catch (e) {
        console.error('Error importing notification:', e);
      }
    }
    
    // Import daily logs
    for (const log of backupData.data.dailyLogs) {
      try {
        await pb.collection('daily_logs').create(log);
      } catch (e) {
        console.error('Error importing daily log:', e);
      }
    }
  }
};
