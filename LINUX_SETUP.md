# 🐧 دليل تثبيت النظام على Linux Mint

## 📋 المتطلبات

- Linux Mint (أو أي توزيعة Linux)
- Node.js v18+
- npm أو yarn

---

## 🚀 الخطوة 1: تثبيت المتطلبات

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت unzip (لفك ضغط PocketBase)
sudo apt install -y unzip wget
```

---

## 🗄️ الخطوة 2: تثبيت PocketBase (Backend + Database)

```bash
# إنشاء مجلد للمشروع
mkdir -p ~/task-manager-backend
cd ~/task-manager-backend

# تحميل PocketBase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.4/pocketbase_0.22.4_linux_amd64.zip

# فك الضغط
unzip pocketbase_0.22.4_linux_amd64.zip

# حذف الملف المضغوط
rm pocketbase_0.22.4_linux_amd64.zip

# إعطاء صلاحية التشغيل
chmod +x pocketbase

# تشغيل PocketBase (أول مرة)
./pocketbase serve --http="0.0.0.0:8090"
```

### إنشاء حساب Admin:
1. افتح المتصفح: `http://localhost:8090/_/`
2. أنشئ حساب Admin (email + password)
3. هذا الحساب للوصول إلى لوحة تحكم PocketBase

---

## 📊 الخطوة 3: إنشاء الجداول

### الطريقة 1: استخدام SQL Editor

1. اذهب إلى: `http://localhost:8090/_/`
2. انسخ محتوى ملف `pocketbase-schema.json` (سأنشئه)
3. اذهب إلى Settings > Import collections
4. الصق المحتوى واضغط Import

### الطريقة 2: إنشاء يدوي

في PocketBase Admin، أنشئ الـ Collections التالية:

#### 1. Collection: `users`
| Field | Type | Options |
|-------|------|---------|
| name | Text | Required |
| username | Text | Required, Unique |
| email | Email | Required |
| password | Text | Required, Min: 6 |
| role | Select | Options: admin, ceo, manager, team_leader, employee |
| department | Relation | → departments (optional) |
| phone | Text | |
| shiftStart | Text | |
| shiftEnd | Text | |
| isActive | Bool | Default: true |

#### 2. Collection: `departments`
| Field | Type | Options |
|-------|------|---------|
| name | Text | Required |
| description | Text | |
| managerId | Relation | → users (optional) |

#### 3. Collection: `tasks`
| Field | Type | Options |
|-------|------|---------|
| title | Text | Required |
| description | Text | |
| status | Select | Options: new, seen, in_progress, paused, completed |
| priority | Select | Options: urgent, high, medium, low |
| assignedTo | Relation | → users, Required |
| createdBy | Relation | → users, Required |
| department | Relation | → departments, Required |
| dueDate | DateTime | Required |
| seenAt | DateTime | |
| startedAt | DateTime | |
| completedAt | DateTime | |
| pauseReason | Text | |
| progress | Number | Default: 0, Min: 0, Max: 100 |

#### 4. Collection: `comments`
| Field | Type | Options |
|-------|------|---------|
| taskId | Relation | → tasks, Required |
| userId | Relation | → users, Required |
| content | Text | Required |

#### 5. Collection: `notifications`
| Field | Type | Options |
|-------|------|---------|
| userId | Relation | → users, Required |
| title | Text | Required |
| message | Text | Required |
| type | Select | Options: task, comment, rating, transfer, system |
| isRead | Bool | Default: false |
| relatedTaskId | Relation | → tasks (optional) |

#### 6. Collection: `daily_logs`
| Field | Type | Options |
|-------|------|---------|
| userId | Relation | → users, Required |
| title | Text | Required |
| description | Text | |
| status | Select | Options: in_progress, paused, completed |
| startDate | DateTime | Required |
| endDate | DateTime | |
| pauseReason | Text | |

