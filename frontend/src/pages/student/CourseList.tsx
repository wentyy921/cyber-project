import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { BookOpen, AlertCircle, RefreshCw, Zap, Lock, Clock } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  author_id: number;
  is_free: boolean;
  image_url: string;
  created_at: string;
  type?: string;
  slug?: string;
  available_from?: string;
  available_until?: string;
}

const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<any>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const [resCourses, resResults] = await Promise.all([
        api.get('/courses'),
        api.get('/results').catch(() => ({ data: [] }))
      ]);
      const coursesData = resCourses.data;
      setCourses(coursesData);
      
      // Smart Dashboard Logic
      const myResults = resResults.data;
      myResults.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (myResults.length > 0) {
        const lastResult = myResults[0];
        if (!lastResult.passed) {
          setRecommendation({
            type: 'retry',
            title: '⚠️ Работа над ошибками',
            message: `Вы не сдали последний экзамен: ${lastResult.topic}.`,
            actionText: 'Пересдать',
            slug: lastResult.topic
          });
        } else {
          const passedSlugs = myResults.filter((r: any) => r.passed).map((r: any) => r.topic);
          const nextCourse = coursesData.find((c: any) => 
            c.type === 'exam' && 
            !passedSlugs.includes(c.slug) && 
            !isLocked(c.available_from, c.available_until)
          );
          if (nextCourse) {
            setRecommendation({
              type: 'next',
              title: '🚀 Так держать!',
              message: `Вы сдали ${lastResult.topic}. Следующая цель: ${nextCourse.title}.`,
              actionText: 'Начать',
              courseId: nextCourse.id
            });
          } else {
            setRecommendation({
              type: 'done',
              title: '👑 Абсолютная победа!',
              message: 'Вы прошли все доступные экзамены. Вы - настоящий профи!'
            });
          }
        }
      } else {
        setRecommendation({
          type: 'new',
          title: '👋 С чего начнем?',
          message: 'Рекомендуем начать с изучения лекций.'
        });
      }
      
    } catch (err) {
      setError('Не удалось загрузить список курсов');
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

  const getStatusMessage = (from?: string, until?: string) => {
    const now = new Date().getTime();
    if (from && new Date(from).getTime() > now) return `Откроется: ${new Date(from).toLocaleString()}`;
    if (until && new Date(until).getTime() < now) return `Закрыто: ${new Date(until).toLocaleString()}`;
    return null;
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-3">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-semibold text-lg">Ошибка</h3>
          <p>{error}</p>
          <button onClick={fetchCourses} className="mt-2 text-sm text-red-700 underline">Попробовать снова</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {recommendation && (
        <div className={`mb-8 p-6 glass-card border-l-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 ${
          recommendation.type === 'retry' ? 'border-red-500' :
          recommendation.type === 'next' ? 'border-green-500' :
          recommendation.type === 'done' ? 'border-yellow-500' :
          'border-indigo-500'
        }`}>
          <div>
            <h3 className={`text-xl font-bold flex items-center gap-2 ${
              recommendation.type === 'retry' ? 'text-red-400' :
              recommendation.type === 'next' ? 'text-green-400' :
              recommendation.type === 'done' ? 'text-yellow-400' :
              'text-indigo-400'
            }`}>
              {recommendation.title}
            </h3>
            <p className="text-gray-300 mt-1">{recommendation.message}</p>
          </div>
          {recommendation.actionText && (
            <Link
              to={recommendation.slug ? `/student/quiz/${recommendation.slug}` : (recommendation.courseId ? `/student/course/${recommendation.courseId}` : '#')}
              className={`px-6 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all shrink-0 ${
                recommendation.type === 'retry' ? 'bg-red-500/80 hover:bg-red-500 border border-red-400/50' :
                'bg-green-500/80 hover:bg-green-500 border border-green-400/50'
              }`}
            >
              {recommendation.actionText}
            </Link>
          )}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Доступные курсы</h1>
        <p className="text-gray-400 mt-2">Выберите курс, чтобы начать обучение или пройти тестирование.</p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center p-12 glass-card">
          <BookOpen className="mx-auto text-gray-500 mb-4" size={48} />
          <h3 className="text-xl font-medium text-gray-300">Нет доступных курсов</h3>
          <p className="text-gray-400 mt-1">Пока что вам не назначено ни одного курса.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {courses.filter(c => c.type === 'lesson').length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-indigo-300 mb-6 flex items-center gap-2">
                <BookOpen className="text-indigo-400" />
                Учебные материалы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c => c.type === 'lesson').map((course) => (
                  <div key={course.id} className="glass-card overflow-hidden flex flex-col group">
                    <div className="h-48 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                      <div className="absolute bottom-4 left-4 z-20">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {course.category}
                        </span>
                      </div>
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                        {course.description || "Описание отсутствует"}
                      </p>
                      
                      
                      {isLocked(course.available_from, course.available_until) ? (
                        <div className="mt-auto flex items-center justify-center gap-2 bg-black/40 border border-white/5 text-gray-400 py-3 px-4 rounded-xl cursor-not-allowed">
                          <Lock size={18} />
                          <span className="text-sm font-medium">{getStatusMessage(course.available_from, course.available_until)}</span>
                        </div>
                      ) : (
                        <Link
                          to={`/student/course/${course.id}`}
                          className="mt-auto block w-full text-center glass-button-primary py-3 px-4"
                        >
                          Изучить материал
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {courses.filter(c => c.type === 'exam').length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <Zap className="text-red-500" />
                Экзамены и Практика
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c => c.type === 'exam').map((course) => (
                  <div key={course.id} className="glass-card overflow-hidden flex flex-col group">
                    <div className="h-48 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                      <div className="absolute bottom-4 left-4 z-20">
                        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {course.category}
                        </span>
                      </div>
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                        {course.description || "Описание отсутствует"}
                      </p>
                      
                      {isLocked(course.available_from, course.available_until) ? (
                        <div className="mt-auto flex items-center justify-center gap-2 bg-black/40 border border-white/5 text-gray-400 py-3 px-4 rounded-xl cursor-not-allowed">
                          <Lock size={18} />
                          <span className="text-sm font-medium">{getStatusMessage(course.available_from, course.available_until)}</span>
                        </div>
                      ) : (
                        <Link
                          to={`/student/quiz/${course.slug}`}
                          className="mt-auto block w-full text-center glass-button-primary !from-red-500 !to-orange-500 hover:!from-red-400 hover:!to-orange-400 shadow-red-500/25 py-3 px-4"
                        >
                          Начать экзамен
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseList;
