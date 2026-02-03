import { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckCircle, Clock, AlertTriangle, 
  TrendingUp, Users, Building2, Activity, Star, Trophy, Medal, Award
} from 'lucide-react';
import { User } from '../types';

interface StatsOverviewProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  user: User;
}

// Simple Bar Chart Component (no Recharts dependency)
const SimpleBarChart = ({ data, isDark }: { data: { name: string; value: number; color: string }[]; isDark: boolean }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between mb-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{item.name}</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{item.value}</span>
          </div>
          <div className={`h-3 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple Donut Chart Component
const SimpleDonutChart = ({ data, isDark }: { data: { name: string; value: number; color: string }[]; isDark: boolean }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No data</p>
      </div>
    );
  }

  let currentAngle = 0;
  const segments = data.map(item => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...item, startAngle, angle };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {segments.map((segment, index) => {
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = (segment.angle / 360) * circumference;
            const strokeDashoffset = -(segment.startAngle / 360) * circumference;
            
            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{total}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function StatsOverview({ store, user }: StatsOverviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stats = store.getTaskStats();
  const tasks = store.getMyTasks();
  const departments = store.departments;
  const users = store.users.filter(u => u.role !== 'admin');

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';

  // Top performers
  const topEmployees = store.getTopEmployees('month', 5);
  const topDepartments = store.getTopDepartments(5);

  // Prepare chart data
  const statusData = [
    { name: isAr ? 'جديدة' : 'New', value: stats.new, color: '#8b5cf6' },
    { name: isAr ? 'قيد التنفيذ' : 'In Progress', value: stats.inProgress, color: '#3b82f6' },
    { name: isAr ? 'مكتملة' : 'Completed', value: stats.completed, color: '#10b981' },
    { name: isAr ? 'متوقفة' : 'Paused', value: stats.paused, color: '#f59e0b' },
  ];

  const priorityData = [
    { name: isAr ? 'عاجل' : 'Urgent', value: tasks.filter((t) => t.priority === 'urgent').length, color: '#ef4444' },
    { name: isAr ? 'عالي' : 'High', value: tasks.filter((t) => t.priority === 'high').length, color: '#f97316' },
    { name: isAr ? 'متوسط' : 'Medium', value: tasks.filter((t) => t.priority === 'medium').length, color: '#eab308' },
    { name: isAr ? 'منخفض' : 'Low', value: tasks.filter((t) => t.priority === 'low').length, color: '#22c55e' },
  ];

  const departmentStats = departments.map((dept) => {
    const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
    return {
      name: dept.name,
      total: deptTasks.length,
      completed: deptTasks.filter((t) => t.status === 'completed').length,
    };
  });

  const statCards = [
    { title: isAr ? 'إجمالي المهام' : 'Total Tasks', value: stats.total, icon: ClipboardList, color: 'from-purple-500 to-indigo-600' },
    { title: isAr ? 'قيد التنفيذ' : 'In Progress', value: stats.inProgress, icon: Clock, color: 'from-blue-500 to-cyan-600' },
    { title: isAr ? 'مكتملة' : 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
    { title: isAr ? 'متأخرة' : 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'from-red-500 to-pink-600' },
  ];

  const getMedalIcon = (index: number) => {
    switch(index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1: return <Medal className="w-5 h-5 text-gray-300" />;
      case 2: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-4 h-4 text-purple-400" />;
    }
  };

  const getMedalBg = (index: number) => {
    switch(index) {
      case 0: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 1: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 2: return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
      default: return 'bg-white/5 border-white/10';
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6 hover:bg-white/10 transition-all hover:scale-105 group`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={textMuted}>{stat.title}</p>
                <p className={`text-3xl font-bold ${textColor} mt-2`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Performers Section - For Admin/CEO/Manager */}
      {(user.role === 'admin' || user.role === 'ceo' || user.role === 'manager') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Employees */}
          <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
            <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
              <Trophy className="w-5 h-5 text-yellow-400" />
              {isAr ? 'أفضل الموظفين' : 'Top Employees'}
            </h3>
            <div className="space-y-3">
              {topEmployees.length > 0 ? topEmployees.map((emp, index) => (
                <div 
                  key={emp.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border ${getMedalBg(index)} transition hover:bg-white/10`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getMedalIcon(index)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className={`${textColor} font-medium`}>{emp.name}</p>
                    <p className={`${textMuted} text-sm`}>
                      {store.getDepartmentById(emp.departmentId || '')?.name || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className={`${textColor} font-bold`}>{emp.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    <p className={`${textMuted} text-xs`}>
                      {emp.completedTasks || 0}/{emp.totalTasks || 0} {isAr ? 'مهمة' : 'tasks'}
                    </p>
                  </div>
                </div>
              )) : (
                <p className={`${textMuted} text-center py-4`}>
                  {isAr ? 'لا توجد بيانات بعد' : 'No data yet'}
                </p>
              )}
            </div>
          </div>

          {/* Top Departments */}
          <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
            <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
              <Building2 className="w-5 h-5 text-cyan-400" />
              {isAr ? 'أفضل الأقسام' : 'Top Departments'}
            </h3>
            <div className="space-y-3">
              {topDepartments.length > 0 ? topDepartments.map((dept, index) => (
                <div 
                  key={dept.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border ${getMedalBg(index)} transition hover:bg-white/10`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getMedalIcon(index)}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`${textColor} font-medium`}>{dept.name}</p>
                    <p className={`${textMuted} text-sm`}>
                      {dept.employeeCount} {isAr ? 'موظف' : 'employees'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`${textColor} font-bold text-lg`}>{Math.round(dept.completionRate)}%</p>
                    <p className={`${textMuted} text-xs`}>
                      {dept.completedTasks}/{dept.totalTasks} {isAr ? 'مهمة' : 'tasks'}
                    </p>
                  </div>
                </div>
              )) : (
                <p className={`${textMuted} text-center py-4`}>
                  {isAr ? 'لا توجد بيانات بعد' : 'No data yet'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
          <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
            <ClipboardList className="w-5 h-5 text-blue-400" />
            {isAr ? 'توزيع حالات المهام' : 'Task Status Distribution'}
          </h3>
          <SimpleDonutChart data={statusData} isDark={isDark} />
        </div>

        {/* Priority Distribution */}
        <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
          <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            {isAr ? 'توزيع الأولويات' : 'Priority Distribution'}
          </h3>
          <div className="mt-6">
            <SimpleBarChart data={priorityData} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
        <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
          <Activity className="w-5 h-5 text-purple-400" />
          {isAr ? 'أداء الأقسام' : 'Department Performance'}
        </h3>
        {departmentStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((dept, index) => {
              const completionRate = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
              return (
                <div key={index} className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${borderColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${textColor} font-medium truncate`}>{dept.name}</p>
                      <p className={`${textMuted} text-sm`}>
                        {dept.completed}/{dept.total} {isAr ? 'مهمة' : 'tasks'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-full rounded-full transition-all ${completionRate >= 70 ? 'bg-green-500' : completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${completionRate >= 70 ? 'text-green-400' : completionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {completionRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className={textMuted}>{isAr ? 'لا توجد بيانات' : 'No data available'}</p>
          </div>
        )}
      </div>

      {/* Quick Stats for Admin/CEO */}
      {(user.role === 'admin' || user.role === 'ceo') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className={textMuted}>{isAr ? 'إجمالي الموظفين' : 'Total Employees'}</p>
                <p className={`text-3xl font-bold ${textColor}`}>{users.length}</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className={textMuted}>{isAr ? 'عدد الأقسام' : 'Departments'}</p>
                <p className={`text-3xl font-bold ${textColor}`}>{departments.length}</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6`}>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className={textMuted}>{isAr ? 'نسبة الإنجاز' : 'Completion Rate'}</p>
                <p className={`text-3xl font-bold ${textColor}`}>
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
