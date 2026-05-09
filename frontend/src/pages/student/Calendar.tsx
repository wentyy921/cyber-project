import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar as CalendarIcon, Clock, Lock, Unlock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: number;
  slug: string;
  title: string;
  type: string;
  available_from?: string;
  available_until?: string;
}

const Calendar = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.filter((c: Course) => c.available_from || c.available_until));
    } catch (e) {
      console.error("Failed to fetch courses for calendar");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = (from?: string, until?: string) => {
    const now = new Date().getTime();
    if (from && new Date(from).getTime() > now) return true;
    if (until && new Date(until).getTime() < now) return true;
    return false;
  };

  const getStatus = (from?: string, until?: string) => {
    const now = new Date().getTime();
    if (from && new Date(from).getTime() > now) return 'Ожидает открытия';
    if (until && new Date(until).getTime() < now) return 'Завершено';
    return 'Доступно сейчас';
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-8 text-white mb-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarIcon size={32} /> 
            Календарь Дедлайнов
          </h1>
          <p className="mt-2 text-teal-100 max-w-xl">
            Следите за расписанием открытия и закрытия учебных материалов, чтобы не пропустить важное.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-400">Загрузка расписания...</div>
        ) : courses.length === 0 ? (
          <div className="text-center p-12 glass-card text-gray-400">
            Нет материалов с установленными дедлайнами.
          </div>
        ) : (
          courses.map(course => {
            const locked = isLocked(course.available_from, course.available_until);
            const status = getStatus(course.available_from, course.available_until);
            
            return (
              <div key={course.id} className={`p-6 glass-card flex flex-col md:flex-row gap-6 items-start md:items-center ${
                locked ? 'opacity-60 border-white/5' : 'hover:border-teal-500/30'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  locked ? 'bg-black/30 text-gray-500' : 'bg-teal-500/20 text-teal-400'
                }`}>
                  {locked ? <Lock size={24} /> : <Unlock size={24} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${course.type === 'exam' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {course.type === 'exam' ? 'Экзамен' : 'Лекция'}
                    </span>
                    <span className={`text-xs font-semibold ${status === 'Доступно сейчас' ? 'text-green-400' : 'text-gray-400'}`}>
                      {status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    {course.available_from && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} />
                        Открытие: {new Date(course.available_from).toLocaleString()}
                      </div>
                    )}
                    {course.available_until && (
                      <div className="flex items-center gap-1.5 text-red-400">
                        <Clock size={16} />
                        Дедлайн: {new Date(course.available_until).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {!locked && (
                  <Link 
                    to={course.type === 'exam' ? `/student/quiz/${course.slug}` : `/student/course/${course.id}`}
                    className="px-6 py-2.5 glass-button-primary !from-teal-500 !to-emerald-500 shadow-teal-500/25 whitespace-nowrap"
                  >
                    Перейти
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Calendar;
