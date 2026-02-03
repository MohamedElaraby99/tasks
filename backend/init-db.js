/**
 * Initialize Database with Default Data
 * Run: node init-db.js
 */

import { initDatabase, Department, User, Task, Notification } from './database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

console.log('🔄 Initializing database with default data...');

await initDatabase();

// Check if data already exists
const existingCount = await User.countDocuments();
if (existingCount > 0) {
  console.log('⚠️ Database already has data. Skipping initialization.');
  console.log(`   Found ${existingCount} users`);
  process.exit(0);
}

// Create departments
const departments = [
  { id: generateId(), name: 'تكنولوجيا المعلومات', nameEn: 'Information Technology', description: 'قسم تكنولوجيا المعلومات والدعم الفني' },
  { id: generateId(), name: 'الموارد البشرية', nameEn: 'Human Resources', description: 'قسم شؤون الموظفين والتوظيف' },
  { id: generateId(), name: 'المبيعات', nameEn: 'Sales', description: 'قسم المبيعات والتسويق' },
  { id: generateId(), name: 'المحاسبة', nameEn: 'Accounting', description: 'قسم المحاسبة والمالية' },
];

console.log('📁 Creating departments...');
await Department.insertMany(departments);
departments.forEach(dept => console.log(`   ✓ ${dept.name}`));

// Create users
const users = [
  { id: generateId(), name: 'مدير النظام', username: 'admin', password: 'Admin@2024', role: 'admin', departmentId: null, whatsapp: '01026276594' },
  { id: generateId(), name: 'أحمد محمد - المدير التنفيذي', username: 'ahmed.ceo', password: 'Ceo@2024#', role: 'ceo', departmentId: null, whatsapp: '01000000001' },
  { id: generateId(), name: 'محمد علي - مدير IT', username: 'mohamed.it', password: 'Manager@2024#', role: 'manager', departmentId: departments[0].id, whatsapp: '01000000002', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'سارة أحمد - مدير HR', username: 'sara.hr', password: 'Manager@2024#', role: 'manager', departmentId: departments[1].id, whatsapp: '01000000003', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'كريم حسن - قائد فريق', username: 'karim.leader', password: 'Leader@2024#', role: 'team_leader', departmentId: departments[0].id, whatsapp: '01000000004', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'نورا محمد - قائد فريق', username: 'noura.leader', password: 'Leader@2024#', role: 'team_leader', departmentId: departments[1].id, whatsapp: '01000000005', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'علي خالد', username: 'ali.emp', password: 'Employee@2024#', role: 'employee', departmentId: departments[0].id, whatsapp: '01000000006', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'فاطمة سعيد', username: 'fatma.emp', password: 'Employee@2024#', role: 'employee', departmentId: departments[1].id, whatsapp: '01000000007', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: generateId(), name: 'خالد إبراهيم', username: 'khaled.emp', password: 'Employee@2024#', role: 'employee', departmentId: departments[2].id, whatsapp: '01000000008', shiftStart: '09:00', shiftEnd: '17:00' },
];

console.log('👥 Creating users...');
for (const user of users) {
  const hashedPassword = bcrypt.hashSync(user.password, 10);
  await User.create({
    ...user,
    password: hashedPassword,
    whatsapp: user.whatsapp || '',
    shiftStart: user.shiftStart || null,
    shiftEnd: user.shiftEnd || null
  });
  console.log(`   ✓ ${user.name} (${user.username})`);
}

// Create some sample tasks
const itManager = users.find(u => u.username === 'mohamed.it');
const employee1 = users.find(u => u.username === 'ali.emp');
const employee2 = users.find(u => u.username === 'fatma.emp');

const tasks = [
  {
    id: generateId(),
    title: 'تحديث نظام الأمان',
    description: 'تحديث جميع برامج الحماية على أجهزة الشركة',
    priority: 'high',
    status: 'new',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: itManager.id,
    assignedTo: employee1.id,
    departmentId: departments[0].id
  },
  {
    id: generateId(),
    title: 'تجهيز تقرير الموظفين الشهري',
    description: 'إعداد تقرير شامل عن أداء الموظفين للشهر الحالي',
    priority: 'medium',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    createdBy: users.find(u => u.username === 'sara.hr').id,
    assignedTo: employee2.id,
    departmentId: departments[1].id,
    startedAt: new Date()
  },
];

console.log('📋 Creating sample tasks...');
await Task.insertMany(tasks);
tasks.forEach(task => console.log(`   ✓ ${task.title}`));

// Create welcome notifications
console.log('🔔 Creating welcome notifications...');
for (const user of users) {
  await Notification.create({
    id: generateId(),
    userId: user.id,
    title: 'مرحباً بك في نظام إدارة المهام',
    message: 'تم تسجيل حسابك بنجاح. يمكنك الآن استخدام النظام.',
    type: 'info'
  });
}

console.log('');
console.log('========================================');
console.log('✅ Database initialized successfully!');
console.log('========================================');
console.log('');
console.log('📋 Created:');
console.log(`   - ${departments.length} departments`);
console.log(`   - ${users.length} users`);
console.log(`   - ${tasks.length} tasks`);
console.log('');
console.log('🔐 Login Credentials:');
console.log('----------------------------------------');
console.log('| Role         | Username     | Password       |');
console.log('----------------------------------------');
console.log('| Admin        | admin        | Admin@2024     |');
console.log('| CEO          | ahmed.ceo    | Ceo@2024#      |');
console.log('| Manager IT   | mohamed.it   | Manager@2024#  |');
console.log('| Manager HR   | sara.hr      | Manager@2024#  |');
console.log('| Team Leader  | karim.leader | Leader@2024#   |');
console.log('| Team Leader  | noura.leader | Leader@2024#   |');
console.log('| Employee     | ali.emp      | Employee@2024# |');
console.log('| Employee     | fatma.emp    | Employee@2024# |');
console.log('| Employee     | khaled.emp   | Employee@2024# |');
console.log('----------------------------------------');
console.log('');
console.log('🚀 Run the server: node server.js');
console.log('');

process.exit(0);
