# 🚀 Task Management System - Node.js Backend

نظام إدارة المهام - الـ Backend مبني بـ Node.js + Express + SQLite

**تطوير: Mohamed Alaa**

---

## 📋 المتطلبات

- **Node.js v18 أو v20 أو v22 (LTS)** — يُفضّل استخدام إصدار LTS وليس Node 24/25
- npm أو yarn
- Linux Mint / Ubuntu / أي توزيعة Linux (أو Windows مع Node LTS)

### تثبيت على Windows

مكتبة SQLite المستخدمة تحتاج إلى **ثنائيات جاهزة (prebuilds)** أو أدوات بناء C++. لتجنّب تثبيت Visual Studio:

1. استخدم **Node.js 20 أو 22 LTS** (مثلاً من [nodejs.org](https://nodejs.org)).
2. أو مع nvm-windows: `nvm install 22` ثم `nvm use 22`.
3. بعدها نفّذ `npm install` — ستُحمّل الثنائيات الجاهزة ولن تحتاج إلى Visual Studio.

---

## 🛠️ التثبيت

### 1. نسخ الملفات

```bash
# انقل مجلد backend إلى السيرفر
scp -r backend/ user@server:~/task-manager-backend/
```

### 2. تثبيت المكتبات

```bash
cd ~/task-manager-backend
npm install
```

### 3. إنشاء ملف الإعدادات

```bash
cp .env.example .env
nano .env
```

عدّل الملف حسب احتياجاتك:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this
ADMIN_PASSWORD=Admin@2024#Secure
FRONTEND_URL=http://localhost:3000
DB_PATH=./database.sqlite
```

### 4. إنشاء قاعدة البيانات والبيانات الأولية

```bash
npm run init-db
```

### 5. تشغيل السيرفر

```bash
# للتطوير (يعيد التشغيل تلقائياً)
npm run dev

# للإنتاج
npm start
```

---

## 🌐 الـ API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | تسجيل الدخول |
| POST | `/api/auth/logout` | تسجيل الخروج |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| POST | `/api/auth/refresh` | تجديد الـ Token |
| POST | `/api/auth/change-password` | تغيير كلمة المرور |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | جميع المستخدمين (Admin/CEO) |
| GET | `/api/users/:id` | مستخدم محدد |
| POST | `/api/users` | إضافة مستخدم (Admin/CEO) |
| PUT | `/api/users/:id` | تعديل مستخدم |
| DELETE | `/api/users/:id` | حذف مستخدم (Admin/CEO) |
| GET | `/api/users/stats/top-performers` | أفضل الموظفين |

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | جميع الأقسام |
| GET | `/api/departments/:id` | قسم محدد |
| GET | `/api/departments/:id/stats` | إحصائيات القسم |
| POST | `/api/departments` | إضافة قسم (Admin/CEO) |
| PUT | `/api/departments/:id` | تعديل قسم (Admin/CEO) |
| DELETE | `/api/departments/:id` | حذف قسم (Admin/CEO) |
| GET | `/api/departments/stats/ranking` | ترتيب الأقسام |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | المهام (حسب الصلاحيات) |
| GET | `/api/tasks/:id` | مهمة محددة |
| POST | `/api/tasks` | إضافة مهمة |
| PUT | `/api/tasks/:id` | تعديل مهمة |
| PATCH | `/api/tasks/:id/status` | تغيير حالة المهمة |
| POST | `/api/tasks/:id/transfer` | تحويل المهمة |
| POST | `/api/tasks/:id/rate` | تقييم المهمة |
| POST | `/api/tasks/:id/comments` | إضافة تعليق |
| DELETE | `/api/tasks/:id` | حذف المهمة |
| GET | `/api/tasks/stats/overview` | إحصائيات المهام |

### Daily Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/daily-logs` | السجلات اليومية |
| GET | `/api/daily-logs/my` | سجلاتي |
| POST | `/api/daily-logs` | إضافة سجل |
| PUT | `/api/daily-logs/:id` | تعديل سجل |
| POST | `/api/daily-logs/:id/rate` | تقييم سجل |
| DELETE | `/api/daily-logs/:id` | حذف سجل |
| GET | `/api/daily-logs/stats/summary` | إحصائيات |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | الإشعارات |
| GET | `/api/notifications/unread-count` | عدد غير المقروءة |
| PATCH | `/api/notifications/:id/read` | تحديد كمقروء |
| PATCH | `/api/notifications/read-all` | قراءة الكل |

### Backup

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/backup/export` | تصدير البيانات (Admin) |
| POST | `/api/backup/import` | استيراد البيانات (Admin) |
| POST | `/api/backup/reset` | إعادة تعيين (Admin) |

---

## 🔌 WebSocket Events

### Emitted by Server

| Event | Description |
|-------|-------------|
| `users:created` | مستخدم جديد |
| `users:updated` | تحديث مستخدم |
| `users:deleted` | حذف مستخدم |
| `users:online` | قائمة المتصلين |
| `departments:created` | قسم جديد |
| `departments:updated` | تحديث قسم |
| `departments:deleted` | حذف قسم |
| `tasks:created` | مهمة جديدة |
| `tasks:updated` | تحديث مهمة |
| `tasks:deleted` | حذف مهمة |
| `comments:created` | تعليق جديد |
| `notification:new` | إشعار جديد |
| `daily-logs:created` | سجل جديد |
| `daily-logs:updated` | تحديث سجل |
| `daily-logs:deleted` | حذف سجل |

### Received by Server

| Event | Description |
|-------|-------------|
| `user:online` | المستخدم متصل |
| `join:department` | انضمام لغرفة القسم |
| `join:user` | انضمام لغرفة المستخدم |

---

## 🔐 التأمين

- **JWT Authentication** - توكن يصلح لـ 24 ساعة
- **Rate Limiting** - 1000 طلب كل 15 دقيقة
- **Helmet** - Security headers
- **CORS** - محدد لـ Frontend فقط
- **Password Hashing** - bcrypt

---

## 📁 هيكل الملفات

```
backend/
├── server.js           # السيرفر الرئيسي
├── database.js         # إعداد قاعدة البيانات
├── init-db.js          # إنشاء البيانات الأولية
├── package.json        # المكتبات
├── .env.example        # مثال الإعدادات
├── middleware/
│   └── auth.js         # التحقق من الهوية
└── routes/
    ├── auth.js         # تسجيل الدخول
    ├── users.js        # المستخدمين
    ├── departments.js  # الأقسام
    ├── tasks.js        # المهام
    ├── notifications.js # الإشعارات
    ├── dailyLogs.js    # السجل اليومي
    └── backup.js       # النسخ الاحتياطي
```

---

## 🚀 تشغيل كـ Service

### إنشاء systemd service

```bash
sudo nano /etc/systemd/system/task-manager-api.service
```

```ini
[Unit]
Description=Task Manager API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/task-manager-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable task-manager-api
sudo systemctl start task-manager-api
```

---

## 📞 الدعم

- **واتساب**: 01026276594
- **المطور**: Mohamed Alaa

---

## 📝 الحسابات التجريبية

| الدور | اسم المستخدم | كلمة المرور |
|-------|-------------|-------------|
| Admin | admin | Admin@2024 |
| CEO | ahmed.ceo | Ceo@2024# |
| Manager IT | mohamed.it | Manager@2024# |
| Manager HR | sara.hr | Manager@2024# |
| Team Leader | karim.leader | Leader@2024# |
| Team Leader | noura.leader | Leader@2024# |
| Employee | ali.emp | Employee@2024# |
| Employee | fatma.emp | Employee@2024# |
| Employee | khaled.emp | Employee@2024# |

**كلمة سر حذف البيانات (Admin):** `Admin@2024#Secure`
