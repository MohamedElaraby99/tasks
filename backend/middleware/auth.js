/**
 * JWT Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import { User } from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ id: decoded.id }).lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId ? String(user.departmentId) : null
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user has required role
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is admin or CEO
export const requireAdminOrCEO = (req, res, next) => {
  if (!req.user || !['admin', 'ceo'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or CEO access required' });
  }
  next();
};

// Check if user can manage department
export const canManageDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const allowedRoles = ['admin', 'ceo', 'manager', 'team_leader'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Generate JWT token
export const generateToken = (user) => {
  const id = user.id || user._id?.toString();
  const departmentId = user.departmentId ? String(user.departmentId) : null;
  return jwt.sign(
    {
      id,
      username: user.username,
      role: user.role,
      departmentId
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify admin password for dangerous operations
export const verifyAdminPassword = (req, res, next) => {
  const { adminPassword } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD || 'Admin@2024#Secure';

  if (adminPassword !== correctPassword) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }

  next();
};
