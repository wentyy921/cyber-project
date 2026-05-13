import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Users, BarChart3, UserCircle, Library } from 'lucide-react';
import CourseManager from './teacher/CourseManager';
import StudentManager from './teacher/StudentManager';
import Analytics from './teacher/Analytics';
import TeacherProfile from './teacher/TeacherProfile';
import CourseView from './student/CourseView';
import Quiz from './student/Quiz';
import FullPageEditor from './teacher/FullPageEditor';
import KnowledgeManager from './teacher/KnowledgeManager';

// Главный лейаут кабинета преподавателя.
// Предоставляет интерфейс для управления образовательным контентом и мониторинга прогресса студентов.
const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Конфигурация вкладок меню.
  // Архитектурно вынесена из разметки для соблюдения принципа DRY (Don't Repeat Yourself).
  const navItems = [
    { path: '/teacher', icon: <BookOpen size={20} />, label: 'Управление курсами' },
    { path: '/teacher/students', icon: <Users size={20} />, label: 'Мои студенты' },
    { path: '/teacher/analytics', icon: <BarChart3 size={20} />, label: 'Аналитика' },
    { path: '/teacher/knowledge', icon: <Library size={20} />, label: 'База знаний' },
    { path: '/teacher/settings', icon: <UserCircle size={20} />, label: 'Профиль' },
  ];

  // Определение активного маршрута для стилизации.
  // Обрабатывает корневой маршрут (/teacher) отдельно от вложенных,
  // чтобы избежать ложного срабатывания подсветки.
  const isActive = (path: string) => {
    if (path === '/teacher') {
      return location.pathname === '/teacher';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden p-4 gap-4 relative z-10">
      {/* Sidebar (Боковая панель) */}
      <aside className="glass-panel w-full md:w-72 flex flex-col shrink-0 overflow-y-auto">
        {/* Профиль текущего пользователя (преподавателя) */}
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 font-bold text-xl">
              {(user?.fullName || user?.username || 'T')[0].toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <h2 className="text-xl font-bold text-gray-100 truncate">{user?.fullName || user?.username}</h2>
            <p className="text-sm text-indigo-400 truncate">Преподаватель</p>
          </div>
        </div>
        
        {/* Рендеринг навигационных ссылок */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (Окно рендеринга страниц преподавателя) */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto glass-panel">
        <Routes>
          <Route path="/" element={<CourseManager />} />
          <Route path="/students" element={<StudentManager />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/knowledge" element={<KnowledgeManager />} />
          <Route path="/settings" element={<TeacherProfile />} />
          {/* Маршруты для предпросмотра (Preview) контента от лица студента */}
          <Route path="/preview/course/:id" element={<CourseView />} />
          <Route path="/preview/quiz/:slug" element={<Quiz />} />
          {/* Полноэкранный редактор лекций (WYSIWYG) */}
          <Route path="/course/:id/edit" element={<FullPageEditor />} />
        </Routes>
      </main>
    </div>
  );
};

export default TeacherDashboard;

