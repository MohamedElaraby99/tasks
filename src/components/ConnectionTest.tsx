import { useState, useEffect } from 'react';

import { API_URL } from '../lib/api';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: unknown;
}

export default function ConnectionTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const tests: TestResult[] = [];

    // Test 1: Health Check
    tests.push({ name: 'Health Check', status: 'pending', message: 'جاري الاختبار...' });
    setResults([...tests]);
    
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      tests[tests.length - 1] = {
        name: 'Health Check',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'الـ Backend يعمل بشكل صحيح! ✅' : 'فشل الاتصال',
        data
      };
    } catch (error) {
      tests[tests.length - 1] = {
        name: 'Health Check',
        status: 'error',
        message: `❌ لا يمكن الاتصال بالـ Backend على ${API_URL}`,
        data: String(error)
      };
    }
    setResults([...tests]);

    // Test 2: Get Users
    tests.push({ name: 'جلب المستخدمين', status: 'pending', message: 'جاري الاختبار...' });
    setResults([...tests]);
    
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      tests[tests.length - 1] = {
        name: 'جلب المستخدمين',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? `تم جلب ${data.length || 0} مستخدم ✅` : 'فشل جلب المستخدمين',
        data
      };
    } catch (error) {
      tests[tests.length - 1] = {
        name: 'جلب المستخدمين',
        status: 'error',
        message: '❌ فشل جلب المستخدمين',
        data: String(error)
      };
    }
    setResults([...tests]);

    // Test 3: Login
    tests.push({ name: 'تسجيل الدخول', status: 'pending', message: 'جاري الاختبار...' });
    setResults([...tests]);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Admin@2024' })
      });
      const data = await response.json();
      tests[tests.length - 1] = {
        name: 'تسجيل الدخول',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? `تم تسجيل الدخول بنجاح! Token: ${data.token?.substring(0, 20)}...` : data.error || 'فشل تسجيل الدخول',
        data
      };
    } catch (error) {
      tests[tests.length - 1] = {
        name: 'تسجيل الدخول',
        status: 'error',
        message: '❌ فشل تسجيل الدخول',
        data: String(error)
      };
    }
    setResults([...tests]);

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 اختبار الاتصال بالـ Backend</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl mb-4">📡 معلومات الاتصال:</h2>
          <div className="bg-gray-700 p-4 rounded font-mono">
            <p>Backend URL: <span className="text-blue-400">{API_URL}</span></p>
            <p>Port: <span className="text-green-400">3001</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">📋 نتائج الاختبار:</h2>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? '⏳ جاري الاختبار...' : '🔄 إعادة الاختبار'}
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`}></div>
                  <span className="font-bold">{result.name}</span>
                </div>
                <p className={result.status === 'error' ? 'text-red-400' : 'text-green-400'}>
                  {result.message}
                </p>
                {result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                      عرض البيانات الخام
                    </summary>
                    <pre className="mt-2 bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40">
                      {result.data !== undefined ? (typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)) : 'N/A'}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {results.some(r => r.status === 'error') && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
            <h2 className="text-xl mb-4 text-red-400">⚠️ كيفية إصلاح المشكلة:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>تأكد من أن الـ Backend يعمل:
                <pre className="bg-gray-900 p-2 rounded mt-2 text-sm">
                  cd backend{'\n'}
                  node server.js
                </pre>
              </li>
              <li>تأكد من أن الـ Port صحيح (3001):
                <pre className="bg-gray-900 p-2 rounded mt-2 text-sm">
                  # في ملف backend/.env{'\n'}
                  PORT=3001
                </pre>
              </li>
              <li>تأكد من تثبيت المكتبات:
                <pre className="bg-gray-900 p-2 rounded mt-2 text-sm">
                  cd backend{'\n'}
                  npm install
                </pre>
              </li>
              <li>شاهد الـ logs للأخطاء:
                <pre className="bg-gray-900 p-2 rounded mt-2 text-sm">
                  node server.js
                </pre>
              </li>
            </ol>
          </div>
        )}

        {results.length > 0 && results.every(r => r.status === 'success') && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-6 text-center">
            <h2 className="text-2xl text-green-400 mb-2">🎉 ممتاز! كل شيء يعمل!</h2>
            <p className="text-gray-300">الـ Frontend متصل بالـ Backend بنجاح</p>
            <a href="/" className="inline-block mt-4 px-6 py-2 bg-green-600 rounded hover:bg-green-700">
              ← العودة للتطبيق
            </a>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500">
          <p>تطوير: Mohamed Alaa</p>
          <p>للدعم: <a href="https://wa.me/2001026276594" className="text-green-400">01026276594</a></p>
        </div>
      </div>
    </div>
  );
}
