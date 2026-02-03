/**
 * Authentication Routes
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../database.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let validPassword = false;
    if (user.password.startsWith('$2')) {
      validPassword = bcrypt.compareSync(password, user.password);
    } else {
      validPassword = password === user.password;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.updateOne(
      { id: user.id },
      { $set: { lastSeen: new Date(), isOnline: 1 } }
    );

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await User.updateOne(
      { id: req.user.id },
      { $set: { isOnline: 0, lastSeen: new Date() } }
    );
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh token
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const token = generateToken(user);
    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ id: req.user.id }).lean();
    let validPassword = false;
    if (user.password.startsWith('$2')) {
      validPassword = bcrypt.compareSync(currentPassword, user.password);
    } else {
      validPassword = currentPassword === user.password;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await User.updateOne({ id: req.user.id }, { $set: { password: hashedPassword } });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
