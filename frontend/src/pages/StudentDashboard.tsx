import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, User as UserIcon, LayoutDashboard, Calendar as CalendarIcon, Trophy, Library } from 'lucide-react';
import CourseList from './student/CourseList';
import CourseView from './student/CourseView';
import Quiz from './student/Quiz';
import Profile from './student/Profile';
import Leaderboard from './student/Leaderboard';
import KnowledgeBase from './student/KnowledgeBase';
import Calendar from './student/Calendar';

// Главный лейаут студенческой части приложения (Student Dashboard).
// Архитектурно оборачивает все дочерние компоненты студента в единый интерфейс 
// с адаптивной боковой навигацией (Sidebar) и центральной областью (Main Content Area).
const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Логика выхода из аккаунта. Очищает AuthContext и сессию.
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Вспомогательная функция для подсветки активного раздела в меню.
  // Анализирует React Router Location для динамического изменения стилей ссылок.
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden p-4 gap-4 relative z-10">
      {/* Sidebar (Боковое меню)
          На мобильных устройствах (md-) отображается как верхняя панель (flex-col).
          Стилизовано с применением паттерна Glassmorphism. */}
      <aside className="glass-panel w-full md:w-72 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-400" />
            Кабинет
          </h2>
          <p className="text-sm text-gray-300 mt-2 truncate">Привет, {user?.fullName || user?.username}!</p>
        </div>
        
        {/* Навигационные ссылки. Использование <Link> предотвращает полную перезагрузку страницы (SPA-роутинг). */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/student"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/student') && location.pathname === '/student'
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <BookOpen size={20} />
            Мои курсы
          </Link>
          
          <Link
            to="/student/calendar"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/student/calendar')
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <CalendarIcon size={20} />
            Календарь
          </Link>
          
          <Link
            to="/student/leaderboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/student/leaderboard')
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <Trophy size={20} />
            Рейтинг
          </Link>
          
          <Link
            to="/student/knowledge-base"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/student/knowledge-base')
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <Library size={20} />
            База Знаний
          </Link>
          
          <Link
            to="/student/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/student/profile')
                ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <UserIcon size={20} />
            Профиль
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-300"
          >
            <LogOut size={20} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content Area (Окно рендеринга активного маршрута).
          Вложенный роутер загружает компоненты (CourseList, Quiz и т.д.) без перерисовки Sidebar'а. */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto glass-panel">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/course/:id" element={<CourseView />} />
          <Route path="/quiz/:slug" element={<Quiz />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;

