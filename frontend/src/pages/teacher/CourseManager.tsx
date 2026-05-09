import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, Plus, Trash2, Video, FileText, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  type: string;
  time_limit?: number;
  available_from?: string;
  available_until?: string;
}

import CourseEditor from '../../components/teacher/CourseEditor';

const CourseManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('lesson');
  const [timeLimit, setTimeLimit] = useState(10);
  const [maxErrors, setMaxErrors] = useState(0);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await api.get('/teacher/my_courses');
      setCourses(res.data);
    } catch (e) {
      console.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Удалить этот курс навсегда?")) return;
    try {
      await api.post('/teacher/delete_course', { id });
      fetchCourses();
    } catch (e) {
      alert("Ошибка при удалении");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teacher/create_course', {
        title, 
        description, 
        content: '', 
        type,
        time_limit: type === 'exam' ? timeLimit : null,
        max_errors: type === 'exam' ? maxErrors : null,
        available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
        available_until: availableUntil ? new Date(availableUntil).toISOString() : null
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setTimeLimit(10);
      setMaxErrors(0);
      setAvailableFrom('');
      setAvailableUntil('');
      fetchCourses();
    } catch (e) {
      alert("Ошибка при создании курса");
    }
  };

  return (
    <div className="animate-fade-in">
      {selectedCourse && (
        <CourseEditor course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Управление курсами</h1>
          <p className="text-gray-400 mt-1">Создавайте и редактируйте свои учебные материалы</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="glass-button-primary flex items-center gap-2 px-5 py-2.5 shadow-indigo-500/20"
        >
          <Plus size={20} />
          {showForm ? 'Отмена' : 'Новый курс'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-8 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold mb-6 text-white">Создание нового материала</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Название</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Тип</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 glass-input rounded-xl">
                  <option value="lesson" className="bg-gray-800 text-white">Лекция (Материал)</option>
                  <option value="exam" className="bg-gray-800 text-white">Тест (Экзамен)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Примечание (опционально)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-black/20 rounded-xl border border-white/5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Открывается с (опционально)</label>
                <input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Закрывается до (опционально)</label>
                <input type="datetime-local" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
              </div>
            </div>
            {type === 'exam' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <div>
                  <label className="block text-sm font-medium text-indigo-300 mb-1">Лимит времени (минуты)</label>
                  <input type="number" min="1" max="180" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full p-3 glass-input rounded-xl" />
                  <p className="text-xs text-indigo-400/70 mt-1">Оставьте 0 для теста без ограничения времени</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-300 mb-1">Допустимо ошибок (макс)</label>
                  <input type="number" min="0" max="50" value={maxErrors} onChange={e => setMaxErrors(Number(e.target.value))} className="w-full p-3 glass-input rounded-xl" />
                  <p className="text-xs text-indigo-400/70 mt-1">Сколько раз студент может ошибиться</p>
                </div>
              </div>
            )}
            <button type="submit" className="glass-button-primary !from-green-500 !to-emerald-500 shadow-green-500/25 py-3 px-8">
              Сохранить
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center p-10 text-gray-400">Загрузка...</div>
      ) : courses.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">У вас пока нет созданных курсов.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="glass-card flex flex-col hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all p-0">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${course.type === 'exam' ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {course.type === 'exam' ? <FileText size={24} /> : <Video size={24} />}
                  </div>
                  <div className="flex gap-2">
                    {course.type === 'lesson' && (
                      <Link to={`/teacher/course/${course.id}/edit`} className="text-gray-400 hover:text-green-400 transition-colors p-2 rounded-lg hover:bg-green-500/20" title="Редактировать лекцию">
                        <Edit size={20} />
                      </Link>
                    )}
                    <button onClick={() => setSelectedCourse(course)} className="text-gray-400 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-indigo-500/20" title="Настройки">
                      Управление
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/20">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-3">{course.description}</p>
              </div>
              <div className="bg-black/20 px-6 py-4 border-t border-white/5 flex justify-between items-center text-sm text-gray-400">
                <span>{course.type === 'exam' ? 'Тест' : 'Лекция'}</span>
                <span className="font-mono bg-white/10 px-2 py-1 rounded-md">{course.slug}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManager;
