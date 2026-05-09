import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, Maximize, Minimize } from 'lucide-react';
import api from '../../services/api';
import BlockEditor from '../../components/teacher/BlockEditor';

interface Course {
  id: number;
  title: string;
  type: string;
  content: string;
}

const FullPageEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get('/teacher/my_courses');
        const found = response.data.find((c: Course) => c.id === Number(id));
        if (found) {
          setCourse(found);
          setContent(found.content || '');
        } else {
          alert('Курс не найден');
          navigate('/teacher');
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка при загрузке курса');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await api.post('/teacher/update_course', {
        courseId: course.id,
        content: content
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    navigate('/teacher');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-transparent text-gray-400">Загрузка редактора...</div>;
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      {/* Top Navbar */}
      <div className="sticky top-0 z-10 glass-panel !rounded-none !border-x-0 !border-t-0 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/teacher')}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-bold text-white text-lg">Редактирование: {course.title}</h1>
            <p className="text-xs text-gray-400">Все изменения сохраняются по нажатию кнопки</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setFullWidth(!fullWidth)}
            className="flex items-center justify-center p-2.5 rounded-xl transition-colors glass-button text-gray-300"
            title={fullWidth ? "Сжать по центру" : "На всю ширину"}
          >
            {fullWidth ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors font-medium glass-button text-gray-300"
          >
            {saving ? 'Сохранение...' : saved ? <><CheckCircle size={18} className="text-green-500" /> Сохранено</> : <><Save size={18} /> Сохранить</>}
          </button>
          
          <button 
            onClick={handleSaveAndExit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition-colors font-semibold glass-button-primary disabled:opacity-70"
          >
            Сохранить и выйти
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-y-auto w-full flex justify-center py-8">
        <div className={`w-full px-4 transition-all duration-300 ${fullWidth ? 'max-w-full editor-full-width' : 'max-w-4xl'}`}>
          <div className="glass-panel overflow-hidden">
            <BlockEditor 
              initialData={content} 
              onChange={(data) => setContent(JSON.stringify(data))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullPageEditor;
