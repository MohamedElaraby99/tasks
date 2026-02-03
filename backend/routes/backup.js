/**
 * Backup & Restore Routes
 */

import mongoose from 'mongoose';
import express from 'express';
import {
  User,
  Department,
  Task,
  Comment,
  Notification,
  DailyLog,
  TaskRating,
  TaskTransfer,
  ActivityLog,
  Settings
} from '../database.js';
import { verifyToken, requireAdmin, verifyAdminPassword } from '../middleware/auth.js';

const router = express.Router();

// Create backup (Admin only)
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [users, departments, tasks, comments, notifications, dailyLogs, taskRatings, taskTransfers, activityLogs, settings] =
      await Promise.all([
        User.find().lean(),
        Department.find().lean(),
        Task.find().lean(),
        Comment.find().lean(),
        Notification.find().lean(),
        DailyLog.find().lean(),
        TaskRating.find().lean(),
        TaskTransfer.find().lean(),
        ActivityLog.find().lean(),
        Settings.find().lean()
      ]);

    const backup = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      exportedBy: req.user.id,
      data: {
        users: users.map(({ password, ...user }) => ({ ...user, password: '***' })),
        departments,
        tasks,
        comments,
        notifications,
        dailyLogs,
        taskRatings,
        taskTransfers,
        activityLogs,
        settings
      }
    };

    res.json(backup);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore backup (Admin only)
router.post('/import', verifyToken, requireAdmin, verifyAdminPassword, async (req, res) => {
  try {
    const { backup } = req.body;

    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Invalid backup data' });
    }

    const session = await mongoose.connection.startSession();
    session.startTransaction();
    try {
      await ActivityLog.deleteMany({}).session(session);
      await TaskTransfer.deleteMany({}).session(session);
      await TaskRating.deleteMany({}).session(session);
      await Comment.deleteMany({}).session(session);
      await DailyLog.deleteMany({}).session(session);
      await Notification.deleteMany({}).session(session);
      await Task.deleteMany({}).session(session);
      await User.deleteMany({ role: { $ne: 'admin' } }).session(session);
      await Department.deleteMany({}).session(session);
      await Settings.deleteMany({}).session(session);

      if (backup.data.departments?.length) {
        await Department.insertMany(backup.data.departments, { session });
      }

      if (backup.data.users?.length) {
        const usersToInsert = backup.data.users.filter((u) => u.role !== 'admin' && u.password !== '***');
        if (usersToInsert.length) {
          await User.insertMany(usersToInsert, { session });
        }
      }

      if (backup.data.tasks?.length) {
        await Task.insertMany(backup.data.tasks, { session });
      }

      if (backup.data.comments?.length) {
        await Comment.insertMany(backup.data.comments, { session });
      }

      if (backup.data.dailyLogs?.length) {
        await DailyLog.insertMany(backup.data.dailyLogs, { session });
      }

      if (backup.data.taskRatings?.length) {
        await TaskRating.insertMany(backup.data.taskRatings, { session });
      }

      if (backup.data.taskTransfers?.length) {
        await TaskTransfer.insertMany(backup.data.taskTransfers, { session });
      }

      if (backup.data.activityLogs?.length) {
        await ActivityLog.insertMany(backup.data.activityLogs, { session });
      }

      if (backup.data.notifications?.length) {
        await Notification.insertMany(backup.data.notifications, { session });
      }

      if (backup.data.settings?.length) {
        await Settings.insertMany(backup.data.settings, { session });
      }

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset all data (Admin only)
router.post('/reset', verifyToken, requireAdmin, verifyAdminPassword, async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    await TaskTransfer.deleteMany({});
    await TaskRating.deleteMany({});
    await Comment.deleteMany({});
    await DailyLog.deleteMany({});
    await Notification.deleteMany({});
    await Task.deleteMany({});
    await User.deleteMany({ role: { $ne: 'admin' } });
    await Department.deleteMany({});
    await Settings.deleteMany({});

    const io = req.app.get('io');
    io.emit('system:reset');

    res.json({ message: 'All data has been reset' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
