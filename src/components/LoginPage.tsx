import { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Globe, MessageCircle, KeyRound, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { getStoredSettings, setStoredSettings } from '../store/useStore';
import { API_URL } from '../lib/api';
import type { Language, Theme } from '../types';

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean | Promise<boolean>;
}

const DEVELOPER_WHATSAPP = '201026276594';

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredSettings().language);
  const [theme, setTheme] = useState<Theme>(() => getStoredSettings().theme);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const handleLanguageToggle = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
    setStoredSettings({ language: next });
  };

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoredSettings({ theme: next });
  };

  useEffect(() => {
    const { language: l, theme: t } = getStoredSettings();
    setLanguage(l);
    setTheme(t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return () => document.documentElement.removeAttribute('data-theme');
  }, [isDark]);

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch {
        setBackendStatus('disconnected');
      }
    };
    
    checkBackend();
    // Recheck every 10 seconds
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    await new Promise(r => setTimeout(r, 500));
    
    const success = await onLogin(username, password);
    if (!success) {
      setError(isAr ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password');
    }
    setIsLoading(false);
  };

  const bgClass = isDark
    ? 'bg-gradient-to-br from-[#0C2442] via-[#003A5E] to-[#0C2442]'
    : 'bg-gradient-to-br from-gray-100 via-slate-50 to-gray-200';
  const cardClass = isDark
    ? 'backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20'
    : 'backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl border border-gray-200/80';
  const titleColor = isDark ? 'text-white' : 'text-gray-900';
  const subColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const inputBg = isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen flex items-center justify-center p-3 sm:p-4 ${bgClass}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFAE1F] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#003A5E] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#FFAE1F] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFAE1F] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#003A5E] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          </>
        )}
      </div>

      {/* Theme & Language toggles */}
      <div className={`absolute top-3 right-3 left-3 flex justify-end gap-2 z-10 ${isAr ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={handleThemeToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition shrink-0 ${
            isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200/80 text-gray-700 hover:bg-gray-300/80'
          }`}
          title={isDark ? (isAr ? 'وضع النهار' : 'Morning / Light') : (isAr ? 'وضع الليل' : 'Night / Dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="hidden sm:inline text-sm">{isDark ? (isAr ? 'نهار' : 'Morning') : (isAr ? 'ليل' : 'Night')}</span>
        </button>
        <button
          type="button"
          onClick={handleLanguageToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition shrink-0 ${
            isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200/80 text-gray-700 hover:bg-gray-300/80'
          }`}
          title={isAr ? 'English' : 'العربية'}
        >
          <Globe className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">{isAr ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="relative w-full max-w-md mt-12 sm:mt-0">
        {/* Glass card */}
        <div className={`${cardClass} p-6 sm:p-8`}>
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-[#003A5E] to-[#0C2442] flex items-center justify-center shadow-xl`}>
              <span className="text-[#FFAE1F] text-2xl sm:text-3xl font-bold">TM</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold ${titleColor} mb-2`}>
              {isAr ? 'نظام إدارة المهام' : 'Task Management System'}
            </h1>
            <p className={subColor}>
              {isAr ? 'قم بتسجيل الدخول للمتابعة' : 'Login to continue'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center gap-3 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className={`block ${labelColor} text-sm font-medium mb-2`}>
                {isAr ? 'اسم المستخدم' : 'Username'}
              </label>
              <div className="relative">
                <User className={`absolute ${isAr ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 -translate-y-1/2 w-5 h-5 opacity-60`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#003A5E] focus:border-transparent transition`}
                  placeholder={isAr ? 'أدخل اسم المستخدم' : 'Enter username'}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block ${labelColor} text-sm font-medium mb-2`}>
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isAr ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 -translate-y-1/2 w-5 h-5 opacity-60`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-[#003A5E] focus:border-transparent transition`}
                  placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter password'}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FFAE1F] to-[#FFD580] text-[#0C2442] font-bold shadow-lg shadow-[#FFAE1F]/30 hover:shadow-[#FFAE1F]/50 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isAr ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                </span>
              ) : (
                isAr ? 'تسجيل الدخول' : 'Login'
              )}
            </button>
          </form>

          {/* Forgot Password */}
          {!showForgotPassword ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className={`${isDark ? 'text-gray-400 hover:text-[#FFAE1F]' : 'text-gray-500 hover:text-[#003A5E]'} text-sm transition flex items-center gap-2 justify-center mx-auto`}
              >
                <KeyRound className="w-4 h-4" />
                {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </button>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-fadeIn">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5 text-green-500" />
                <p className={`font-medium text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {isAr ? 'تواصل مع المطور عبر واتساب' : 'Contact developer via WhatsApp'}
                </p>
              </div>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {isAr 
                  ? 'إذا نسيت كلمة المرور، يرجى التواصل مع المطور لإعادة تعيينها:'
                  : 'If you forgot your password, please contact the developer to reset it:'
                }
              </p>
              <button
                type="button"
                onClick={() => {
                  const message = isAr 
                    ? 'مرحباً، لا أستطيع الدخول على حسابي في نظام إدارة المهام. برجاء المساعدة.'
                    : 'Hello, I cannot access my account in the Task Management System. Please help.';
                  window.open(`https://wa.me/${DEVELOPER_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition"
              >
                <MessageCircle className="w-5 h-5" />
                {isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className={`w-full mt-2 text-sm transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to login'}
              </button>
            </div>
          )}

          {/* Backend Status */}
          <div className={`mt-6 p-3 rounded-xl flex items-center justify-center gap-2 ${
            backendStatus === 'connected' 
              ? 'bg-green-500/10 border border-green-500/20' 
              : backendStatus === 'disconnected'
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-yellow-500/10 border border-yellow-500/20'
          }`}>
            {backendStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">
                  {isAr ? 'متصل بالسيرفر' : 'Connected to server'}
                </span>
              </>
            ) : backendStatus === 'disconnected' ? (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">
                  {isAr ? 'غير متصل بالسيرفر (يعمل محلياً)' : 'Not connected to server (working locally)'}
                </span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-yellow-400 text-sm">
                  {isAr ? 'جاري الفحص...' : 'Checking...'}
                </span>
              </>
            )}
          </div>

          {/* Security Notice */}
          {!showForgotPassword && (
            <div className="mt-4 p-3 sm:p-4 rounded-xl bg-[#FFAE1F]/10 border border-[#FFAE1F]/20">
              <p className="text-[#B8860B] text-xs sm:text-sm text-center">
                {isAr 
                  ? '🔒 اتصال آمن ومشفر - تواصل مع مدير النظام للحصول على بيانات الدخول'
                  : '🔒 Secure encrypted connection - Contact admin for login credentials'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className={`text-center text-sm mt-4 sm:mt-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isAr ? 'تطوير' : 'Developed by'} <strong className="text-[#FFAE1F]">Mohamed Alaa</strong>
        </p>
        <p className={`text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          © 2024 AYED Academy - {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
