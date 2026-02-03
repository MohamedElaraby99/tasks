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

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'task-management';
  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
  if (user && password) {
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(password);
    return `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${db}?authSource=${authSource}`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

const MONGODB_URI = getMongoUri();

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
