import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, UserPlus, BookOpen } from 'lucide-react';

interface Course {
  id: number;
  title: string;
}

interface Student {
  id: number;
  username: string;
  full_name: string;
  granted_at: string;
}

const StudentManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentLogin, setStudentLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/teacher/my_courses').then(res => {
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedCourse(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      setLoading(true);
      api.get(`/teacher/course_students?courseId=${selectedCourse}`)
        .then(res => setStudents(res.data))
        .catch(() => setMsg({ text: 'Ошибка загрузки студентов', type: 'error' }))
        .finally(() => setLoading(false));
    }
  }, [selectedCourse]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !studentLogin) return;
    
    try {
      const res = await api.post('/teacher/assign_student', {
        studentLogin,
        courseId: selectedCourse
      });
      setMsg({ text: res.data.message || 'Студент назначен', type: 'success' });
      setStudentLogin('');
      // Reload students
      const studRes = await api.get(`/teacher/course_students?courseId=${selectedCourse}`);
      setStudents(studRes.data);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || 'Ошибка при назначении', type: 'error' });
    }
    
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

    const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (studentLogin.length >= 2) {
      const delayFn = setTimeout(() => {
        api.get(`/teacher/search_students?q=${studentLogin}`).then(res => {
          setSearchResults(res.data);
          setShowDropdown(true);
        });
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [studentLogin]);

  const selectStudent = (username: string) => {
    setStudentLogin(username);
    setShowDropdown(false);
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Управление студентами</h1>
        <p className="text-gray-400 mt-1">Назначайте студентов на ваши курсы и экзамены</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assignment Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <UserPlus size={20} className="text-indigo-400" />
              Добавить студента
            </h2>
            
            {msg.text && (
              <div className={`p-3 rounded-xl text-sm mb-4 ${msg.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Выберите курс</label>
                <select 
                  className="w-full p-3 glass-input rounded-xl"
                  value={selectedCourse || ''}
                  onChange={(e) => setSelectedCourse(Number(e.target.value))}
                >
                  {courses.length === 0 && <option value="" className="bg-gray-800 text-white">Нет курсов</option>}
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">Поиск студента</label>
                <input 
                  type="text" 
                  required
                  placeholder="ivan_student"
                  className="w-full p-3 glass-input rounded-xl"
                  value={studentLogin}
                  onChange={(e) => setStudentLogin(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 glass-panel shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-fade-in">
                    {searchResults.map((s, i) => (
                      <li 
                        key={i} 
                        onClick={() => selectStudent(s.username)}
                        className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <div className="font-medium text-white">{s.full_name || 'Без имени'}</div>
                        <div className="text-xs text-gray-400">@{s.username} • {s.email}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button 
                type="submit" 
                disabled={!selectedCourse}
                className="glass-button-primary w-full py-3 disabled:opacity-50"
              >
                Предоставить доступ
              </button>
            </form>
          </div>
        </div>

        {/* Students List */}
        <div className="lg:col-span-2">
          <div className="glass-panel overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                Студенты на курсе
              </h2>
            </div>
            
            <div className="p-6 flex-1">
              {loading ? (
                <div className="text-center py-10 text-gray-400">Загрузка...</div>
              ) : !selectedCourse ? (
                <div className="text-center py-10 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  Выберите курс слева
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users size={48} className="mx-auto mb-3 opacity-50" />
                  На этот курс еще никто не назначен
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 text-sm border-b border-white/10">
                        <th className="pb-3 font-medium pl-2">Пользователь</th>
                        <th className="pb-3 font-medium">ФИО</th>
                        <th className="pb-3 font-medium text-right pr-2">Дата назначения</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 pl-2 font-medium text-gray-200">@{s.username}</td>
                          <td className="py-4 text-gray-400">{s.full_name || '-'}</td>
                          <td className="py-4 text-right pr-2 text-sm text-gray-400">
                            {new Date(s.granted_at).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentManager;
