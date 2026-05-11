import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '../services/api';

export interface User {
  id: number;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  full_name?: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('lms_token');
        const storedUser = await SecureStore.getItemAsync('lms_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
          
          // Refresh user data from API
          api.get('/users/me').then(res => {
            setUser(res.data);
            SecureStore.setItemAsync('lms_user', JSON.stringify(res.data));
          }).catch(e => {
            console.log("Token might be expired", e);
          });
        }
      } catch (e) {
        console.error("Restoring token failed", e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    await SecureStore.setItemAsync('lms_token', newToken);
    await SecureStore.setItemAsync('lms_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await SecureStore.deleteItemAsync('lms_token');
    await SecureStore.deleteItemAsync('lms_user');
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
