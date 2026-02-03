-- =====================================================
-- 🚀 SUPABASE DATABASE SETUP
-- Task Management System - Developed by Mohamed Alaa
-- =====================================================

-- 1️⃣ جدول الأقسام (Departments)
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'ceo', 'manager', 'team_leader', 'employee')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  phone TEXT,
  shift_start TEXT,
  shift_end TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ جدول المهام (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('new', 'seen', 'in_progress', 'paused', 'completed', 'rejected')),
  progress INTEGER DEFAULT 0,
  due_date DATE,
  pause_reason TEXT,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  seen_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  completion_rating INTEGER CHECK (completion_rating >= 1 AND completion_rating <= 5),
  creator_rating INTEGER CHECK (creator_rating >= 1 AND creator_rating <= 5),
  rated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ جدول تحويلات المهام (Task Transfers)
CREATE TABLE IF NOT EXISTS task_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ جدول التعليقات (Comments)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6️⃣ جدول سجل العمل اليومي (Daily Logs)
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'paused', 'completed')),
  pause_reason TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7️⃣ جدول الإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8️⃣ جدول الإعدادات (Settings)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 🔐 ROW LEVEL SECURITY (RLS)
-- =====================================================

-- تفعيل RLS على كل الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة والكتابة (للتبسيط، نسمح بكل شيء للمستخدمين المصادق عليهم)
-- يمكنك تعديل هذه السياسات حسب احتياجاتك

CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON departments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON task_transfers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON comments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON daily_logs FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON settings FOR ALL USING (true);

-- =====================================================
-- 📊 INDEXES للأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- =====================================================
-- 👤 إضافة المستخدم الافتراضي (Admin)
-- =====================================================

INSERT INTO users (username, password, name, role, phone)
VALUES ('admin', 'Admin@2024', 'مدير النظام', 'admin', '01026276594')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 🎉 تم الانتهاء!
-- =====================================================
