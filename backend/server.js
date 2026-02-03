/**
 * Task Management System - Node.js Backend
 * Developed by Mohamed Alaa
 *
 * Features:
 * - Express.js REST API
 * - MongoDB Database with Mongoose
 * - JWT Authentication
 * - Real-time updates with Socket.io
 * - Rate limiting & Security headers
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import departmentsRoutes from './routes/departments.js';
import tasksRoutes from './routes/tasks.js';
import notificationsRoutes from './routes/notifications.js';
import dailyLogsRoutes from './routes/dailyLogs.js';
import backupRoutes from './routes/backup.js';

// Import database (must call initDatabase() before using)
import db, { initDatabase } from './database.js';

const app = express();
const httpServer = createServer(app);

// CORS - allow frontend dev (Vite 5173) and production (3000)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// Socket.io setup
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], credentials: true }
});

app.set('io', io);

// ==================== MIDDLEWARE ====================

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan('combined'));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

// Rate limiting - skip for login so auth isn't blocked (e.g. after many requests from a loop)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.method === 'POST' && (req.path === '/api/auth/login' || req.originalUrl === '/api/auth/login'),
});
app.use(limiter);

// Stricter limit for login only (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many login attempts. Try again later.' },
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/daily-logs', dailyLogsRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    developer: 'Mohamed Alaa'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SOCKET.IO ====================

// Online users tracking
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // User comes online
  socket.on('user:online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`User ${userId} is online`);
  });

  // User goes offline
  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('users:online', Array.from(onlineUsers.keys()));
        console.log(`User ${userId} went offline`);
        break;
      }
    }
  });

  // Join room (for department-specific updates)
  socket.on('join:department', (departmentId) => {
    socket.join(`dept:${departmentId}`);
  });

  // Join personal room
  socket.on('join:user', (userId) => {
    socket.join(`user:${userId}`);
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

async function start() {
  await initDatabase();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('🚀 Task Management System Backend');
    console.log('========================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log('========================================');
    console.log('👨‍💻 Developed by Mohamed Alaa');
    console.log('========================================');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { io };
