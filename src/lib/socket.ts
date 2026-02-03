/**
 * Socket.io Client for Real-time Updates
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const connectSocket = (userId: string, departmentId?: string) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
    
    // Mark user as online
    socket?.emit('user:online', userId);
    
    // Join user's personal room
    socket?.emit('join:user', userId);
    
    // Join department room if applicable
    if (departmentId) {
      socket?.emit('join:department', departmentId);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  socket.on('connect_error', (error: Error) => {
    console.error('🔌 Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Subscribe to events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subscribeToEvent = (event: string, callback: (data: any) => void) => {
  if (socket) {
    socket.on(event, callback);
  }
};

export const unsubscribeFromEvent = (event: string) => {
  if (socket) {
    socket.off(event);
  }
};

// Online users
export const subscribeToOnlineUsers = (callback: (userIds: string[]) => void) => {
  subscribeToEvent('users:online', callback);
};

// Tasks events
export const subscribeToTasks = (callbacks: {
  onCreated?: (task: unknown) => void;
  onUpdated?: (task: unknown) => void;
  onDeleted?: (data: { id: string }) => void;
}) => {
  if (callbacks.onCreated) subscribeToEvent('tasks:created', callbacks.onCreated);
  if (callbacks.onUpdated) subscribeToEvent('tasks:updated', callbacks.onUpdated);
  if (callbacks.onDeleted) subscribeToEvent('tasks:deleted', callbacks.onDeleted);
};

// Notifications events
export const subscribeToNotifications = (callback: (notification: unknown) => void) => {
  subscribeToEvent('notification:new', callback);
};

// Users events
export const subscribeToUsers = (callbacks: {
  onCreated?: (user: unknown) => void;
  onUpdated?: (user: unknown) => void;
  onDeleted?: (data: { id: string }) => void;
}) => {
  if (callbacks.onCreated) subscribeToEvent('users:created', callbacks.onCreated);
  if (callbacks.onUpdated) subscribeToEvent('users:updated', callbacks.onUpdated);
  if (callbacks.onDeleted) subscribeToEvent('users:deleted', callbacks.onDeleted);
};

// Departments events
export const subscribeToDepartments = (callbacks: {
  onCreated?: (dept: unknown) => void;
  onUpdated?: (dept: unknown) => void;
  onDeleted?: (data: { id: string }) => void;
}) => {
  if (callbacks.onCreated) subscribeToEvent('departments:created', callbacks.onCreated);
  if (callbacks.onUpdated) subscribeToEvent('departments:updated', callbacks.onUpdated);
  if (callbacks.onDeleted) subscribeToEvent('departments:deleted', callbacks.onDeleted);
};

// Daily Logs events
export const subscribeToDailyLogs = (callbacks: {
  onCreated?: (log: unknown) => void;
  onUpdated?: (log: unknown) => void;
  onDeleted?: (data: { id: string }) => void;
}) => {
  if (callbacks.onCreated) subscribeToEvent('daily-logs:created', callbacks.onCreated);
  if (callbacks.onUpdated) subscribeToEvent('daily-logs:updated', callbacks.onUpdated);
  if (callbacks.onDeleted) subscribeToEvent('daily-logs:deleted', callbacks.onDeleted);
};

// Comments events
export const subscribeToComments = (callback: (data: { taskId: string; comment: unknown }) => void) => {
  subscribeToEvent('comments:created', callback);
};

// System events
export const subscribeToSystemReset = (callback: () => void) => {
  subscribeToEvent('system:reset', callback);
};

export default {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  subscribeToEvent,
  unsubscribeFromEvent,
  subscribeToOnlineUsers,
  subscribeToTasks,
  subscribeToNotifications,
  subscribeToUsers,
  subscribeToDepartments,
  subscribeToDailyLogs,
  subscribeToComments,
  subscribeToSystemReset,
};
