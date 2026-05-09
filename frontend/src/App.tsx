import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrophyProvider } from './context/TrophyContext';
import Login from './pages/Login';

import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ThemeToggle from './components/ThemeToggle';

const NotFound = () => <div className="p-8 text-2xl text-red-500">404 - Not Found</div>;

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />; // Or to a 'Forbidden' page
  
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
      
      <Route path="/student/*" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/teacher/*" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <TrophyProvider>
        <Router>
          <div className="min-h-screen font-sans text-gray-100 transition-colors duration-200">
            <div className="bg-mesh"></div>
            <div className="bg-mesh-3"></div>
            <AppRoutes />
            {/* <ThemeToggle /> - Glassmorphism is dark-mode first, so we might hide the toggle or adapt it later */}
          </div>
        </Router>
      </TrophyProvider>
    </AuthProvider>
  );
}

export default App;
