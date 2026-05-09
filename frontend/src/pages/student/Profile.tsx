import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Mail, Lock, Trophy, History, Settings, CheckCircle, XCircle, Upload, UserCircle } from 'lucide-react';
import { useTrophies, TROPHIES } from '../../context/TrophyContext';

const Profile = () => {
  const { user, login } = useAuth(); // login to update user context
  const [activeTab, setActiveTab] = useState('trophies');
  
  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { unlockedTrophies } = useTrophies();

  // Data State
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, passedExams: 0, efficiency: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resResults, resMe] = await Promise.all([
        api.get('/results'),
        api.get('/users/me') // Assuming we have an endpoint for this, or we just rely on /results
      ]);
      
      const myResults = [...resResults.data];
      myResults.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setResults(myResults);
      
      const passedCount = myResults.filter((r: any) => r.passed).length;
      const totalCount = myResults.length;
      const eff = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
      
      setStats({
        views: resMe.data.view_count || 0, // We need to add this to the backend if not present
        passedExams: passedCount,
        efficiency: eff
      });
      
      setEmail(resMe.data.email || '');
      setFullName(resMe.data.full_name || '');
      
    } catch (e) {
      console.error("Failed to load profile data", e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = { id: user?.id, fullName, email, avatar };
      if (password) payload.password = password;
      
      const res = await api.post('/student/update_profile', payload);
      if (res.data.success) {
        setSaveStatus({ message: 'Профиль успешно обновлен!', type: 'success' });
        setIsEditing(false);
        setPassword('');
        login(localStorage.getItem('lms_token') || '', res.data.user);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setSaveStatus({ message: err.response?.data?.detail || 'Ошибка сохранения', type: 'error' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSaveStatus({ message: '', type: '' });
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/upload_avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setAvatar(res.data.avatar_url);
        setSaveStatus({ message: 'Аватар загружен! Не забудьте сохранить изменения.', type: 'success' });
        setIsEditing(true);
      }
    } catch (err: unknown) {
      setSaveStatus({ message: 'Ошибка загрузки аватара', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Data State

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="glass-panel overflow-hidden mb-8 border-indigo-500/20">
        <div className="bg-indigo-600/20 backdrop-blur-md p-8 text-white flex items-center gap-6 border-b border-indigo-500/20">
          <div className="relative group w-24 h-24">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-lg" />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-4 border-white/30 text-4xl shadow-lg">
                <UserCircle size={48} className="text-white" />
              </div>
            )}
            <button 
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10 cursor-pointer"
            >
              <Upload size={24} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user?.fullName || user?.username}</h1>
            <p className="text-indigo-200 mt-1 flex items-center gap-2">
              <Mail size={16} /> {email || 'Email не указан'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 divide-x divide-white/10 bg-black/20">
          <div className="p-6 text-center">
            <div className="text-sm text-gray-400 uppercase font-semibold">Сдано экзаменов</div>
            <div className="text-3xl font-bold text-white">{stats.passedExams}</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-sm text-gray-400 uppercase font-semibold">Эффективность</div>
            <div className="text-3xl font-bold text-white">{stats.efficiency}%</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-sm text-gray-400 uppercase font-semibold">Всего попыток</div>
            <div className="text-3xl font-bold text-white">{results.length}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('trophies')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'trophies' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Trophy size={18} /> Стена Трофеев
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <History size={18} /> История результатов
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Settings size={18} /> Настройки
        </button>
      </div>

      {/* Trophies Tab */}
      {activeTab === 'trophies' && (
        <div className="animate-fade-in">
          {unlockedTrophies.length === 0 ? (
            <div className="text-center p-12 glass-card">
              <Trophy className="mx-auto text-gray-500 mb-4" size={48} />
              <h3 className="text-xl font-medium text-gray-300">Пока нет трофеев</h3>
              <p className="text-gray-400 mt-1">Сдайте свой первый экзамен или пройдите лекцию, чтобы получить награду!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unlockedTrophies.map((id) => {
                const t = TROPHIES[id];
                if (!t) return null;
                return (
                  <div key={id} className="relative group overflow-hidden glass-card p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center justify-center text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Glassmorphism shine effect */}
                    <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:animate-[shine_1.5s_ease-out]"></div>
                    
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 mb-4 relative z-10 border-2 border-yellow-500/30">
                      <img src={t.image} alt={t.title} className="w-full h-full object-cover rounded-full p-1" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 relative z-10">{t.title}</h3>
                    <p className="text-sm text-gray-300 relative z-10">{t.description}</p>
                    <div className="mt-4 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/30 relative z-10">
                      РАЗБЛОКИРОВАНО
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-gray-300">Дата</th>
                <th className="p-4 font-semibold text-gray-300">Курс / Тема</th>
                <th className="p-4 font-semibold text-gray-300 text-center">Результат</th>
                <th className="p-4 font-semibold text-gray-300 text-center">Ошибок</th>
                <th className="p-4 font-semibold text-gray-300 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">История пуста</td></tr>
              ) : (
                results.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-gray-200">{new Date(r.date).toLocaleString()}</td>
                    <td className="p-4 font-medium text-gray-200">{r.topic}</td>
                    <td className="p-4 text-center text-sm font-semibold text-gray-300">{r.score}%</td>
                    <td className="p-4 text-center text-sm text-gray-400">
                      {Math.max(0, r.total_questions - r.passed)}
                    </td>
                    <td className="p-4 text-center">
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-xs font-bold">
                          <CheckCircle size={14} /> СДАНО
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded-md text-xs font-bold">
                          <XCircle size={14} /> ПРОВАЛ
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="glass-panel p-8 animate-fade-in max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Редактирование профиля</h2>
          
          {saveStatus.message && (
            <div className={`p-4 rounded-xl mb-6 ${saveStatus.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {saveStatus.message}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ФИО</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="glass-input pl-10 w-full p-3 rounded-xl disabled:opacity-60"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  disabled={!isEditing}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="glass-input pl-10 w-full p-3 rounded-xl disabled:opacity-60"
                />
              </div>
            </div>

            {isEditing && (
              <div className="animate-fade-in pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-300 mb-1">Новый пароль (оставьте пустым, если не хотите менять)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="glass-input pl-10 w-full p-3 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-4">
              {isEditing ? (
                <>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 transition-colors">
                    Отмена
                  </button>
                  <button type="submit" className="px-6 py-2.5 glass-button-primary">
                    Сохранить изменения
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="px-6 py-2.5 glass-button">
                  Редактировать профиль
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
