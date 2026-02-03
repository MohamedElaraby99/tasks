/**
 * Daily Logs Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DailyLog, User, Notification } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

// Get daily logs based on user role
router.get('/', verifyToken, async (req, res) => {
  try {
    const { date, userId, departmentId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = {};

    if (['admin', 'ceo'].includes(req.user.role)) {
      if (userId) {
        query.userId = userId;
      } else if (departmentId) {
        const deptUsers = await User.find({ departmentId }).select('id').lean();
        query.userId = { $in: deptUsers.map((u) => u.id) };
      }
    } else if (['manager', 'team_leader'].includes(req.user.role)) {
      const deptUsers = await User.find({ departmentId: req.user.departmentId }).select('id').lean();
      query.userId = { $in: deptUsers.map((u) => u.id) };
    } else {
      query.userId = req.user.id;
    }

    query.$or = [
      { startDate: targetDate },
      {
        startDate: { $lte: targetDate },
        $or: [{ endDate: null }, { endDate: { $gte: targetDate } }]
      }
    ];

    const logs = await DailyLog.find(query).sort({ createdAt: -1 }).lean();
    res.json(logs);
  } catch (error) {
    console.error('Get daily logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my logs
router.get('/my', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const logs = await DailyLog.find({
      userId: req.user.id,
      $or: [
        { startDate: targetDate },
        {
          startDate: { $lte: targetDate },
          $or: [{ endDate: null }, { endDate: { $gte: targetDate } }]
        }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(logs);
  } catch (error) {
    console.error('Get my logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single log
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const log = await DailyLog.findOne({ id: req.params.id }).lean();
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(log);
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create daily log
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, status, startDate, endDate, pauseReason } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and start date are required' });
    }

    if (status === 'paused' && !pauseReason) {
      return res.status(400).json({ error: 'Pause reason is required when status is paused' });
    }

    const id = generateId();
    const now = new Date();

    await DailyLog.create({
      id,
      userId: req.user.id,
      title,
      description: description || null,
      status: status || 'in_progress',
      startDate,
      endDate: endDate || null,
      pauseReason: pauseReason || null,
      createdAt: now,
      updatedAt: now
    });

    const newLog = await DailyLog.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('daily-logs:created', newLog);

    res.status(201).json(newLog);
  } catch (error) {
    console.error('Create daily log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update daily log
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, startDate, endDate, pauseReason } = req.body;

    const log = await DailyLog.findOne({ id }).lean();
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (log.userId !== req.user.id && !['admin', 'ceo'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (status === 'paused' && !pauseReason && !log.pauseReason) {
      return res.status(400).json({ error: 'Pause reason is required when status is paused' });
    }

    const now = new Date();

    await DailyLog.updateOne(
      { id },
      {
        $set: {
          title: title || log.title,
          description: description !== undefined ? description : log.description,
          status: status || log.status,
          startDate: startDate || log.startDate,
          endDate: endDate !== undefined ? endDate : log.endDate,
          pauseReason: pauseReason !== undefined ? pauseReason : log.pauseReason,
          updatedAt: now
        }
      }
    );

    const updatedLog = await DailyLog.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('daily-logs:updated', updatedLog);

    res.json(updatedLog);
  } catch (error) {
    console.error('Update daily log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate daily log
router.post('/:id/rate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const log = await DailyLog.findOne({ id }).lean();
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (!['admin', 'ceo', 'manager', 'team_leader'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await DailyLog.updateOne({ id }, { $set: { rating, ratedBy: req.user.id } });

    const notifId = generateId();
    await Notification.create({
      id: notifId,
      userId: log.userId,
      title: 'تقييم جديد',
      message: `تم تقييم نشاطك "${log.title}" بـ ${rating}/5`,
      type: 'status'
    });

    const io = req.app.get('io');
    io.to(`user:${log.userId}`).emit('notification:new', {
      id: notifId,
      title: 'تقييم جديد',
      message: `تم تقييم نشاطك بـ ${rating}/5`
    });

    const updatedLog = await DailyLog.findOne({ id }).lean();
    res.json(updatedLog);
  } catch (error) {
    console.error('Rate daily log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete daily log
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await DailyLog.findOne({ id }).lean();
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (log.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await DailyLog.deleteOne({ id });

    const io = req.app.get('io');
    io.emit('daily-logs:deleted', { id });

    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('Delete daily log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let match = {
      $or: [
        { startDate: targetDate },
        {
          startDate: { $lte: targetDate },
          $or: [{ endDate: null }, { endDate: { $gte: targetDate } }]
        }
      ]
    };

    if (!['admin', 'ceo'].includes(req.user.role)) {
      match.userId = req.user.id;
    }

    const logs = await DailyLog.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const stats = { completed: 0, in_progress: 0, paused: 0 };
    logs.forEach((log) => {
      stats[log._id] = log.count;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
