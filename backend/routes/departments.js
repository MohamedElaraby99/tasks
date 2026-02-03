/**
 * Departments Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Department, User, Task, Notification } from '../database.js';
import { verifyToken, requireAdminOrCEO } from '../middleware/auth.js';

const router = express.Router();

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

// Get all departments
router.get('/', verifyToken, async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get department with stats
router.get('/:id/stats', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findOne({ id }).lean();
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const [employeeCount, totalTasks, completedTasks, manager, teamLeaders] = await Promise.all([
      User.countDocuments({ departmentId: id }),
      Task.countDocuments({ departmentId: id }),
      Task.countDocuments({ departmentId: id, status: 'completed' }),
      User.findOne({ departmentId: id, role: 'manager' }).select('id name').lean(),
      User.find({ departmentId: id, role: 'team_leader' }).select('id name').lean()
    ]);

    res.json({
      ...department,
      stats: {
        employeeCount,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      manager,
      teamLeaders
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single department
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const department = await Department.findOne({ id: req.params.id }).lean();
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create department
router.post('/', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const { name, nameEn, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const id = generateId();

    await Department.create({
      id,
      name,
      nameEn: nameEn || null,
      description: description || null
    });

    const newDepartment = await Department.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('departments:created', newDepartment);

    const admins = await User.find({ role: 'admin' }).select('id').lean();
    for (const admin of admins) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: admin.id,
        title: 'قسم جديد',
        message: `تم إضافة القسم: ${name}`,
        type: 'info'
      });
      io.to(`user:${admin.id}`).emit('notification:new', { id: notifId, title: 'قسم جديد', message: `تم إضافة القسم: ${name}` });
    }

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update department
router.put('/:id', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nameEn, description } = req.body;

    const existingDept = await Department.findOne({ id }).lean();
    if (!existingDept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await Department.updateOne(
      { id },
      {
        $set: {
          name: name || existingDept.name,
          nameEn: nameEn !== undefined ? nameEn : existingDept.nameEn,
          description: description !== undefined ? description : existingDept.description
        }
      }
    );

    const updatedDept = await Department.findOne({ id }).lean();

    const io = req.app.get('io');
    io.emit('departments:updated', updatedDept);

    res.json(updatedDept);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete department
router.delete('/:id', verifyToken, requireAdminOrCEO, async (req, res) => {
  try {
    const { id } = req.params;

    const dept = await Department.findOne({ id }).lean();
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await User.updateMany({ departmentId: id }, { $set: { departmentId: null } });
    await Department.deleteOne({ id });

    const io = req.app.get('io');
    io.emit('departments:deleted', { id });

    const admins = await User.find({ role: 'admin' }).select('id').lean();
    for (const admin of admins) {
      const notifId = generateId();
      await Notification.create({
        id: notifId,
        userId: admin.id,
        title: 'حذف قسم',
        message: `تم حذف القسم: ${dept.name}`,
        type: 'info'
      });
      io.to(`user:${admin.id}`).emit('notification:new', { id: notifId, title: 'حذف قسم', message: `تم حذف القسم: ${dept.name}` });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get department performance ranking
router.get('/stats/ranking', verifyToken, async (req, res) => {
  try {
    const departments = await Department.find().lean();
    const rankings = await Promise.all(
      departments.map(async (dept) => {
        const [totalTasks, completedTasks, employeeCount] = await Promise.all([
          Task.countDocuments({ departmentId: dept.id }),
          Task.countDocuments({ departmentId: dept.id, status: 'completed' }),
          User.countDocuments({ departmentId: dept.id })
        ]);
        return {
          ...dept,
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          employeeCount
        };
      })
    );
    rankings.sort((a, b) => b.completionRate - a.completionRate);
    res.json(rankings);
  } catch (error) {
    console.error('Get department ranking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
