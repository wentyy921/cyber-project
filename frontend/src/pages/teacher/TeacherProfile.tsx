import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Mail, Lock, Upload, UserCircle } from 'lucide-react';

const TeacherProfile = () => {
  const { user, login } = useAuth();
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setSaveStatus({ message: errorObj.response?.data?.detail || 'Ошибка загрузки аватара', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Профиль преподавателя</h1>
        <p className="text-gray-400 mt-1">Управление личными данными и безопасностью</p>
      </div>

      <div className="glass-panel p-8">
        
        {saveStatus.message && (
          <div className={`p-4 rounded-xl mb-6 ${saveStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'}`}>
            {saveStatus.message}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-900" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                  <UserCircle size={64} />
                </div>
              )}
              
              <button 
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
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
              <h3 className="text-lg font-bold text-white">Фото профиля</h3>
              <p className="text-sm text-gray-400 mt-1">PNG, JPG до 5MB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ФИО</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                disabled={!isEditing}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="pl-10 w-full p-3 glass-input rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 text-white"
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
                className="pl-10 w-full p-3 glass-input rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 text-white"
              />
            </div>
          </div>

          {isEditing && (
            <div className="animate-fade-in pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-1">Новый пароль (оставьте пустым, если не хотите менять)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="pl-10 w-full p-3 glass-input rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white"
                />
              </div>
            </div>
          )}

          <div className="pt-6 flex gap-4">
            {isEditing ? (
              <>
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  Отмена
                </button>
                <button type="submit" className="glass-button-primary px-6 py-2.5">
                  Сохранить изменения
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} className="glass-button-primary px-6 py-2.5">
                Редактировать профиль
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherProfile;
