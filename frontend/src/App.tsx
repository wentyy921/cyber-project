import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrophyProvider } from './context/TrophyContext';
import Login from './pages/Login';

import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ThemeToggle from './components/ThemeToggle';

// Компонент-заглушка для обработки неизвестных маршрутов (ошибка 404).
const NotFound = () => <div className="p-8 text-2xl text-red-500">404 - Not Found</div>;

// Компонент защиты маршрутов (Route Guard).
// Архитектурно отвечает за проверку JWT-авторизации перед рендерингом защищенного компонента.
// Реализует Role-Based Access Control (RBAC), сверяя роль пользователя со списком разрешенных ролей.
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isLoading } = useAuth();
  
  // Блокировка рендеринга до завершения асинхронной валидации токена
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  
  // Перенаправление неавторизованных пользователей на страницу логина
  if (!user) return <Navigate to="/" replace />;
  
  // Защита от несанкционированного доступа к панелям управления (например, студент не может зайти в /admin)
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />; 
  
  return children;
};

// Главный компонент маршрутизации (React Router).
// Разделяет логику SPA на изолированные пространства имен в зависимости от роли.
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Точка входа. Если пользователь авторизован, он автоматически перенаправляется в свою панель */}
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
      
      {/* Студенческая зона. Доступна студентам, преподавателям и админам (для просмотра от лица студента) */}
      <Route path="/student/*" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      
      {/* Преподавательская зона. Доступна только роли teacher */}
      <Route path="/teacher/*" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      {/* Зона администратора. Жестко привязана к роли admin */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Fallback маршрут */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Корневой компонент React-приложения.
// Архитектурно выстраивает дерево контекстов (Context Providers) вокруг Router'а,
// обеспечивая всем дочерним компонентам доступ к состоянию авторизации и глобальным данным.
function App() {
  return (
    <AuthProvider>
      <TrophyProvider>
        <Router>
          {/* Глобальный контейнер с фоновыми эффектами Glassmorphism */}
          <div className="min-h-screen font-sans text-gray-100 transition-colors duration-200">
            <div className="bg-mesh"></div>
            <div className="bg-mesh-3"></div>
            <AppRoutes />
          </div>
        </Router>
      </TrophyProvider>
    </AuthProvider>
  );
}

export default App;

