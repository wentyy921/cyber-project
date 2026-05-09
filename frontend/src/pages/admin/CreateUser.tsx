import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Lock, Mail, User, ShieldCheck } from 'lucide-react';

const CreateUser = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Reset status when username changes
  useEffect(() => {
    setStatus('idle');
  }, [username]);

  const checkUsername = async () => {
    if (username.length < 4) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    try {
      const res = await api.get(`/check_login?username=${username}`);
      setStatus(res.data.available ? 'available' : 'taken');
    } catch (e) {
      setStatus('idle');
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-yellow-400', 'bg-green-500', 'bg-emerald-600'];
  const strengthColor = strengthColors[Math.min(strength, 4)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'taken') {
      setMessage({ text: 'Этот логин уже занят', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: 'Пароль должен быть не менее 6 символов', type: 'error' });
      return;
    }
    
    const fioRegex = /^[А-Яа-яЁё\s\-]+$/;
    if (!fioRegex.test(fullName)) {
      setMessage({ text: 'ФИО должно содержать только русские буквы', type: 'error' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ text: 'Неверный формат Email', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      await api.post('/admin/create_user', {
        username,
        full_name: fullName,
        email,
        role,
        password
      });
      setMessage({ text: 'Пользователь успешно создан!', type: 'success' });
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('student');
      setStatus('idle');
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Ошибка при создании пользователя', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Новый пользователь</h1>
        <p className="text-gray-400 mt-1">Добавление учетной записи в систему</p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <ShieldCheck size={20} />
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between">
                  <span>Логин *</span>
                  {username.length > 0 && (
                    <button type="button" onClick={checkUsername} className="text-xs text-red-400 hover:underline">
                      {status === 'idle' ? 'Проверить' : 
                       status === 'checking' ? 'Проверка...' : 
                       status === 'available' ? '✅ Свободен' : '⛔ Занят'}
                    </button>
                  )}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    required 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    autoComplete="new-password"
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-xl focus:border-red-500 transition-all" 
                    placeholder="user123" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Пароль *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    required 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    autoComplete="new-password"
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-xl focus:border-red-500 transition-all" 
                    placeholder="Минимум 6 символов" 
                  />
                </div>
                {password.length > 0 && (
                  <div className="mt-2 flex gap-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${(strength / 4) * 100}%` }}></div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ФИО *</label>
                <input 
                  required 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  className="w-full px-4 py-3 glass-input rounded-xl focus:border-red-500 transition-all" 
                  placeholder="Иванов Иван Иванович" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    required 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full pl-12 pr-4 py-3 glass-input rounded-xl focus:border-red-500 transition-all" 
                    placeholder="mail@example.com" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Роль *</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  className="w-full px-4 py-3 glass-input rounded-xl focus:border-red-500 transition-all"
                >
                  <option value="student" className="text-gray-900 dark:text-white">Студент</option>
                  <option value="teacher" className="text-gray-900 dark:text-white">Преподаватель</option>
                  <option value="admin" className="text-gray-900 dark:text-white">Администратор</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 glass-button-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-50"
            >
              <UserPlus size={20} />
              {loading ? 'Создание...' : 'Создать пользователя'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