#### 7. Collection: `task_ratings`
| Field | Type | Options |
|-------|------|---------|
| taskId | Relation | → tasks, Required |
| oderId | Relation | → users, Required |
| odedId | Relation | → users, Required |
| odeedRating | Number | Min: 0, Max: 5 |
| autoRating | Number | Min: 0, Max: 5 |

---

## 🔧 الخطوة 4: تفعيل Real-time

1. في PocketBase Admin، اذهب إلى Settings
2. اذهب إلى API Rules لكل Collection
3. اضبط الـ Rules حسب الحاجة (أو اتركها مفتوحة للتطوير)

---

## 🌐 الخطوة 5: تثبيت وتشغيل Frontend

```bash
# إنشاء مجلد للـ Frontend
mkdir -p ~/task-manager-frontend
cd ~/task-manager-frontend

# نسخ ملفات المشروع (من هنا)
# أو git clone ...

# تثبيت المكتبات
npm install

# تشغيل للتطوير
npm run dev

# أو للإنتاج
npm run build
```

---

## 🔗 الخطوة 6: ربط Frontend بـ Backend

عدّل ملف `src/lib/pocketbase.ts`:

```typescript
// غيّر الـ URL حسب السيرفر
const pb = new PocketBase('http://192.168.1.100:8090');
// أو
const pb = new PocketBase('http://your-server-ip:8090');
```

---

## 🔄 الخطوة 7: تشغيل كـ Service (للإنتاج)

### إنشاء Service لـ PocketBase:

```bash
sudo nano /etc/systemd/system/pocketbase.service
```

```ini
[Unit]
Description=PocketBase Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/task-manager-backend
ExecStart=/home/your-username/task-manager-backend/pocketbase serve --http="0.0.0.0:8090"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل وتشغيل
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

# التحقق من الحالة
sudo systemctl status pocketbase
```

### استضافة Frontend:

```bash
# تثبيت serve
npm install -g serve

# أو nginx
sudo apt install -y nginx
```

#### باستخدام serve:
```bash
cd ~/task-manager-frontend
npm run build
serve -s dist -l 3000
```

#### باستخدام nginx:
```bash
# نسخ الملفات
sudo cp -r dist/* /var/www/html/

# أو إنشاء config خاص
sudo nano /etc/nginx/sites-available/task-manager
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /home/your-username/task-manager-frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/task-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 الخطوة 8: إضافة البيانات الأولية

افتح PocketBase Admin (`http://localhost:8090/_/`) وأضف:

### 1. الأقسام:
- قسم تقنية المعلومات
- قسم الموارد البشرية
- قسم المبيعات

### 2. المستخدمين:

| name | username | password | role | department |
|------|----------|----------|------|------------|
| Admin | admin | Admin@2024 | admin | - |
| أحمد CEO | ahmed.ceo | Ceo@2024# | ceo | - |
| محمد IT | mohamed.it | Manager@2024# | manager | IT |
| سارة HR | sara.hr | Manager@2024# | manager | HR |
| كريم Leader | karim.leader | Leader@2024# | team_leader | IT |
| علي Employee | ali.emp | Employee@2024# | employee | IT |

---

## ✅ تم!

الآن النظام يعمل بالكامل على السيرفر المحلي:

- **Frontend**: `http://localhost:3000` أو `http://your-ip:3000`
- **Backend API**: `http://localhost:8090/api/`
- **Admin Panel**: `http://localhost:8090/_/`

---

## 🆘 حل المشاكل

### PocketBase لا يعمل:
```bash
# تحقق من الـ logs
journalctl -u pocketbase -f

# تحقق من الـ port
sudo netstat -tlnp | grep 8090
```

### لا يمكن الوصول من جهاز آخر:
```bash
# افتح الـ firewall
sudo ufw allow 8090
sudo ufw allow 3000
sudo ufw allow 80
```

### مشكلة في الـ permissions:
```bash
chmod +x pocketbase
chown -R $USER:$USER ~/task-manager-backend
```

---

## 📞 الدعم

للتواصل مع المطور:
- واتساب: [01026276594](https://wa.me/2001026276594)

---

**تطوير: Mohamed Alaa**
