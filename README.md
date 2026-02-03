# Task Management System

نظام إدارة مهام — فرونت إند (React + Vite) وباك إند (Node.js + MongoDB).

---

## التشغيل من الصفر (بعد الاستنساخ)

### 1) استنساخ المشروع
```bash
git clone <رابط-المستودع>
cd task-management-system-design-main
```

### 2) إعداد وتشغيل
```bash
npm run setup
npm run dev:all
```

- **`npm run setup`**: ينشئ ملفات `.env` من الأمثلة (إن وُجدت) ويثبت التبعيات.
- **`npm run dev:all`**: يشغّل الباك إند (بورت 3001) والفرونت إند (بورت 5173) معاً.

### 3) فتح التطبيق
- الفرونت: **http://localhost:5173**
- الباك إند (API): **http://localhost:3001/api**

---

## المتطلبات

- **Node.js** (إصدار 18 أو أحدث)
- **MongoDB** يعمل على الجهاز (مثلاً `127.0.0.1:27017`)

---

## أوامر مفيدة

| الأمر | الوصف |
|-------|--------|
| `npm run setup` | إعداد المشروع بعد الاستنساخ |
| `npm run dev:all` | تشغيل الفرونت + الباك إند معاً |
| `npm run dev` | تشغيل الفرونت إند فقط (بورت 5173) |
| `npm run dev:backend` | تشغيل الباك إند فقط (بورت 3001) |
| `npm run build` | بناء الفرونت للإنتاج (مخرجات في `dist/`) |

---

## إعداد MongoDB

1. شغّل MongoDB محلياً أو استخدم Atlas.
2. عدّل ملف **`backend/.env`** (ينشئه `npm run setup` من `backend/.env.example`):
   - `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB`
   - `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_AUTH_SOURCE`
3. إنشاء مستخدم أدمن: من مجلد `backend` شغّل:
   ```bash
   node make-admin.js
   ```

---

## هيكل المشروع

```
├── backend/          # الباك إند (Express + MongoDB)
├── src/              # الفرونت إند (React + Vite)
├── scripts/
│   └── setup.js      # سكربت الإعداد
├── .env.example      # مثال متغيرات الفرونت
└── package.json
```
