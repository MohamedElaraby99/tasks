import { createClient } from '@supabase/supabase-js';

// ⚠️ يجب عليك إنشاء مشروع على Supabase والحصول على هذه البيانات
// 1. اذهب إلى https://supabase.com
// 2. أنشئ حساب مجاني
// 3. أنشئ مشروع جديد
// 4. اذهب إلى Settings > API
// 5. انسخ Project URL و anon public key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// التحقق من الاتصال
export const checkConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};
