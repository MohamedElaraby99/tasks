/**
 * Setup script: يجهّز المشروع بعد الاستنساخ (Clone)
 * - ينشئ .env من .env.example إذا لم يكن موجوداً
 * - يثبت التبعيات (جذر المشروع + الباك إند)
 */

import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const backend = join(root, 'backend');

function copyIfMissing(src, dest) {
  if (!existsSync(src)) {
    console.log(`⏭️  لا يوجد ${src} — تخطي`);
    return;
  }
  if (existsSync(dest)) {
    console.log(`✅ ${dest} موجود مسبقاً`);
    return;
  }
  copyFileSync(src, dest);
  console.log(`📄 تم إنشاء ${dest} من المثال`);
}

console.log('\n🔧 إعداد المشروع...\n');

// Frontend .env
copyIfMissing(join(root, '.env.example'), join(root, '.env'));

// Backend .env
copyIfMissing(join(backend, '.env.example'), join(backend, '.env'));

console.log('\n📦 تثبيت تبعيات الفرونت إند...');
execSync('npm install', { cwd: root, stdio: 'inherit' });

console.log('\n📦 تثبيت تبعيات الباك إند...');
execSync('npm install', { cwd: backend, stdio: 'inherit' });

console.log('\n✅ الإعداد انتهى. شغّل: npm run dev:all\n');
