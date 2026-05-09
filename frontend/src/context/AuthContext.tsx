import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  fullName?: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedToken = localStorage.getItem('lms_token');
    const storedUser = localStorage.getItem('lms_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Fetch fresh data in background to sync progress and profile updates
        import('../services/api').then(({ default: api }) => {
          api.get('/users/me', { headers: { Authorization: `Bearer ${storedToken}` } })
            .then(res => {
              const freshUser = { ...JSON.parse(storedUser), avatar: res.data.avatar };
              if (res.data.full_name) freshUser.fullName = res.data.full_name;
              setUser(freshUser);
              localStorage.setItem('lms_user', JSON.stringify(freshUser));
            }).catch(e => console.error("Failed to sync fresh user data", e));
        });
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem('lms_token');
        localStorage.removeItem('lms_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('lms_token', newToken);
    localStorage.setItem('lms_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
