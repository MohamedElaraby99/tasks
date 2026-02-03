import { useState } from 'react';
import { 
  Plus, Search, Edit, Trash2, Building2, Users, 
  ClipboardList, X, Check
} from 'lucide-react';
import { Department } from '../types';
import { departmentsAPI } from '../lib/api';
import { showToast } from '../store/useStore';

interface DepartmentsManagementProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  refetch?: () => Promise<void>;
}

export function DepartmentsManagement({ store, refetch }: DepartmentsManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
  });

  const filteredDepartments = store.departments.filter((d: Department) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDeptStats = (deptId: string) => {
    const employees = store.users.filter((u) => u.departmentId === deptId);
    const manager = store.users.find((u) => u.departmentId === deptId && u.role === 'manager');
    const teamLeaders = store.users.filter((u) => u.departmentId === deptId && u.role === 'team_leader');
    const tasks = store.tasks.filter((t) => t.departmentId === deptId);
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    
    return {
      employeesCount: employees.length,
      manager,
      teamLeaders,
      tasksCount: tasks.length,
      completedCount: completedTasks.length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    };
  };

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', nameEn: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      nameEn: dept.nameEn || '',
      description: dept.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    if (refetch) {
      try {
        if (editingDept) {
          await departmentsAPI.update(editingDept.id, formData);
        } else {
          await departmentsAPI.create(formData);
        }
        await refetch();
        setShowModal(false);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل الحفظ' : 'Failed to save', 'error');
      }
      return;
    }
    if (editingDept) store.updateDepartment(editingDept.id, formData);
    else store.addDepartment(formData);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (refetch) {
      try {
        await departmentsAPI.delete(id);
        await refetch();
        setShowDeleteConfirm(null);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل حذف القسم' : 'Failed to delete department', 'error');
      }
      return;
    }
    store.deleteDepartment(id);
    setShowDeleteConfirm(null);
  };

  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-100';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
            <input
              type="text"
              placeholder={isAr ? 'البحث في الأقسام...' : 'Search departments...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition"
        >
          <Plus className="w-5 h-5" />
          <span>{isAr ? 'إضافة قسم' : 'Add Department'}</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept: Department) => {
          const stats = getDeptStats(dept.id);
          
          return (
            <div
              key={dept.id}
              className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} p-6 hover:bg-white/10 transition-all group`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`${textColor} font-semibold text-lg`}>{dept.name}</h3>
                    <p className={`${textMuted} text-sm`}>{dept.description || (isAr ? 'بدون وصف' : 'No description')}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEditModal(dept)}
                    className={`p-2 rounded-lg ${textMuted} hover:bg-white/5 hover:text-white transition`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(dept.id)}
                    className={`p-2 rounded-lg ${textMuted} hover:bg-red-500/10 hover:text-red-400 transition`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Manager */}
              {stats.manager && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`${textMuted} text-xs mb-1`}>{isAr ? 'مدير القسم' : 'Manager'}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                      {stats.manager.name.charAt(0)}
                    </div>
                    <span className={textColor}>{stats.manager.name}</span>
                  </div>
                </div>
              )}

              {/* Team Leaders */}
              {stats.teamLeaders.length > 0 && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`${textMuted} text-xs mb-2`}>
                    {isAr ? 'قادة الفرق' : 'Team Leaders'} ({stats.teamLeaders.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.teamLeaders.map(leader => (
                      <div key={leader.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs">
                          {leader.name.charAt(0)}
                        </div>
                        <span className="text-orange-400 text-xs">{leader.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className={`flex items-center gap-2 ${textMuted} mb-1`}>
                    <Users className="w-4 h-4" />
                    <span className="text-xs">{isAr ? 'الموظفين' : 'Employees'}</span>
                  </div>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.employeesCount}</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className={`flex items-center gap-2 ${textMuted} mb-1`}>
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-xs">{isAr ? 'المهام' : 'Tasks'}</span>
                  </div>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.tasksCount}</p>
                </div>
              </div>

              {/* Completion Rate */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className={textMuted}>{isAr ? 'نسبة الإنجاز' : 'Completion Rate'}</span>
                  <span className={`${textColor} font-medium`}>{stats.completionRate}%</span>
                </div>
                <div className={`h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-12">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${cardBg} flex items-center justify-center`}>
            <Building2 className={`w-10 h-10 ${textMuted}`} />
          </div>
          <h3 className={`${textColor} font-semibold text-lg mb-2`}>
            {isAr ? 'لا توجد أقسام' : 'No departments found'}
          </h3>
          <p className={textMuted}>
            {isAr ? 'لم يتم العثور على أقسام مطابقة للبحث' : 'No departments matching your search'}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl`}>
            <div className={`p-6 border-b ${borderColor} flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {editingDept 
                  ? (isAr ? 'تعديل القسم' : 'Edit Department') 
                  : (isAr ? 'إضافة قسم جديد' : 'Add New Department')
                }
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-lg hover:bg-white/5 ${textMuted} hover:text-white transition`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'اسم القسم (عربي)' : 'Department Name (Arabic)'}
                </label>
                <div className="relative">
                  <Building2 className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder={isAr ? 'اسم القسم' : 'Department name'}
                  />
                </div>
              </div>

              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'اسم القسم (إنجليزي)' : 'Department Name (English)'}
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Department name in English"
                />
              </div>

              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none`}
                  placeholder={isAr ? 'وصف القسم (اختياري)' : 'Department description (optional)'}
                />
              </div>
            </div>
            <div className={`p-6 border-t ${borderColor} flex gap-3 justify-end`}>
              <button
                onClick={() => setShowModal(false)}
                className={`px-6 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg transition"
              >
                <Check className="w-4 h-4" />
                {editingDept 
                  ? (isAr ? 'حفظ التغييرات' : 'Save Changes') 
                  : (isAr ? 'إضافة القسم' : 'Add Department')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl p-6 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>
              {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className={`${textMuted} mb-6`}>
              {isAr 
                ? 'هل أنت متأكد من حذف هذا القسم؟ سيتم إلغاء ربط جميع الموظفين والمهام بهذا القسم.'
                : 'Are you sure you want to delete this department? All employees and tasks will be unlinked.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-xl border ${borderColor} ${textMuted} hover:bg-white/5 transition`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
              >
                {isAr ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
