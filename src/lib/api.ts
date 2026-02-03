/**
 * API Client for Task Management System
 * Connects Frontend to Node.js Backend
 *
 * - Development: uses http://localhost:3001/api (or VITE_API_URL)
 * - Production behind Nginx (same host): set VITE_API_URL=/api so requests
 *   go to same origin and Nginx proxies /api/ to backend (e.g. port 3001)
 */
const API_URL =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // trim trailing slash
    : (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = () => authToken;

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    setAuthToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
};

// ==================== AUTH ====================

export const authAPI = {
  login: async (username: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  getMe: () => apiRequest('/auth/me'),

  refreshToken: async () => {
    const data = await apiRequest('/auth/refresh', { method: 'POST' });
    setAuthToken(data.token);
    return data;
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ==================== USERS ====================

export const usersAPI = {
  getAll: () => apiRequest('/users'),

  getById: (id: string) => apiRequest(`/users/${id}`),

  getByDepartment: (departmentId: string) => 
    apiRequest(`/users/department/${departmentId}`),

  create: (userData: {
    name: string;
    username: string;
    password: string;
    role?: string;
    departmentId?: string;
    whatsapp?: string;
    shiftStart?: string;
    shiftEnd?: string;
  }) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  update: (id: string, userData: Record<string, unknown>) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  delete: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  getTopPerformers: (limit = 5) => 
    apiRequest(`/users/stats/top-performers?limit=${limit}`),
};

// ==================== DEPARTMENTS ====================

export const departmentsAPI = {
  getAll: () => apiRequest('/departments'),

  getById: (id: string) => apiRequest(`/departments/${id}`),

  getStats: (id: string) => apiRequest(`/departments/${id}/stats`),

  create: (deptData: {
    name: string;
    nameEn?: string;
    description?: string;
  }) => apiRequest('/departments', {
    method: 'POST',
    body: JSON.stringify(deptData),
  }),

  update: (id: string, deptData: Record<string, unknown>) =>
    apiRequest(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deptData),
    }),

  delete: (id: string) => apiRequest(`/departments/${id}`, { method: 'DELETE' }),

  getRanking: () => apiRequest('/departments/stats/ranking'),
};

// ==================== TASKS ====================

export const tasksAPI = {
  getAll: () => apiRequest('/tasks'),

  getById: (id: string) => apiRequest(`/tasks/${id}`),

  create: (taskData: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assignedTo: string;
    departmentId?: string;
  }) => apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  }),

  update: (id: string, taskData: Record<string, unknown>) =>
    apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    }),

  updateStatus: (id: string, status: string, reason?: string) =>
    apiRequest(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  transfer: (id: string, toUserId: string, reason?: string) =>
    apiRequest(`/tasks/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toUserId, reason }),
    }),

  rate: (id: string, rating: number, type?: string, comment?: string) =>
    apiRequest(`/tasks/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, type, comment }),
    }),

  addComment: (id: string, content: string) =>
    apiRequest(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  delete: (id: string) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),

  getStats: () => apiRequest('/tasks/stats/overview'),
};

// ==================== DAILY LOGS ====================

export const dailyLogsAPI = {
  getAll: (date?: string, userId?: string, departmentId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (userId) params.append('userId', userId);
    if (departmentId) params.append('departmentId', departmentId);
    return apiRequest(`/daily-logs?${params.toString()}`);
  },

  getMy: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`/daily-logs/my${params}`);
  },

  getById: (id: string) => apiRequest(`/daily-logs/${id}`),

  create: (logData: {
    title: string;
    description?: string;
    status?: string;
    startDate: string;
    endDate?: string;
    pauseReason?: string;
  }) => apiRequest('/daily-logs', {
    method: 'POST',
    body: JSON.stringify(logData),
  }),

  update: (id: string, logData: Record<string, unknown>) =>
    apiRequest(`/daily-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(logData),
    }),

  rate: (id: string, rating: number) =>
    apiRequest(`/daily-logs/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  delete: (id: string) => apiRequest(`/daily-logs/${id}`, { method: 'DELETE' }),

  getStats: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`/daily-logs/stats/summary${params}`);
  },
};

// ==================== NOTIFICATIONS ====================

export const notificationsAPI = {
  getAll: () => apiRequest('/notifications'),

  getUnreadCount: () => apiRequest('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () =>
    apiRequest('/notifications/read-all', { method: 'PATCH' }),

  cleanup: () =>
    apiRequest('/notifications/cleanup', { method: 'DELETE' }),
};

// ==================== BACKUP ====================

export const backupAPI = {
  export: () => apiRequest('/backup/export'),

  import: (backup: Record<string, unknown>, adminPassword: string) =>
    apiRequest('/backup/import', {
      method: 'POST',
      body: JSON.stringify({ backup, adminPassword }),
    }),

  reset: (adminPassword: string) =>
    apiRequest('/backup/reset', {
      method: 'POST',
      body: JSON.stringify({ adminPassword }),
    }),
};

// ==================== HEALTH CHECK ====================

export const healthCheck = () => apiRequest('/health');

export default {
  auth: authAPI,
  users: usersAPI,
  departments: departmentsAPI,
  tasks: tasksAPI,
  dailyLogs: dailyLogsAPI,
  notifications: notificationsAPI,
  backup: backupAPI,
  healthCheck,
};
