/**
 * Users Routes
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, Notification } from '../database.js';
import { verifyToken, requireAdminOrCEO } from '../middleware/auth.js';

const router = express.Router();

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

const userProjection = 'id name username role departmentId whatsapp shiftStart shiftEnd rating completedTasks totalTasks isOnline lastSeen createdAt';

// Get all users
router.get('/', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const users = await User.find().select(userProjection).sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users by department
router.get('/department/:departmentId', verifyToken, async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!['admin', 'ceo'].includes(req.user.role) && req.user.departmentId !== departmentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const users = await User.find({ departmentId }).select(userProjection).sort({ name: 1 }).lean();
    res.json(users);
  } catch (error) {
    console.error('Get department users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).select(userProjection).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const { name, username, password, role, departmentId, whatsapp, shiftStart, shiftEnd } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = generateId();

    await User.create({
      id,
      name,
      username,
      password: hashedPassword,
      role: role || 'employee',
      departmentId: departmentId || null,
      whatsapp: whatsapp || '',
      shiftStart: shiftStart || null,
      shiftEnd: shiftEnd || null
    });

    const newUser = await User.findOne({ id }).select(userProjection).lean();

    const io = req.app.get('io');
    io.emit('users:created', newUser);

    const admins = await User.find({ role: 'admin' }).select('id').lean();
    for (const admin of admins) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: admin.id,
        title: 'مستخدم جديد',
        message: `تم إضافة المستخدم: ${name}`,
        type: 'info'
      });
      io.to(`user:${admin.id}`).emit('notification:new', { id: notifId, title: 'مستخدم جديد', message: `تم إضافة المستخدم: ${name}` });
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, role, departmentId, whatsapp, shiftStart, shiftEnd } = req.body;

    if (!['admin', 'ceo'].includes(req.user.role) && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existingUser = await User.findOne({ id }).lean();
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await User.findOne({ username, id: { $ne: id } });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    let updatePassword = existingUser.password;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updatePassword = bcrypt.hashSync(password, 10);
    }

    await User.updateOne(
      { id },
      {
        $set: {
          name: name || existingUser.name,
          username: username || existingUser.username,
          password: updatePassword,
          role: role || existingUser.role,
          departmentId: departmentId !== undefined ? departmentId : existingUser.departmentId,
          whatsapp: whatsapp !== undefined ? whatsapp : existingUser.whatsapp,
          shiftStart: shiftStart !== undefined ? shiftStart : existingUser.shiftStart,
          shiftEnd: shiftEnd !== undefined ? shiftEnd : existingUser.shiftEnd
        }
      }
    );

    const updatedUser = await User.findOne({ id }).select(userProjection).lean();

    const io = req.app.get('io');
    io.emit('users:updated', updatedUser);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ id }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }

    await User.deleteOne({ id });

    const io = req.app.get('io');
    io.emit('users:deleted', { id });

    const admins = await User.find({ role: 'admin' }).select('id').lean();
    for (const admin of admins) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: admin.id,
        title: 'حذف مستخدم',
        message: `تم حذف المستخدم: ${user.name}`,
        type: 'info'
      });
      io.to(`user:${admin.id}`).emit('notification:new', { id: notifId, title: 'حذف مستخدم', message: `تم حذف المستخدم: ${user.name}` });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get top performers
router.get('/stats/top-performers', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const topUsers = await User.find({ role: { $in: ['employee', 'team_leader'] } })
      .select('id name role departmentId rating completedTasks totalTasks')
      .sort({ rating: -1, completedTasks: -1 })
      .limit(limit)
      .lean();
    res.json(topUsers);
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
