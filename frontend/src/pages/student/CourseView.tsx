import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTrophies } from '../../context/TrophyContext';
import { ArrowLeft, Clock, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';
import BlockRenderer from '../../components/BlockRenderer';

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  content: string;
  type: string;
  time_limit: number;
  available_from?: string;
  available_until?: string;
}

const CourseView = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { unlockTrophy } = useTrophies();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMarked, setViewMarked] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get('/courses');
        const found = response.data.find((c: Course) => c.id === Number(id));
        setCourse(found || null);
        
        if (found && found.type === 'lesson') {
          // Mark as viewed
          try {
            await api.post('/mark-lecture-viewed', { course_id: found.id });
            setViewMarked(true);
            unlockTrophy('first_step');
          } catch (e) {
            console.error('Failed to mark as viewed', e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Загрузка курса...</div>;
  if (!course) return <div className="p-8 text-center text-red-500">Курс не найден</div>;

  const isLocked = () => {
    if (isTeacher) return false;
    const now = new Date().getTime();
    if (course.available_from && new Date(course.available_from).getTime() > now) return true;
    if (course.available_until && new Date(course.available_until).getTime() < now) return true;
    return false;
  };

  if (isLocked()) {
    return (
      <div className="max-w-4xl mx-auto mt-12 p-8 text-center glass-panel border border-red-500/30">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Доступ закрыт</h2>
        <p className="text-gray-300 mb-6">В данный момент этот материал недоступен для просмотра.</p>
        <Link to="/student" className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Вернуться к курсам
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link to={isTeacher ? "/teacher" : "/student"} className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        Вернуться к списку курсов
      </Link>

      <div className="glass-panel overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 md:p-12 text-white">
          <div className="inline-block bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide uppercase mb-4">
            {course.type === 'exam' ? 'Экзамен' : 'Лекция'}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{course.title}</h1>
          <p className="text-indigo-100 text-lg max-w-2xl">{course.description}</p>
          
          <div className="flex items-center gap-6 mt-8">
            {course.time_limit && course.type === 'exam' && (
              <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl">
                <Clock size={20} />
                <span>Время: {course.time_limit} мин</span>
              </div>
            )}
            {viewMarked && (
              <div className="flex items-center gap-2 bg-green-500/20 text-green-100 px-4 py-2 rounded-xl">
                <CheckCircle size={20} />
                <span>Отмечено как прочитанное</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          {course.type === 'lesson' ? (
            <BlockRenderer data={course.content} />
          ) : (
            <div className="text-center py-12">
              <div className="bg-indigo-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <PlayCircle size={48} className="text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Готовы начать тест?</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Убедитесь, что вас ничто не отвлекает. Время на выполнение теста ограничено ({course.time_limit} мин).</p>
              
              <button 
                onClick={() => setShowExamModal(true)}
                className="inline-flex items-center justify-center glass-button-primary font-bold py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-transform transform hover:-translate-y-1 text-lg"
              >
                Начать тестирование
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exam Confirmation Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-md w-full p-8 shadow-2xl">
            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">Начать тестирование?</h2>
            <p className="text-gray-300 text-center mb-6 text-sm">
              Вы собираетесь начать экзамен «{course.title}». На выполнение дается <span className="font-bold text-white">{course.time_limit} минут</span>. Таймер запустится сразу после нажатия кнопки.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowExamModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 hover:bg-white/10 transition-colors"
              >
                Отмена
              </button>
              <Link 
                to={isTeacher ? `/teacher/preview/quiz/${course.slug}` : `/student/quiz/${course.slug}`}
                className="flex-1 text-center py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Приступить
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseView;
