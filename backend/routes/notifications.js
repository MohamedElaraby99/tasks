/**
 * Notifications Routes
 */

import express from 'express';
import { Notification } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: 0 });
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({ id, userId: req.user.id });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await Notification.updateOne({ id }, { $set: { read: 1 } });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id }, { $set: { read: 1 } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete old notifications
router.delete('/cleanup', verifyToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await Notification.deleteMany({
      userId: req.user.id,
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.json({ message: 'Old notifications deleted' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
