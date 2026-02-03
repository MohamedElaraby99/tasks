/**
 * Tasks Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  Comment,
  TaskTransfer,
  ActivityLog,
  User,
  Notification,
  TaskRating
} from '../database.js';
import { verifyToken, canManageDepartment } from '../middleware/auth.js';

const router = express.Router();

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

async function enrichTasksWithRelated(tasks) {
  return Promise.all(
    tasks.map(async (task) => {
      const [comments, transfers, activityLog] = await Promise.all([
        Comment.find({ taskId: task.id }).sort({ createdAt: 1 }).lean(),
        TaskTransfer.find({ taskId: task.id }).sort({ timestamp: -1 }).lean(),
        ActivityLog.find({ taskId: task.id }).sort({ timestamp: -1 }).lean()
      ]);
      return { ...task, comments, transfers, activityLog };
    })
  );
}

// Get tasks based on user role
router.get('/', verifyToken, async (req, res) => {
  try {
    let filter = {};

    if (['admin', 'ceo'].includes(req.user.role)) {
      // all tasks
    } else if (['manager', 'team_leader'].includes(req.user.role)) {
      filter = {
        $or: [
          { departmentId: req.user.departmentId },
          { assignedTo: req.user.id },
          { createdBy: req.user.id }
        ]
      };
    } else {
      filter = { assignedTo: req.user.id };
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    const enriched = await enrichTasksWithRelated(tasks);
    res.json(enriched);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single task
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const [comments, transfers, activityLog] = await Promise.all([
      Comment.find({ taskId: task.id }).sort({ createdAt: 1 }).lean(),
      TaskTransfer.find({ taskId: task.id }).sort({ timestamp: -1 }).lean(),
      ActivityLog.find({ taskId: task.id }).sort({ timestamp: -1 }).lean()
    ]);

    res.json({ ...task, comments, transfers, activityLog });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', verifyToken, canManageDepartment, async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo, departmentId } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ error: 'Title and assignee are required' });
    }

    const id = generateId();
    const now = new Date();

    await Task.create({
      id,
      title,
      description: description || '',
      priority: priority || 'medium',
      status: 'new',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id,
      assignedTo,
      departmentId: departmentId || req.user.departmentId,
      createdAt: now,
      updatedAt: now
    });

    const logId = generateId();
    await ActivityLog.create({
      id: logId,
      taskId: id,
      userId: req.user.id,
      action: 'تم إنشاء المهمة',
      timestamp: now
    });

    await User.updateOne({ id: assignedTo }, { $inc: { totalTasks: 1 } });

    const notifId = generateId();
    await Notification.create({
      id: notifId,
      userId: assignedTo,
      title: 'مهمة جديدة',
      message: `تم تكليفك بمهمة: ${title}`,
      type: 'task',
      taskId: id
    });

    const newTask = await Task.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('tasks:created', newTask);
    io.to(`user:${assignedTo}`).emit('notification:new', {
      id: notifId,
      title: 'مهمة جديدة',
      message: `تم تكليفك بمهمة: ${title}`,
      type: 'task',
      taskId: id
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const canUpdate =
      ['admin', 'ceo'].includes(req.user.role) ||
      task.createdBy === req.user.id ||
      task.assignedTo === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();

    await Task.updateOne(
      { id },
      {
        $set: {
          title: updates.title || task.title,
          description: updates.description !== undefined ? updates.description : task.description,
          priority: updates.priority || task.priority,
          progress: updates.progress !== undefined ? updates.progress : task.progress,
          dueDate: updates.dueDate !== undefined ? (updates.dueDate ? new Date(updates.dueDate) : null) : task.dueDate,
          updatedAt: now
        }
      }
    );

    const updatedTask = await Task.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('tasks:updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!['admin', 'ceo'].includes(req.user.role) && task.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const statusLabels = {
      new: 'جديدة',
      seen: 'تم الاستلام',
      in_progress: 'قيد التنفيذ',
      paused: 'متوقفة',
      completed: 'مكتملة',
      rejected: 'مرفوضة'
    };

    const update = {
      status,
      updatedAt: now
    };

    switch (status) {
      case 'seen':
        update.seenAt = now;
        break;
      case 'in_progress':
        update.startedAt = now;
        break;
      case 'paused':
        update.pausedAt = now;
        update.pauseReason = reason || null;
        break;
      case 'completed':
        update.completedAt = now;
        update.progress = 100;
        await User.updateOne({ id: task.assignedTo }, { $inc: { completedTasks: 1 } });
        break;
      case 'rejected':
        update.rejectReason = reason || null;
        break;
    }

    await Task.updateOne({ id }, { $set: update });

    const logId = generateId();
    await ActivityLog.create({
      id: logId,
      taskId: id,
      userId: req.user.id,
      action: `تم تغيير الحالة إلى ${statusLabels[status]}`,
      details: reason || null,
      timestamp: now
    });

    if (task.createdBy !== req.user.id) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: task.createdBy,
        title: 'تحديث المهمة',
        message: `تم تغيير حالة "${task.title}" إلى ${statusLabels[status]}`,
        type: 'status',
        taskId: id
      });
      const io = req.app.get('io');
      io.to(`user:${task.createdBy}`).emit('notification:new', {
        id: notifId,
        title: 'تحديث المهمة',
        message: `تم تغيير حالة "${task.title}" إلى ${statusLabels[status]}`,
        type: 'status',
        taskId: id
      });
    }

    const updatedTask = await Task.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('tasks:updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Transfer task
router.post('/:id/transfer', verifyToken, canManageDepartment, async (req, res) => {
  try {
    const { id } = req.params;
    const { toUserId, reason } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: 'Target user is required' });
    }

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = new Date();
    const transferId = generateId();

    await TaskTransfer.create({
      id: transferId,
      taskId: id,
      fromUserId: task.assignedTo,
      toUserId,
      transferredBy: req.user.id,
      reason: reason || null,
      timestamp: now
    });

    await Task.updateOne({ id }, { $set: { assignedTo: toUserId, updatedAt: now } });

    await User.updateOne({ id: task.assignedTo }, { $inc: { totalTasks: -1 } });
    await User.updateOne({ id: toUserId }, { $inc: { totalTasks: 1 } });

    const fromUser = await User.findOne({ id: task.assignedTo }).select('name').lean();
    const toUser = await User.findOne({ id: toUserId }).select('name').lean();

    const logId = generateId();
    await ActivityLog.create({
      id: logId,
      taskId: id,
      userId: req.user.id,
      action: `تم تحويل المهمة من ${fromUser?.name} إلى ${toUser?.name}`,
      details: reason || null,
      timestamp: now
    });

    const notifId1 = generateId();
    await Notification.create({
      id: notifId1,
      userId: toUserId,
      title: 'مهمة محولة إليك',
      message: `تم تحويل المهمة "${task.title}" إليك`,
      type: 'task',
      taskId: id
    });

    const notifId2 = generateId();
    await Notification.create({
      id: notifId2,
      userId: task.assignedTo,
      title: 'تم تحويل مهمتك',
      message: `تم تحويل المهمة "${task.title}" إلى ${toUser?.name}`,
      type: 'task',
      taskId: id
    });

    const io = req.app.get('io');
    io.to(`user:${toUserId}`).emit('notification:new', { id: notifId1, title: 'مهمة محولة إليك', type: 'task' });
    io.to(`user:${task.assignedTo}`).emit('notification:new', { id: notifId2, title: 'تم تحويل مهمتك', type: 'task' });

    const updatedTask = await Task.findOne({ id }).lean();
    io.emit('tasks:updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error('Transfer task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate task
router.post('/:id/rate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, type, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!['admin', 'ceo'].includes(req.user.role) && task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ratingId = generateId();
    const now = new Date();

    await TaskRating.create({
      id: ratingId,
      taskId: id,
      ratedBy: req.user.id,
      rating,
      type: type || 'quality',
      comment: comment || null,
      createdAt: now
    });

    await Task.updateOne({ id }, { $set: { creatorRating: rating } });

    const ratingsAgg = await TaskRating.aggregate([
      { $lookup: { from: 'tasks', localField: 'taskId', foreignField: 'id', as: 't' } },
      { $unwind: '$t' },
      { $match: { 't.assignedTo': task.assignedTo } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    if (ratingsAgg.length > 0 && ratingsAgg[0].avgRating != null) {
      const avgRating = Math.round(ratingsAgg[0].avgRating * 10) / 10;
      await User.updateOne({ id: task.assignedTo }, { $set: { rating: avgRating } });
    }

    const notifId = generateId();
    await Notification.create({
      id: notifId,
      userId: task.assignedTo,
      title: 'تقييم جديد',
      message: `تم تقييم مهمتك "${task.title}" بـ ${rating}/5`,
      type: 'status',
      taskId: id
    });

    const io = req.app.get('io');
    io.to(`user:${task.assignedTo}`).emit('notification:new', {
      id: notifId,
      title: 'تقييم جديد',
      message: `تم تقييم مهمتك بـ ${rating}/5`,
      type: 'status'
    });

    res.json({ message: 'Task rated successfully', rating });
  } catch (error) {
    console.error('Rate task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const commentId = generateId();
    const now = new Date();

    await Comment.create({
      id: commentId,
      taskId: id,
      userId: req.user.id,
      content,
      createdAt: now
    });

    const comment = await Comment.findOne({ id: commentId }).lean();

    const notifyUsers = [task.createdBy, task.assignedTo].filter((userId) => userId !== req.user.id);
    for (const userId of notifyUsers) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId,
        title: 'تعليق جديد',
        message: `تعليق جديد على "${task.title}"`,
        type: 'comment',
        taskId: id
      });
      const io = req.app.get('io');
      io.to(`user:${userId}`).emit('notification:new', {
        id: notifId,
        title: 'تعليق جديد',
        message: `تعليق جديد على "${task.title}"`,
        type: 'comment',
        taskId: id
      });
    }

    const io = req.app.get('io');
    io.emit('comments:created', { taskId: id, comment });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ id }).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let canDelete = false;
    if (req.user.role === 'admin') {
      canDelete = true;
    } else if (req.user.role === 'ceo' && !task.seenAt) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await User.updateOne({ id: task.assignedTo }, { $inc: { totalTasks: -1 } });
    if (task.status === 'completed') {
      await User.updateOne({ id: task.assignedTo }, { $inc: { completedTasks: -1 } });
    }

    await Promise.all([
      Comment.deleteMany({ taskId: id }),
      TaskTransfer.deleteMany({ taskId: id }),
      ActivityLog.deleteMany({ taskId: id }),
      TaskRating.deleteMany({ taskId: id }),
      Task.deleteOne({ id })
    ]);

    const admins = await User.find({ role: 'admin' }).select('id').lean();
    for (const admin of admins) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: admin.id,
        title: 'حذف مهمة',
        message: `تم حذف المهمة: ${task.title}`,
        type: 'info'
      });
    }

    const io = req.app.get('io');
    io.emit('tasks:deleted', { id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task statistics
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    let filter = {};

    if (!['admin', 'ceo'].includes(req.user.role)) {
      if (['manager', 'team_leader'].includes(req.user.role)) {
        filter = {
          $or: [{ departmentId: req.user.departmentId }, { assignedTo: req.user.id }]
        };
      } else {
        filter = { assignedTo: req.user.id };
      }
    }

    const todayStart = new Date(new Date().toISOString().split('T')[0]);

    const [total, newTasks, inProgress, completed, paused, overdue] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: 'new' }),
      Task.countDocuments({ ...filter, status: 'in_progress' }),
      Task.countDocuments({ ...filter, status: 'completed' }),
      Task.countDocuments({ ...filter, status: 'paused' }),
      Task.countDocuments({
        ...filter,
        dueDate: { $lt: todayStart },
        status: { $ne: 'completed' }
      })
    ]);

    res.json({
      total,
      new: newTasks,
      inProgress,
      completed,
      paused,
      overdue
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
