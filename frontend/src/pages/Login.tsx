import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, User, Mail, UserCheck, ShieldCheck } from 'lucide-react';

// Компонент Авторизации и Регистрации (Login / Registration Component).
// Точка входа в систему. Реализует паттерн "Unified Auth Form" — переключение
// между входом и регистрацией происходит внутри одного интерфейса с помощью стейта `isLogin`.
const Login = () => {
  // Управление состоянием формы и UI
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Состояние для асинхронной проверки доступности логина (Username Availability Check)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Сброс статуса проверки логина при его изменении пользователем (Debounce-эффект)
  useEffect(() => {
    setUsernameStatus('idle');
  }, [username]);

  // Главный обработчик сабмита формы (Submit Handler)
  // Объединяет логику входа и регистрации, разделяя потоки управления в зависимости от `isLogin`.
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); // Предотвращение стандартного поведения браузера (перезагрузки страницы)
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Логика аутентификации (Authentication)
        const response = await api.post('/login', { username, password });
        const { token, user } = response.data;
        
        // Запись токена и данных пользователя в глобальный контекст
        login(token, user);
        
        // Role-Based Routing (Маршрутизация на основе ролей)
        // Направляет пользователя в соответствующий интерфейс согласно его уровню доступа.
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'teacher') navigate('/teacher');
        else navigate('/student');
        
      } else {
        // Логика регистрации (Registration)
        // Предварительная валидация данных на клиенте (Client-Side Validation)
        if (username.length < 4) throw new Error("Логин слишком короткий (мин. 4 символа)");
        if (password.length < 6) throw new Error("Пароль слишком короткий (мин. 6 символов)");
        
        const fioRegex = /^[А-Яа-яЁё\s\-]+$/;
        if (!fioRegex.test(fullName)) {
          throw new Error('ФИО должно содержать только русские буквы');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Неверный формат Email');
        }
        
        // Отправка запроса на создание пользователя
        const response = await api.post('/register', { 
          username, 
          password, 
          fullName, 
          email 
        });
        
        if (response.data.success) {
          setIsLogin(true); // Автоматический переход к форме входа после успешной регистрации
          setError('Регистрация успешна! Теперь вы можете войти.');
          setPassword('');
        }
      }
    } catch (err: any) {
      // Обработка ошибок сети и валидации (Error Handling)
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
         setError(err.message);
      } else {
        setError('Произошла ошибка при подключении к серверу');
      }
    } finally {
      setLoading(false); // Снятие блокировки кнопки в любом случае
    }
  };

  // Асинхронная проверка доступности логина через API
  const checkUsername = async () => {
    if (username.length < 4) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await api.get(`/check_login?username=${username}`);
      setUsernameStatus(res.data.available ? 'available' : 'taken');
    } catch (e) {
      setUsernameStatus('idle');
    }
  };

  // Вычисление сложности пароля (Password Strength Visualizer).
  // Анализирует пароль по регулярным выражениям для предоставления визуального фидбека (UX).
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10 transition-colors duration-300">
      
      {/* Главный контейнер формы с эффектом Glassmorphism */}
      <div className="w-full max-w-md glass-panel overflow-hidden border border-white/20">
        
        {/* Header Section (Заголовок) */}
        <div className="bg-white/5 backdrop-blur-md p-8 text-center text-gray-100 border-b border-white/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/10 p-4 rounded-full mb-4 backdrop-blur-md shadow-lg shadow-indigo-500/20 border border-white/10">
              <ShieldCheck size={36} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Кибер-Тренажер</h2>
            <p className="text-gray-300 text-sm mt-2 font-medium">{isLogin ? 'С возвращением!' : 'Создайте новый аккаунт'}</p>
          </div>
        </div>

        {/* Form Section (Тело формы) */}
        <div className="p-8 bg-black/20">
          <form onSubmit={handleAuth} className="space-y-5" autoComplete="off">
            
            {/* Блок отображения ошибок */}
            {error && (
              <div className={`p-3 rounded-lg text-sm ${error.includes('успешна') ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
                <span>Логин</span>
                {/* Кнопка ручной проверки логина (только при регистрации) */}
                {!isLogin && username.length > 0 && (
                   <button type="button" className="text-xs text-indigo-600 cursor-pointer hover:underline focus:outline-none font-semibold" onClick={checkUsername}>
                     {usernameStatus === 'idle' ? 'Проверить' : 
                      usernameStatus === 'checking' ? 'Проверка...' : 
                      usernameStatus === 'available' ? '✅ Свободен' : '⛔ Занят'}
                   </button>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                  <input
                    type="text"
                    required
                    autoComplete="new-password"
                    className="glass-input pl-10 w-full px-4 py-3"
                    placeholder="Введите логин"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
              </div>
            </div>

            {/* Дополнительные поля, отображаемые только в режиме регистрации (Conditional Rendering) */}
            {!isLogin && (
              <>
                <div className="space-y-1 animate-fade-in">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ФИО *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCheck className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="new-password"
                      className="glass-input pl-10 w-full px-4 py-3"
                      placeholder="Иван Иванов"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1 animate-fade-in">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="new-password"
                      className="glass-input pl-10 w-full px-4 py-3"
                      placeholder="example@mail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="glass-input pl-10 w-full px-4 py-3"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {/* Полоса индикации сложности пароля */}
              {!isLogin && password.length > 0 && (
                <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
                  <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(Math.max(1, strength) / 4) * 100}%` }}></div>
                </div>
              )}
            </div>

            {/* Кнопка отправки формы. Блокируется (disabled) во время выполнения API-запроса (loading) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button-primary py-3 px-4 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isLogin ? 'Войти в систему' : 'Зарегистрироваться'}
            </button>

          </form>

          {/* Переключатель режимов Вход / Регистрация */}
          <div className="mt-6 text-center text-sm text-gray-400">
            {isLogin ? "Еще нет аккаунта?" : "Уже есть аккаунт?"}{' '}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {isLogin ? "Зарегистрируйтесь" : "Войдите"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

