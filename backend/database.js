/**
 * MongoDB Database Setup with Mongoose
 * Works with any MongoDB server (local or Atlas).
 */

import mongoose from 'mongoose';
import {
  Department,
  User,
  Task,
  Comment,
  TaskTransfer,
  ActivityLog,
  DailyLog,
  Notification,
  TaskRating,
  Settings
} from './models/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management';

export async function initDatabase() {
  if (mongoose.connection.readyState === 1) {
    return { mongoose, Department, User, Task, Comment, TaskTransfer, ActivityLog, DailyLog, Notification, TaskRating, Settings };
  }
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Database initialized successfully (MongoDB)');
  return { mongoose, Department, User, Task, Comment, TaskTransfer, ActivityLog, DailyLog, Notification, TaskRating, Settings };
}

export {
  Department,
  User,
  Task,
  Comment,
  TaskTransfer,
  ActivityLog,
  DailyLog,
  Notification,
  TaskRating,
  Settings
};

export default {
  initDatabase,
  Department,
  User,
  Task,
  Comment,
  TaskTransfer,
  ActivityLog,
  DailyLog,
  Notification,
  TaskRating,
  Settings
};
