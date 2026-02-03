import { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { LoginPage } from './components/LoginPage';
import ConnectionTest from './components/ConnectionTest';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { TasksPage } from './pages/TasksPage';
import { UsersPage } from './pages/UsersPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { DailyLogPage } from './pages/DailyLogPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  getAuthToken,
  authAPI,
  usersAPI,
  departmentsAPI,
  tasksAPI,
  notificationsAPI,
  dailyLogsAPI,
} from './lib/api';
import type { User, Task, Department, Notification } from './types';

function AppRoutes() {
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const navigate = useNavigate();

  const loadDataFromApi = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const [tasks, users, departments, notifications] = await Promise.all([
        tasksAPI.getAll(),
        usersAPI.getAll(),
        departmentsAPI.getAll(),
        notificationsAPI.getAll(),
      ]);
      const today = new Date().toISOString().split('T')[0];
      let dailyLogs: import('./types').DailyLogEntry[] = [];
      try {
        dailyLogs = await dailyLogsAPI.getAll(today);
      } catch {
        // optional
      }
      storeRef.current.hydrateFromApi({
        tasks: tasks as Task[],
        users: (users as User[]).map((u) => ({ ...u, password: u.password || '' })),
        departments: departments as Department[],
        notifications: (notifications as (Notification & { read?: number })[]).map((n) => ({
          ...n,
          read: typeof n.read === 'number' ? n.read === 1 : !!n.read,
        })),
        dailyLogs,
      });
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let cancelled = false;
    authAPI
      .getMe()
      .then((user) => {
        if (cancelled) return;
        storeRef.current.setCurrentUser(user as User);
        return loadDataFromApi();
      })
      .catch(() => {
        if (!cancelled) storeRef.current.setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loadDataFromApi]);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(username, password);
      const user = data.user as User;
      store.setCurrentUser({ ...user, password: '' });
      await loadDataFromApi();
      navigate('/dashboard', { replace: true });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Routes>
      <Route path="/test" element={<ConnectionTest />} />
      <Route path="/login" element={store.currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route
        path="/"
        element={
          !store.currentUser ? (
            <Navigate to="/login" replace />
          ) : (
            <DashboardLayout user={store.currentUser} store={store} refetch={loadDataFromApi} />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="daily-log" element={<DailyLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
