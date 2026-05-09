import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Shield, UserCog, Users, ChevronUp, ChevronDown, X, Clock, Mail, Calendar, Activity, Edit2, Trash2, AlertTriangle, Save } from 'lucide-react';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_blocked: number;
  created_at: string;
  last_seen: string;
}

const UserManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoUser, setInfoUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deletePhase, setDeletePhase] = useState(0);
  const [editData, setEditData] = useState({ username: '', full_name: '', email: '', role: '', password: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const openInfo = (u: User) => {
    setInfoUser(u);
    setIsEditing(false);
    setDeletePhase(0);
    setEditError('');
    setEditData({ username: u.username, full_name: u.full_name || '', email: u.email || '', role: u.role, password: '' });
  };

  const handleSaveEdit = async () => {
    setEditError('');
    setEditLoading(true);
    try {
      await api.post('/admin/edit_user', {
        userId: infoUser!.id,
        ...editData
      });
      setIsEditing(false);
      fetchUsers();
      setInfoUser({ ...infoUser!, username: editData.username, full_name: editData.full_name, email: editData.email, role: editData.role });
    } catch (e: any) {
      setEditError(e.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.post('/admin/delete_user', { userId: infoUser!.id });
      setInfoUser(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка удаления');
    }
  };

  // Search and suggestions
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sorting state
  type SortKey = 'id' | 'username' | 'role' | 'last_seen' | 'created_at';
  type SortOrder = 'asc' | 'desc' | 'none';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'id', order: 'none' });

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch users");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Real-time polling every 5 seconds
    pollingRef.current = setInterval(fetchUsers, 5000);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleBanToggle = async (userId: number, currentStatus: number) => {
    if (!window.confirm(`Вы уверены, что хотите ${currentStatus ? 'разблокировать' : 'заблокировать'} пользователя?`)) return;
    try {
      await api.post('/admin/ban_user', { userId, is_blocked: currentStatus ? 0 : 1 });
      fetchUsers();
    } catch (e) {
      alert("Ошибка изменения статуса");
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: SortOrder = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.order === 'asc') direction = 'desc';
      else if (sortConfig.order === 'desc') direction = 'none';
    }
    setSortConfig({ key, order: direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key || sortConfig.order === 'none') return null;
    return sortConfig.order === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
  };

  // Processed users (Search Filter & Sorting)
  let processedUsers = [...users];

  // 1. Search Filter
  const lowerSearch = search.toLowerCase();
  if (search) {
    processedUsers = processedUsers.filter(u => 
      u.username.toLowerCase().includes(lowerSearch) || 
      (u.full_name && u.full_name.toLowerCase().includes(lowerSearch)) ||
      u.email.toLowerCase().includes(lowerSearch)
    );
  }

  if (sortConfig.order !== 'none') {
    processedUsers.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      
      if (sortConfig.key === 'username') {
        aVal = a.full_name ? `${a.username} ${a.full_name}`.toLowerCase() : a.username.toLowerCase();
        bVal = b.full_name ? `${b.username} ${b.full_name}`.toLowerCase() : b.username.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const isOnline = (last_seen: string) => {
    if (!last_seen) return false;
    const diff = new Date().getTime() - new Date(last_seen).getTime();
    return diff < 30 * 1000; // 30 seconds
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Управление пользователями</h1>
        <p className="text-gray-400 mt-1">Список всех зарегистрированных в системе.</p>
      </div>

      {/* Search Bar with Dropdown */}
      <div className="flex justify-end mb-6">
        <div className="w-full md:w-96 relative" ref={searchRef}>
          <input 
            type="text" 
            placeholder="🔍 Поиск (Логин, ФИО, Email)..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full p-3 pl-4 bg-[#161821] text-white placeholder-gray-400 border border-white/10 rounded-xl focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
          />
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-panel shadow-2xl z-20 max-h-60 overflow-y-auto overflow-x-hidden animate-fade-in">
              {processedUsers.slice(0, 5).map(u => (
                <div 
                  key={u.id} 
                  onClick={() => { setSearch(u.username); setShowSuggestions(false); }}
                  className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="text-red-400">@{u.username}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{u.full_name || u.email}</div>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    {u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Студент'}
                  </div>
                </div>
              ))}
              {processedUsers.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">Ничего не найдено</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка пользователей...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-300 font-semibold text-sm">
                  <th className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('id')}>
                    ID {getSortIcon('id')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('username')}>
                    Логин / ФИО {getSortIcon('username')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('role')}>
                    Роль {getSortIcon('role')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('last_seen')}>
                    Статус {getSortIcon('last_seen')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" onClick={() => handleSort('created_at')}>
                    Регистрация {getSortIcon('created_at')}
                  </th>
                  <th className="py-4 px-6">Действия</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {processedUsers.map(u => {
                  const online = isOnline(u.last_seen);
                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-gray-400">{u.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{u.username}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{u.full_name || u.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          {u.role === 'admin' ? <Shield size={14} className="text-orange-500" /> :
                           u.role === 'teacher' ? <UserCog size={14} className="text-indigo-500" /> :
                           <Users size={14} className="text-purple-500" />}
                          {u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Студент'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                           <span className={`font-medium ${online ? 'text-green-400' : 'text-gray-400'}`}>
                             {online ? 'Online' : 'Offline'}
                           </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 items-center">
                          <button 
                            onClick={() => openInfo(u)}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
                          >
                            Инфо
                          </button>
                          {u.role !== 'admin' && (
                            <button 
                              onClick={() => handleBanToggle(u.id, u.is_blocked)}
                              className={`text-white text-xs font-medium px-3 py-1.5 rounded transition-colors ${u.is_blocked ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                              {u.is_blocked ? 'Разбанить' : 'Забанить'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {processedUsers.length === 0 && (
              <div className="p-8 text-center text-gray-500">Ничего не найдено</div>
            )}
          </div>
        )}
      </div>
      {/* Info Modal */}
      {infoUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!isEditing) setInfoUser(null); }}></div>
          <div className="relative glass-panel shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden flex flex-col z-10">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditing ? <Edit2 className="text-blue-500" /> : <Activity className="text-red-500" />}
                {isEditing ? 'Редактирование' : 'Карточка пользователя'}
              </h2>
              <button 
                onClick={() => setInfoUser(null)}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {editError && (
                <div className="p-3 bg-red-500/20 text-red-400 text-sm rounded-xl border border-red-500/30">
                  {editError}
                </div>
              )}
              
              {deletePhase > 0 && (
                <div className={`p-4 rounded-xl border animate-fade-in ${deletePhase === 1 ? 'bg-orange-500/20 border-orange-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 ${deletePhase === 1 ? 'text-orange-500' : 'text-red-500'}`} />
                    <div>
                      <h4 className={`font-bold ${deletePhase === 1 ? 'text-orange-400' : 'text-red-400'}`}>
                        {deletePhase === 1 ? 'Внимание!' : 'ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ'}
                      </h4>
                      <p className={`text-sm mt-1 mb-3 ${deletePhase === 1 ? 'text-orange-400' : 'text-red-400'}`}>
                        {deletePhase === 1 ? `Вы уверены, что хотите удалить ${infoUser.username}? Это действие необратимо.` : 'Все данные будут стерты навсегда. Подтвердить удаление?'}
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => deletePhase === 1 ? setDeletePhase(2) : handleDeleteUser()}
                          className={`px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors ${deletePhase === 1 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {deletePhase === 1 ? 'Продолжить удаление' : 'Точно удалить'}
                        </button>
                        <button 
                          onClick={() => setDeletePhase(0)}
                          className={`glass-button px-4 py-2 text-sm font-semibold`}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-2xl uppercase">
                  {infoUser.username.substring(0, 2)}
                </div>
                {!isEditing ? (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white">{infoUser.username}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Mail size={14} /> {infoUser.email}
                      </p>
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        infoUser.role === 'admin' ? 'bg-orange-500/20 text-orange-400' :
                        infoUser.role === 'teacher' ? 'bg-indigo-500/20 text-indigo-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {infoUser.role === 'admin' ? 'Админ' : infoUser.role === 'teacher' ? 'Учитель' : 'Студент'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        isOnline(infoUser.last_seen) ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {isOnline(infoUser.last_seen) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 space-y-3 animate-fade-in">
                    <div>
                      <label className="text-xs font-medium text-gray-400 ml-1">Логин</label>
                      <input 
                        type="text" 
                        value={editData.username} 
                        onChange={e => setEditData({...editData, username: e.target.value})}
                        className="w-full mt-1 p-2 glass-input rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 ml-1">Роль</label>
                      <select 
                        value={editData.role} 
                        onChange={e => setEditData({...editData, role: e.target.value})}
                        className="w-full mt-1 p-2 glass-input rounded-lg"
                      >
                        <option value="student" className="text-gray-900 dark:text-white">Студент</option>
                        <option value="teacher" className="text-gray-900 dark:text-white">Учитель</option>
                        <option value="admin" className="text-gray-900 dark:text-white">Администратор</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Регистрация
                      </div>
                      <div className="font-semibold text-white text-sm">
                        {new Date(infoUser.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Clock size={12} /> Последний вход
                      </div>
                      <div className="font-semibold text-white text-sm">
                        {infoUser.last_seen ? new Date(infoUser.last_seen).toLocaleString('ru-RU') : 'Никогда'}
                      </div>
                    </div>
                  </div>
                  
                  {infoUser.full_name && (
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <Users size={12} /> Полное имя (ФИО)
                      </div>
                      <div className="font-semibold text-white text-sm">
                        {infoUser.full_name}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 animate-fade-in border-t border-white/10 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-400 ml-1">Email</label>
                    <input 
                      type="email" 
                      value={editData.email} 
                      onChange={e => setEditData({...editData, email: e.target.value})}
                      className="w-full mt-1 p-2.5 glass-input rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 ml-1">Полное имя (ФИО)</label>
                    <input 
                      type="text" 
                      value={editData.full_name} 
                      onChange={e => setEditData({...editData, full_name: e.target.value})}
                      className="w-full mt-1 p-2.5 glass-input rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 ml-1">Новый пароль (оставьте пустым, чтобы не менять)</label>
                    <input 
                      type="password" 
                      value={editData.password} 
                      onChange={e => setEditData({...editData, password: e.target.value})}
                      className="w-full mt-1 p-2.5 glass-input rounded-xl"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
              {!isEditing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 glass-button font-medium transition-colors text-sm"
                  >
                    <Edit2 size={16} /> Редактировать
                  </button>
                  {infoUser.role !== 'admin' && deletePhase === 0 && (
                    <button 
                      onClick={() => setDeletePhase(1)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-medium transition-colors text-sm"
                    >
                      <Trash2 size={16} /> Удалить
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex items-center gap-1.5 px-5 py-2 glass-button-primary font-medium transition-colors text-sm disabled:opacity-70"
                  >
                    {editLoading ? 'Сохранение...' : <><Save size={16} /> Сохранить</>}
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setEditError(''); }}
                    className="px-4 py-2 glass-button font-medium transition-colors text-sm"
                  >
                    Отмена
                  </button>
                </div>
              )}

              {!isEditing && (
                <button 
                  onClick={() => setInfoUser(null)}
                  className="px-5 py-2.5 glass-button font-medium transition-colors text-sm"
                >
                  Закрыть
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
