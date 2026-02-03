import { useState } from 'react';
import { 
  Plus, Search, Edit, Trash2, MessageCircle, User as UserIcon,
  Phone, Building2, Shield, X, Check, AlertCircle, Star, Clock
} from 'lucide-react';
import { User, UserRole } from '../types';
import { usersAPI } from '../lib/api';
import { showToast } from '../store/useStore';

interface UsersManagementProps {
  store: ReturnType<typeof import('../store/useStore').useStore>;
  user: User;
  refetch?: () => Promise<void>;
}

export function UsersManagement({ store, user, refetch }: UsersManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});

  const isAr = store.settings.language === 'ar';
  const isDark = store.settings.theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'employee' as UserRole,
    departmentId: '',
    whatsapp: '',
    shiftStart: '09:00',
    shiftEnd: '17:00',
  });

  // Filter out admin users from display (unless current user is admin)
  const filteredUsers = store.users.filter((u: User) => {
    // Hide admin users unless you're admin
    if (u.role === 'admin' && user.role !== 'admin') return false;
    
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || u.departmentId === filterDept;
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    // If manager or team_leader, only show users from their department
    if (user.role === 'manager' || user.role === 'team_leader') {
      return matchesSearch && u.departmentId === user.departmentId;
    }
    
    return matchesSearch && matchesDept && matchesRole;
  });

  const getRoleConfig = (role: UserRole) => {
    const configs: Record<UserRole, { labelAr: string; labelEn: string; color: string; bg: string }> = {
      admin: { labelAr: 'مدير النظام', labelEn: 'Admin', color: 'text-red-400', bg: 'bg-red-500/20' },
      ceo: { labelAr: 'المدير التنفيذي', labelEn: 'CEO', color: 'text-purple-400', bg: 'bg-purple-500/20' },
      manager: { labelAr: 'مدير قسم', labelEn: 'Manager', color: 'text-blue-400', bg: 'bg-blue-500/20' },
      team_leader: { labelAr: 'قائد فريق', labelEn: 'Team Leader', color: 'text-orange-400', bg: 'bg-orange-500/20' },
      employee: { labelAr: 'موظف', labelEn: 'Employee', color: 'text-green-400', bg: 'bg-green-500/20' },
    };
    return configs[role];
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'employee',
      departmentId: user.departmentId || '',
      whatsapp: '',
      shiftStart: '09:00',
      shiftEnd: '17:00',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role,
      departmentId: u.departmentId || '',
      whatsapp: u.whatsapp,
      shiftStart: u.shift?.startTime || '09:00',
      shiftEnd: u.shift?.endTime || '17:00',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    
    // Check username uniqueness
    if (!store.isUsernameUnique(formData.username, editingUser?.id)) {
      errors.username = isAr ? 'اسم المستخدم موجود بالفعل' : 'Username already exists';
    }
    
    // Check password length
    if (formData.password.length < 6) {
      errors.password = isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || (!editingUser && !formData.password)) return;
    if (!validateForm()) return;

    if (refetch) {
      try {
        if (editingUser) {
          await usersAPI.update(editingUser.id, {
            name: formData.name,
            username: formData.username,
            ...(formData.password && { password: formData.password }),
            role: formData.role,
            departmentId: formData.departmentId || undefined,
            whatsapp: formData.whatsapp,
            shiftStart: formData.shiftStart,
            shiftEnd: formData.shiftEnd,
          });
        } else {
          await usersAPI.create({
            name: formData.name,
            username: formData.username,
            password: formData.password,
            role: formData.role,
            departmentId: formData.departmentId || undefined,
            whatsapp: formData.whatsapp,
            shiftStart: formData.shiftStart,
            shiftEnd: formData.shiftEnd,
          });
        }
        await refetch();
        setShowModal(false);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || '';
        if (msg.includes('Username') || msg.includes('اسم')) setFormErrors({ username: isAr ? 'اسم المستخدم موجود بالفعل' : 'Username already exists' });
        else if (msg.includes('Password') || msg.includes('كلمة')) setFormErrors({ password: isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' });
        else showToast(isAr ? 'فشل الحفظ' : 'Failed to save', 'error');
      }
      return;
    }

    if (editingUser) {
      const result = store.updateUser(editingUser.id, formData);
      if (!result.success) {
        if (result.error === 'username_exists') setFormErrors({ username: isAr ? 'اسم المستخدم موجود بالفعل' : 'Username already exists' });
        else if (result.error === 'password_short') setFormErrors({ password: isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' });
        return;
      }
    } else {
      const result = store.addUser(formData);
      if (!result.success) {
        if (result.error === 'username_exists') setFormErrors({ username: isAr ? 'اسم المستخدم موجود بالفعل' : 'Username already exists' });
        else if (result.error === 'password_short') setFormErrors({ password: isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' });
        return;
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (refetch) {
      try {
        await usersAPI.delete(id);
        await refetch();
        setShowDeleteConfirm(null);
      } catch {
        showToast(store.settings.language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user', 'error');
      }
      return;
    }
    store.deleteUser(id);
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
              placeholder={isAr ? 'البحث في المستخدمين...' : 'Search users...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {(user.role === 'admin' || user.role === 'ceo') && (
            <>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className={`px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="all">{isAr ? 'كل الأقسام' : 'All Departments'}</option>
                {store.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`px-4 py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="all">{isAr ? 'كل الأدوار' : 'All Roles'}</option>
                <option value="ceo">{isAr ? 'مدير تنفيذي' : 'CEO'}</option>
                <option value="manager">{isAr ? 'مدير قسم' : 'Manager'}</option>
                <option value="team_leader">{isAr ? 'قائد فريق' : 'Team Leader'}</option>
                <option value="employee">{isAr ? 'موظف' : 'Employee'}</option>
              </select>
            </>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">{isAr ? 'إضافة مستخدم' : 'Add User'}</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className={`backdrop-blur-xl ${cardBg} rounded-2xl border ${borderColor} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${borderColor}`}>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'المستخدم' : 'User'}
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'الدور' : 'Role'}
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'القسم' : 'Department'}
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'التقييم' : 'Rating'}
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'واتساب' : 'WhatsApp'}
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {isAr ? 'الشيفت' : 'Shift'}
                  </div>
                </th>
                <th className={`text-${isAr ? 'right' : 'left'} px-6 py-4 ${textMuted} font-medium`}>
                  {isAr ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: User) => {
                const roleConfig = getRoleConfig(u.role);
                const department = u.departmentId ? store.getDepartmentById(u.departmentId) : null;
                
                return (
                  <tr key={u.id} className={`border-b ${borderColor} hover:bg-white/5 transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`${textColor} font-medium`}>{u.name}</p>
                          <p className={`${textMuted} text-sm`}>@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleConfig.bg} ${roleConfig.color}`}>
                        {isAr ? roleConfig.labelAr : roleConfig.labelEn}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={textMuted}>{department?.name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className={textColor}>{u.rating?.toFixed(1) || '0.0'}</span>
                        <span className={`${textMuted} text-xs`}>
                          ({u.completedTasks || 0}/{u.totalTasks || 0})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.whatsapp ? (
                        <button
                          onClick={() => store.openWhatsApp(u.whatsapp)}
                          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{isAr ? 'التواصل عبر واتساب' : 'Contact via WhatsApp'}</span>
                        </button>
                      ) : (
                        <span className={textMuted}>-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.shift ? (
                        <div className={`flex items-center gap-1 ${textColor} text-sm`}>
                          <Clock className="w-4 h-4 text-cyan-400" />
                          <span dir="ltr">{u.shift.startTime} - {u.shift.endTime}</span>
                        </div>
                      ) : (
                        <span className={textMuted}>-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className={`p-2 rounded-lg ${textMuted} hover:bg-white/5 hover:text-white transition`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => setShowDeleteConfirm(u.id)}
                            className={`p-2 rounded-lg ${textMuted} hover:bg-red-500/10 hover:text-red-400 transition`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${cardBg} flex items-center justify-center`}>
              <UserIcon className={`w-10 h-10 ${textMuted}`} />
            </div>
            <h3 className={`${textColor} font-semibold text-lg mb-2`}>
              {isAr ? 'لا يوجد مستخدمين' : 'No users found'}
            </h3>
            <p className={textMuted}>
              {isAr ? 'لم يتم العثور على مستخدمين مطابقين للبحث' : 'No users matching your search'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg backdrop-blur-xl ${isDark ? 'bg-slate-800/95' : 'bg-white'} rounded-2xl border ${borderColor} shadow-2xl`}>
            <div className={`p-6 border-b ${borderColor} flex items-center justify-between`}>
              <h2 className={`text-xl font-bold ${textColor}`}>
                {editingUser 
                  ? (isAr ? 'تعديل المستخدم' : 'Edit User') 
                  : (isAr ? 'إضافة مستخدم جديد' : 'Add New User')
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
                  {isAr ? 'الاسم' : 'Name'} *
                </label>
                <div className="relative">
                  <UserIcon className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder={isAr ? 'الاسم الكامل' : 'Full name'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'اسم المستخدم' : 'Username'} *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setFormErrors({}); }}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${formErrors.username ? 'border-red-500' : borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="username"
                  />
                  {formErrors.username && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.username}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'كلمة المرور' : 'Password'} * (min 6)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setFormErrors({}); }}
                    className={`w-full px-4 py-3 rounded-xl ${inputBg} border ${formErrors.password ? 'border-red-500' : borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="••••••"
                  />
                  {formErrors.password && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                  {isAr ? 'رقم الواتساب' : 'WhatsApp Number'}
                </label>
                <div className="relative">
                  <Phone className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="201234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'الدور' : 'Role'}
                  </label>
                  <div className="relative">
                    <Shield className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none`}
                    >
                      {(user.role === 'admin') && <option value="ceo">{isAr ? 'مدير تنفيذي' : 'CEO'}</option>}
                      {(user.role === 'admin' || user.role === 'ceo') && <option value="manager">{isAr ? 'مدير قسم' : 'Manager'}</option>}
                      {(user.role === 'admin' || user.role === 'ceo' || user.role === 'manager') && (
                        <option value="team_leader">{isAr ? 'قائد فريق' : 'Team Leader'}</option>
                      )}
                      <option value="employee">{isAr ? 'موظف' : 'Employee'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block ${textMuted} text-sm font-medium mb-2`}>
                    {isAr ? 'القسم' : 'Department'}
                  </label>
                  <div className="relative">
                    <Building2 className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      disabled={user.role !== 'admin' && user.role !== 'ceo'}
                      className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none disabled:opacity-50`}
                    >
                      <option value="">{isAr ? 'اختر القسم' : 'Select Department'}</option>
                      {store.departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Shift Settings */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'} border border-cyan-500/20`}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <label className={`${textColor} font-medium`}>
                    {isAr ? 'موعد الشيفت' : 'Work Shift'}
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block ${textMuted} text-xs mb-1`}>
                      {isAr ? 'وقت البداية' : 'Start Time'}
                    </label>
                    <input
                      type="time"
                      value={formData.shiftStart}
                      onChange={(e) => {
                        const start = e.target.value;
                        // Auto-calculate end time (8 hours later)
                        const [hours, mins] = start.split(':').map(Number);
                        const endHours = (hours + 8) % 24;
                        const endTime = `${endHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                        setFormData({ ...formData, shiftStart: start, shiftEnd: endTime });
                      }}
                      className={`w-full px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <div>
                    <label className={`block ${textMuted} text-xs mb-1`}>
                      {isAr ? 'وقت النهاية' : 'End Time'}
                    </label>
                    <input
                      type="time"
                      value={formData.shiftEnd}
                      onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                </div>
                <p className={`${textMuted} text-xs mt-2`}>
                  {isAr ? 'عند تغيير وقت البداية، يتم حساب وقت النهاية تلقائياً (8 ساعات)' : 'End time is auto-calculated (8 hours) when changing start time'}
                </p>
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
                {editingUser 
                  ? (isAr ? 'حفظ التغييرات' : 'Save Changes') 
                  : (isAr ? 'إضافة المستخدم' : 'Add User')
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
                ? 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this user? This action cannot be undone.'
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
