import { useState, useRef } from 'react';
import { 
  Settings, MessageCircle, Phone, Save, RotateCcw,
  Shield, Bell, Palette, Globe, Sun, Moon, Lock, Eye, EyeOff,
  Download, Upload, CheckCircle, AlertTriangle
} from 'lucide-react';

interface SettingsPanelProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
}

export function SettingsPanel({ store }: SettingsPanelProps) {
  const [whatsappNumber, setWhatsappNumber] = useState(store.whatsappConfig.companyNumber);
  const [whatsappEnabled, setWhatsappEnabled] = useState(store.whatsappConfig.enabled);
  const [saved, setSaved] = useState(false);
  
  // Admin password for reset
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Backup/Restore
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreFile, setRestoreFile] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';
  
  // Check if current user is admin or CEO
  const canAccessDangerZone = store.currentUser?.role === 'admin' || store.currentUser?.role === 'ceo';

  const handleSaveWhatsApp = () => {
    store.updateWhatsAppConfig({
      companyNumber: whatsappNumber,
      enabled: whatsappEnabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setResetError('');
    const success = store.resetData(adminPassword);
    if (success) {
      window.location.reload();
    } else {
      setResetError(isAr ? 'كلمة مرور الأدمن غير صحيحة' : 'Invalid admin password');
    }
  };

  // Handle backup download
  const handleBackup = () => {
    const backup = store.createBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle restore
  const handleRestore = () => {
    setRestoreError('');
    if (!restoreFile || !restorePassword) return;
    
    const result = store.restoreBackup(restoreFile, restorePassword);
    if (result.success) {
      setRestoreSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      if (result.error === 'invalid_password') {
        setRestoreError(isAr ? 'كلمة مرور الأدمن غير صحيحة' : 'Invalid admin password');
      } else if (result.error === 'invalid_format') {
        setRestoreError(isAr ? 'صيغة الملف غير صالحة' : 'Invalid file format');
      } else {
        setRestoreError(isAr ? 'خطأ في قراءة الملف' : 'Error reading file');
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRestoreFile(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-100';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Language & Theme Settings */}
      <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} overflow-hidden`}>
        <div className={`p-6 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Palette className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>
                {isAr ? 'المظهر واللغة' : 'Appearance & Language'}
              </h3>
              <p className={`${textMuted} text-sm`}>
                {isAr ? 'تخصيص مظهر النظام واللغة' : 'Customize system appearance and language'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Language Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-cyan-400" />
              <div>
                <p className={`${textColor} font-medium`}>
                  {isAr ? 'اللغة' : 'Language'}
                </p>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'تغيير لغة واجهة النظام' : 'Change system interface language'}
                </p>
              </div>
            </div>
            <div className={`flex rounded-xl overflow-hidden border ${borderColor}`}>
              <button
                onClick={() => store.setLanguage('ar')}
                className={`px-4 py-2 text-sm transition ${
                  store.settings.language === 'ar' 
                    ? 'bg-purple-600 text-white' 
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => store.setLanguage('en')}
                className={`px-4 py-2 text-sm transition ${
                  store.settings.language === 'en' 
                    ? 'bg-purple-600 text-white' 
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-5 h-5 text-indigo-400" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
              <div>
                <p className={`${textColor} font-medium`}>
                  {isAr ? 'المظهر' : 'Theme'}
                </p>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'التبديل بين الوضع الفاتح والداكن' : 'Toggle between light and dark mode'}
                </p>
              </div>
            </div>
            <div className={`flex rounded-xl overflow-hidden border ${borderColor}`}>
              <button
                onClick={() => store.setTheme('light')}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition ${
                  store.settings.theme === 'light' 
                    ? 'bg-purple-600 text-white' 
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                <Sun className="w-4 h-4" />
                {isAr ? 'فاتح' : 'Light'}
              </button>
              <button
                onClick={() => store.setTheme('dark')}
                className={`px-4 py-2 text-sm flex items-center gap-2 transition ${
                  store.settings.theme === 'dark' 
                    ? 'bg-purple-600 text-white' 
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                <Moon className="w-4 h-4" />
                {isAr ? 'داكن' : 'Dark'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Settings */}
      <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} overflow-hidden`}>
        <div className={`p-6 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/20">
              <MessageCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>
                {isAr ? 'إعدادات واتساب' : 'WhatsApp Settings'}
              </h3>
              <p className={`${textMuted} text-sm`}>
                {isAr ? 'تكوين رقم الواتساب للإشعارات' : 'Configure WhatsApp number for notifications'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className={`${textColor} font-medium`}>
                {isAr ? 'تفعيل إشعارات واتساب' : 'Enable WhatsApp Notifications'}
              </p>
              <p className={`${textMuted} text-sm`}>
                {isAr ? 'إرسال إشعارات للموظفين عبر واتساب' : 'Send notifications to employees via WhatsApp'}
              </p>
            </div>
            <button
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`relative w-14 h-7 rounded-full transition-all ${
                whatsappEnabled ? 'bg-green-500' : isDark ? 'bg-white/10' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                whatsappEnabled ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'right-1' : 'left-1')
              }`}></div>
            </button>
          </div>

          <div>
            <label className={`block ${textMuted} text-sm font-medium mb-2`}>
              {isAr ? 'رقم واتساب الشركة' : 'Company WhatsApp Number'}
            </label>
            <div className="relative">
              <Phone className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-green-500`}
                placeholder="201234567890"
              />
            </div>
            <p className={`${textMuted} text-xs mt-2`}>
              {isAr 
                ? 'أدخل الرقم بصيغة دولية بدون + (مثال: 201234567890)'
                : 'Enter number in international format without + (e.g., 201234567890)'
              }
            </p>
          </div>

          <button
            onClick={handleSaveWhatsApp}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition ${
              saved 
                ? 'bg-green-500 text-white' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved 
              ? (isAr ? 'تم الحفظ!' : 'Saved!') 
              : (isAr ? 'حفظ الإعدادات' : 'Save Settings')
            }
          </button>
        </div>
      </div>

      {/* Other Settings */}
      <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} overflow-hidden`}>
        <div className={`p-6 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>
                {isAr ? 'إعدادات عامة' : 'General Settings'}
              </h3>
              <p className={`${textMuted} text-sm`}>
                {isAr ? 'إعدادات النظام العامة' : 'General system settings'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <div>
                <p className={`${textColor} font-medium`}>
                  {isAr ? 'إشعارات المتصفح' : 'Browser Notifications'}
                </p>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'تفعيل إشعارات المتصفح' : 'Enable browser notifications'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => store.updateSettings({ notifications: !store.settings.notifications })}
              className={`relative w-14 h-7 rounded-full transition-all ${
                store.settings.notifications ? 'bg-blue-500' : isDark ? 'bg-white/10' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                store.settings.notifications ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'right-1' : 'left-1')
              }`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <p className={`${textColor} font-medium`}>
                  {isAr ? 'تسجيل الخروج التلقائي' : 'Auto Logout'}
                </p>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'تسجيل الخروج بعد فترة عدم نشاط' : 'Logout after inactivity period'}
                </p>
              </div>
            </div>
            <select
              value={store.settings.autoLogout}
              onChange={(e) => store.updateSettings({ autoLogout: parseInt(e.target.value) })}
              className={`px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none`}
            >
              <option value="15">15 {isAr ? 'دقيقة' : 'min'}</option>
              <option value="30">30 {isAr ? 'دقيقة' : 'min'}</option>
              <option value="60">60 {isAr ? 'دقيقة' : 'min'}</option>
              <option value="120">2 {isAr ? 'ساعة' : 'hours'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backup & Restore - Admin Only */}
      {store.currentUser?.role === 'admin' && (
        <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} overflow-hidden`}>
          <div className={`p-6 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${textColor}`}>
                  {isAr ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore'}
                </h3>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'حفظ واستعادة جميع بيانات النظام' : 'Save and restore all system data'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Backup */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-green-400" />
                <div>
                  <p className={`${textColor} font-medium`}>
                    {isAr ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
                  </p>
                  <p className={`${textMuted} text-sm`}>
                    {isAr ? 'تحميل نسخة من جميع البيانات' : 'Download a copy of all data'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleBackup}
                className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isAr ? 'تحميل' : 'Download'}
              </button>
            </div>

            {/* Restore */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-blue-400" />
                <div>
                  <p className={`${textColor} font-medium`}>
                    {isAr ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
                  </p>
                  <p className={`${textMuted} text-sm`}>
                    {isAr ? 'استعادة البيانات من ملف سابق' : 'Restore data from a previous file'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestoreModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isAr ? 'استعادة' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone - Only for Admin */}
      {canAccessDangerZone && (
        <div className={`backdrop-blur-xl ${isDark ? 'bg-red-500/5' : 'bg-red-50'} rounded-2xl border border-red-500/20 overflow-hidden`}>
          <div className={`p-6 border-b border-red-500/20`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/20">
                <RotateCcw className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${textColor}`}>
                  {isAr ? 'منطقة الخطر' : 'Danger Zone'}
                </h3>
                <p className={`${textMuted} text-sm`}>
                  {isAr ? 'إجراءات لا يمكن التراجع عنها - تتطلب كلمة مرور الأدمن' : 'Irreversible actions - Require admin password'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`${textColor} font-medium`}>
                  {isAr ? 'إعادة تعيين البيانات' : 'Reset Data'}
                </p>
                <p className={`${textMuted} text-sm`}>
                  {isAr 
                    ? 'حذف جميع البيانات والرجوع للحالة الافتراضية' 
                    : 'Delete all data and reset to default state'
                  }
                </p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-6 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
              >
                {isAr ? 'إعادة تعيين' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Info */}
      <div className={`text-center ${textMuted} text-sm py-4`}>
        <p>{isAr ? 'نظام إدارة المهام - الإصدار 2.0.0' : 'Task Management System - Version 2.0.0'}</p>
        <p className="mt-1">
          {isAr ? 'تطوير' : 'Developed by'} <strong className="text-purple-400">Mohamed Alaa</strong>
        </p>
        <p>© 2024 {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h3 className={`text-xl font-bold ${textColor} mb-2 text-center`}>
              {isAr ? 'تأكيد إعادة التعيين' : 'Confirm Reset'}
            </h3>
            <p className={`${textMuted} mb-4 text-center`}>
              {isAr 
                ? 'هذا الإجراء سيحذف جميع البيانات نهائياً. أدخل كلمة مرور الأدمن للمتابعة:'
                : 'This will permanently delete all data. Enter admin password to continue:'
              }
            </p>
            
            <div className="relative mb-4">
              <Lock className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setResetError(''); }}
                className={`w-full ${isAr ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-3 rounded-xl ${inputBg} border ${resetError ? 'border-red-500' : borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-red-500`}
                placeholder={isAr ? 'كلمة مرور الأدمن' : 'Admin password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 ${textMuted} hover:text-white`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {resetError && (
              <p className="text-red-400 text-sm mb-4 text-center">{resetError}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowResetModal(false); setAdminPassword(''); setResetError(''); }}
                className={`flex-1 px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleReset}
                disabled={!adminPassword}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6`}>
            {restoreSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className={`text-xl font-bold ${textColor} mb-2`}>
                  {isAr ? 'تمت الاستعادة بنجاح!' : 'Restore Successful!'}
                </h3>
                <p className={textMuted}>
                  {isAr ? 'جاري إعادة تحميل الصفحة...' : 'Reloading page...'}
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className={`text-xl font-bold ${textColor} mb-2 text-center`}>
                  {isAr ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
                </h3>
                <p className={`${textMuted} mb-4 text-center`}>
                  {isAr 
                    ? 'اختر ملف النسخة الاحتياطية وأدخل كلمة مرور الأدمن'
                    : 'Select backup file and enter admin password'
                  }
                </p>
                
                <div className="space-y-4">
                  {/* File Input */}
                  <div>
                    <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                      {isAr ? 'ملف النسخة الاحتياطية' : 'Backup File'}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor}`}
                    />
                    {restoreFile && (
                      <p className="text-green-400 text-sm mt-1 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {isAr ? 'تم تحميل الملف' : 'File loaded'}
                      </p>
                    )}
                  </div>

                  {/* Admin Password */}
                  <div>
                    <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                      {isAr ? 'كلمة مرور الأدمن' : 'Admin Password'}
                    </label>
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={(e) => { setRestorePassword(e.target.value); setRestoreError(''); }}
                      className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${restoreError ? 'border-red-500' : borderColor} ${textColor}`}
                      placeholder="••••••••"
                    />
                  </div>

                  {restoreError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <p className="text-red-400 text-sm">{restoreError}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { 
                      setShowRestoreModal(false); 
                      setRestorePassword(''); 
                      setRestoreFile(''); 
                      setRestoreError(''); 
                    }}
                    className={`flex-1 px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleRestore}
                    disabled={!restoreFile || !restorePassword}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {isAr ? 'استعادة' : 'Restore'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
