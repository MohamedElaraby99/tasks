/**
 * Make Admin — ES Module
 * إدارة صلاحيات الأدمن مباشرة على MongoDB بدون أي authentication.
 *
 * ترقية يوزر → أدمن:    node make-admin.js <username>
 * إنشاء أدمن جديد:       node make-admin.js --create --username <u> --password <p> [--name "الاسم"]
 * تغيير كلمة السر:       node make-admin.js --set-password <username> --password <newpass>
 *
 * Env (اختياري): MONGO_* أو MONGODB_URI، و للإنشاء: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME
 */

import 'dotenv/config';
import { initDatabase, User } from './database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 12);

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { mode: 'promote', username: null, password: null, name: null };

  if (args.includes('--set-password')) {
    result.mode = 'set-password';
    const i = args.indexOf('--set-password');
    if (args[i + 1] && !args[i + 1].startsWith('--')) result.username = args[i + 1];
    const j = args.indexOf('--password');
    if (j !== -1 && args[j + 1]) result.password = args[j + 1];
  } else if (args.includes('--create')) {
    result.mode = 'create';
    const i = args.indexOf('--username');
    if (i !== -1 && args[i + 1]) result.username = args[i + 1];
    const j = args.indexOf('--password');
    if (j !== -1 && args[j + 1]) result.password = args[j + 1];
    const k = args.indexOf('--name');
    if (k !== -1 && args[k + 1]) result.name = args[k + 1];
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    result.username = args[0];
  }

  result.username = result.username || process.env.ADMIN_USERNAME;
  result.password = result.password || process.env.ADMIN_PASSWORD;
  result.name = result.name || process.env.ADMIN_NAME || 'مدير النظام';
  return result;
}

function printUsage() {
  console.error('');
  console.error('Usage:');
  console.error('  ترقية يوزر → أدمن:   node make-admin.js <username>');
  console.error('  إنشاء أدمن جديد:      node make-admin.js --create --username <user> --password <pass> [--name "الاسم"]');
  console.error('  تغيير كلمة السر:      node make-admin.js --set-password <username> --password <newpass>');
  console.error('');
  console.error('Examples:');
  console.error('  node make-admin.js admin');
  console.error('  node make-admin.js --create --username admin --password MyPass123 --name "مدير النظام"');
  console.error('  node make-admin.js --set-password admin --password NewSecurePass456');
  console.error('');
}

async function main() {
  const { mode, username, password, name } = parseArgs();

  if (mode === 'promote' && !username) {
    printUsage();
    process.exit(1);
  }
  if (mode === 'set-password' && (!username || !password)) {
    console.error('Usage: node make-admin.js --set-password <username> --password <newpassword>');
    process.exit(1);
  }
  if (mode === 'create' && (!username || !password)) {
    console.error('Usage: node make-admin.js --create --username <u> --password <p> [--name "الاسم"]');
    process.exit(1);
  }
  if ((mode === 'set-password' || mode === 'create') && password.length < 6) {
    console.error('كلمة السر يجب أن تكون 6 أحرف على الأقل.');
    process.exit(1);
  }

  await initDatabase();

  if (mode === 'set-password') {
    const updated = await User.updateOne(
      { username },
      { $set: { password: bcrypt.hashSync(password, 10) } }
    );
    if (updated.matchedCount === 0) {
      console.error(`User not found: ${username}`);
      process.exit(1);
    }
    console.log(`✅ Password updated for "${username}". You can log in with the new password.`);
    process.exit(0);
  }

  if (mode === 'promote') {
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`User not found: ${username}`);
      process.exit(1);
    }
    if (user.role === 'admin') {
      console.log(`User "${username}" is already an admin.`);
      process.exit(0);
    }
    await User.updateOne({ username }, { $set: { role: 'admin' } });
    console.log(`✅ User "${username}" (${user.name}) is now an admin.`);
    process.exit(0);
  }

  // Create new admin
  const existing = await User.findOne({ username });
  if (existing) {
    console.error(`Username already exists: ${username}`);
    process.exit(1);
  }

  await User.create({
    id: generateId(),
    name,
    username,
    password: bcrypt.hashSync(password, 10),
    role: 'admin',
    departmentId: null,
    whatsapp: '',
  });

  console.log('');
  console.log('✅ Admin user created successfully.');
  console.log('   Username:', username);
  console.log('   Name:', name);
  console.log('   Role: admin');
  console.log('');
  console.log('🔐 Use these credentials to log in.');
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
