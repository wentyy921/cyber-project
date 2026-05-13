import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, Activity, ShieldAlert } from 'lucide-react';
import UserManager from './admin/UserManager';
import Logs from './admin/Logs';
import CreateUser from './admin/CreateUser';
import { UserPlus } from 'lucide-react';

// Компонент Панели Администратора.
// Реализует паттерн "Master-Detail" с боковой навигацией (Sidebar) и областью контента (Main).
// Использует вложенный роутинг (Nested Routing) для навигации между подразделами без перезагрузки всей страницы.
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Функция выхода из системы.
  // Очищает глобальный стейт (AuthContext) и перенаправляет на экран авторизации.
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Конфигурация навигационного меню. 
  // Вынесена в отдельный массив для удобства рендеринга и возможного масштабирования (Data-Driven UI).
  const navItems = [
    { path: '/admin', icon: <Users size={20} />, label: 'Пользователи', exact: true },
    { path: '/admin/create', icon: <UserPlus size={20} />, label: 'Создать' },
    { path: '/admin/logs', icon: <Activity size={20} />, label: 'Системные логи' },
  ];

  // Утилита для подсветки активного пункта меню.
  // Анализирует текущий URL (location.pathname) и сравнивает его с путем элемента.
  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path || location.pathname === path + '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden p-4 gap-4 relative z-10">
      {/* Sidebar (Боковая панель навигации).
          В мобильной версии располагается сверху (flex-col), на десктопе сбоку (md:flex-row). */}
      <aside className="glass-panel w-full md:w-72 flex flex-col shrink-0 overflow-y-auto border-red-500/20 shadow-red-500/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert size={28} />
            Админ
          </h2>
          <p className="text-sm text-gray-400 mt-2 truncate">Sysadmin: {user?.username}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive(item.path, item.exact)
                  ? 'bg-red-500/20 border border-red-500/30 text-red-300 shadow-lg shadow-red-500/10' // Активное состояние
                  : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'     // Неактивное состояние
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

      {/* Main Content Area (Основная область контента).
          Здесь динамически рендерятся дочерние компоненты (Sub-routes) в зависимости от URL. */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto glass-panel border-red-500/10">
        <Routes>
          <Route path="/" element={<UserManager />} />
          <Route path="/create" element={<CreateUser />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;

