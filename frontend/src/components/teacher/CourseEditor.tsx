import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { X, Users, HelpCircle, Plus, Trash2, Edit2, AlertCircle, ExternalLink, Settings, CheckCircle, Search, Save } from 'lucide-react';

interface CourseEditorProps {
  course: any;
  onClose: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ course, onClose }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'students' | 'settings'>(course.type === 'exam' ? 'questions' : 'students');
  
  // Questions state
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  
  // New Question form state
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('choice');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qCorrectText, setQCorrectText] = useState('');
  const [qExplanation, setQExplanation] = useState('');

  // Students state
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Student Search state
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [assignError, setAssignError] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Settings / Content state
  const [courseContent] = useState(course.content || '');
  const [timeLimit, setTimeLimit] = useState(course.time_limit || 10);
  const [maxErrors, setMaxErrors] = useState(course.max_errors === null || course.max_errors === undefined ? '' : course.max_errors);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };
  
  const [availableFrom, setAvailableFrom] = useState(formatDate(course.available_from));
  const [availableUntil, setAvailableUntil] = useState(formatDate(course.available_until));
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (activeTab === 'questions') fetchQuestions();
    if (activeTab === 'students') {
      fetchStudents();
      fetchAllStudents();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.get(`/teacher/course_questions?topic=${course.slug}`);
      setQuestions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get(`/teacher/course_students?courseId=${course.id}`);
      setStudents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await api.get('/teacher/search_students');
      setAllStudents(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        topic: course.slug,
        type: qType,
        question: qText,
        explanation: qExplanation
      };
      
      if (qType === 'choice') {
        payload.options = qOptions.filter(o => o.trim() !== '');
        payload.correctIndex = qCorrectIndex;
      } else {
        payload.correctText = qCorrectText;
      }

      if (editingQuestion) {
        payload.id = editingQuestion.id;
        await api.post('/teacher/edit_question', payload);
      } else {
        await api.post('/teacher/add_question', payload);
      }
      
      setShowQuestionForm(false);
      setEditingQuestion(null);
      resetQuestionForm();
      fetchQuestions();
    } catch (err) {
      alert("Ошибка при сохранении вопроса");
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Удалить вопрос?')) return;
    try {
      await api.post('/teacher/delete_question', { id });
      fetchQuestions();
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  const resetQuestionForm = () => {
    setQText('');
    setQType('choice');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setQCorrectText('');
    setQExplanation('');
  };

  const openEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setQText(q.question_text);
    setQType(q.type);
    if (q.type === 'choice') {
      const opts = [...(q.options || [])];
      while (opts.length < 4) opts.push('');
      setQOptions(opts);
      setQCorrectIndex(q.correct_index || 0);
    } else {
      setQCorrectText(q.correct_text || '');
    }
    setQExplanation(q.explanation || '');
    setShowQuestionForm(true);
  };

  const handleAssignStudent = async (studentLogin: string) => {
    setAssignError('');
    try {
      await api.post('/teacher/assign_student', { courseId: course.id, studentLogin });
      setSearchQuery('');
      setShowSearchDropdown(false);
      fetchStudents();
    } catch (err: any) {
      setAssignError(err.response?.data?.detail || "Ошибка при добавлении");
    }
  };

  const handleUnassignStudent = async (studentId: number) => {
    if (!window.confirm('Забрать доступ?')) return;
    try {
      await api.post('/teacher/unassign_student', { courseId: course.id, studentId });
      fetchStudents();
    } catch (err) {
      alert("Ошибка при отзыве доступа");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.post('/teacher/update_course', {
        courseId: course.id,
        content: courseContent,
        time_limit: timeLimit,
        max_errors: maxErrors === '' ? null : Number(maxErrors),
        available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
        available_until: availableUntil ? new Date(availableUntil).toISOString() : null
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      
      // Update local course object reference if needed
      course.content = courseContent;
      course.time_limit = timeLimit;
      course.max_errors = maxErrors === '' ? null : Number(maxErrors);
      course.available_from = availableFrom ? new Date(availableFrom).toISOString() : null;
      course.available_until = availableUntil ? new Date(availableUntil).toISOString() : null;
    } catch (e) {
      alert("Ошибка при сохранении");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return allStudents;
    const q = searchQuery.toLowerCase();
    return allStudents.filter(s => 
      s.username.toLowerCase().includes(q) || 
      (s.full_name && s.full_name.toLowerCase().includes(q)) || 
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [searchQuery, allStudents]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-panel w-full max-w-5xl flex flex-col overflow-hidden animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] z-10">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Управление: {course.title}</h2>
              <a 
                href={course.type === 'exam' ? `/teacher/preview/quiz/${course.slug}` : `/teacher/preview/course/${course.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium transition-colors"
                title="Предпросмотр курса"
              >
                <ExternalLink size={16} />
                <span className="hidden sm:inline">Предпросмотр</span>
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{course.type === 'exam' ? 'Экзамен' : 'Лекция'} • {course.slug}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-transparent px-8">
          {course.type === 'exam' && (
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-4 font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'questions' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <HelpCircle size={18} /> Вопросы {questions.length > 0 && <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">{questions.length}</span>}
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-4 font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'settings' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={18} /> Настройки
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-4 px-4 font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'students' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users size={18} /> Доступы {students.length > 0 && <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">{students.length}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-transparent min-h-[400px]">


          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">Настройки {course.type === 'exam' ? 'экзамена' : 'лекции'}</h3>
                <p className="text-sm text-gray-400 mt-1">Ограничения и правила доступа.</p>
              </div>

              <div className="glass-card p-6 space-y-6">
                {course.type === 'exam' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Время на прохождение (в минутах)
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        value={timeLimit} 
                        onChange={e => setTimeLimit(Number(e.target.value))} 
                        className="w-full max-w-xs p-3 glass-input rounded-xl" 
                      />
                      <p className="text-xs text-gray-400 mt-2">Сколько минут дается студенту на решение всех вопросов.</p>
                    </div>
                    
                    <hr className="border-white/10" />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Максимально допустимое количество ошибок
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Без ограничений"
                    value={maxErrors} 
                    onChange={e => setMaxErrors(e.target.value)} 
                    className="w-full max-w-xs p-3 glass-input rounded-xl" 
                  />
                  <p className="text-xs text-gray-400 mt-2">Оставьте пустым, если экзамен можно сдать с любым количеством ошибок.</p>
                </div>
                
                <hr className="border-white/10" />
                </>
              )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Открывается с (опционально)</label>
                    <input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Закрывается до (опционально)</label>
                    <input type="datetime-local" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} className="w-full p-3 glass-input rounded-xl" />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="glass-button-primary flex items-center gap-2 px-6 py-3 disabled:opacity-70"
              >
                {savingSettings ? 'Сохранение...' : settingsSaved ? <><CheckCircle size={18} /> Сохранено</> : <><Save size={18} /> Сохранить настройки</>}
              </button>
            </div>
          )}

          {/* QUESTIONS TAB */}
          {activeTab === 'questions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Список вопросов</h3>
                <button 
                  onClick={() => { resetQuestionForm(); setShowQuestionForm(true); setEditingQuestion(null); }}
                  className="glass-button-primary flex items-center gap-2 px-4 py-2"
                >
                  <Plus size={18} /> Добавить вопрос
                </button>
              </div>

              {showQuestionForm && (
                <form onSubmit={handleSaveQuestion} className="glass-panel p-6 space-y-4 animate-fade-in">
                  <h4 className="font-bold text-white mb-2">{editingQuestion ? 'Редактировать вопрос' : 'Новый вопрос'}</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Текст вопроса</label>
                    <textarea required value={qText} onChange={e => setQText(e.target.value)} rows={3} className="w-full p-3 glass-input rounded-xl" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Тип ответа</label>
                    <select value={qType} onChange={e => setQType(e.target.value)} className="w-full p-3 glass-input rounded-xl">
                      <option value="choice" className="bg-gray-800 text-white">Выбор вариантов</option>
                      <option value="text" className="bg-gray-800 text-white">Ввод текста с клавиатуры (регистронезависимо)</option>
                    </select>
                  </div>

                  {qType === 'choice' ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Варианты ответов (отметьте правильный радиокнопкой)</label>
                      {qOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input type="radio" name="correct" checked={qCorrectIndex === i} onChange={() => setQCorrectIndex(i)} className="w-5 h-5 text-indigo-600" />
                          <input type="text" value={opt} onChange={e => { const n = [...qOptions]; n[i] = e.target.value; setQOptions(n); }} placeholder={`Вариант ${i + 1}`} className="flex-1 p-3 glass-input rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Правильный ответ (текст)</label>
                      <input required type="text" value={qCorrectText} onChange={e => setQCorrectText(e.target.value)} className="w-full p-3 glass-input rounded-xl" placeholder="Например: Четыре" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Объяснение (показывается после ответа)</label>
                    <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} rows={2} className="w-full p-3 glass-input rounded-xl" />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button type="button" onClick={() => setShowQuestionForm(false)} className="px-5 py-2.5 rounded-xl hover:bg-white/10 text-gray-300 transition-colors">Отмена</button>
                    <button type="submit" className="px-5 py-2.5 glass-button-primary">Сохранить вопрос</button>
                  </div>
                </form>
              )}

              {loadingQuestions ? (
                <div className="text-center py-8 text-gray-400">Загрузка...</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 glass-panel flex flex-col items-center gap-3">
                  <HelpCircle size={40} className="text-gray-500" />
                  <p>В этом экзамене еще нет вопросов</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={q.id} className="glass-card p-5 flex justify-between items-start group hover:border-indigo-500/30 transition-colors">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/10 text-gray-300 text-xs font-bold px-2 py-1 rounded-md">Q{i + 1}</span>
                          <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-2 py-1 rounded-md">{q.type === 'choice' ? 'Выбор' : 'Текст'}</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">{q.question_text}</h4>
                        
                        {/* Display correct answer */}
                        <div className="mt-3 bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-start gap-2">
                          <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                          <div className="text-sm text-green-400">
                            <span className="font-semibold mr-1">Правильный ответ:</span>
                            {q.type === 'choice' && q.options ? q.options[q.correct_index] : q.correct_text}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditQuestion(q)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Доступы студентов</h3>
              </div>

              <div className="glass-panel p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Выдать доступ студенту</label>
                
                <div className="relative" ref={searchRef}>
                  <div className="flex items-center glass-input rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                    <div className="pl-3 text-gray-400">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                      onFocus={() => setShowSearchDropdown(true)}
                      placeholder="Поиск по ФИО, логину или email..." 
                      className="w-full p-3 bg-transparent border-none outline-none text-white"
                    />
                  </div>

                  {/* Dropdown Results */}
                  {showSearchDropdown && (
                    <div className="absolute z-10 w-full mt-2 glass-panel shadow-2xl max-h-60 overflow-y-auto animate-fade-in">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Нет результатов</div>
                      ) : (
                        filteredStudents.map(s => {
                          const isAlreadyAssigned = students.some(assigned => assigned.username === s.username);
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleAssignStudent(s.username)}
                              disabled={isAlreadyAssigned}
                              className={`w-full text-left p-3 flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors ${
                                isAlreadyAssigned 
                                  ? 'opacity-50 cursor-not-allowed bg-black/20' 
                                  : 'hover:bg-indigo-500/20'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm uppercase shrink-0">
                                {s.username.substring(0, 2)}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="font-medium text-white truncate">
                                  {s.full_name || s.username}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  @{s.username} {s.email ? `• ${s.email}` : ''}
                                </div>
                              </div>
                              {isAlreadyAssigned && (
                                <span className="text-xs font-medium bg-green-500/20 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                                  <CheckCircle size={12} /> Выдан
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {assignError && (
                <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {assignError}
                </div>
              )}

              {loadingStudents ? (
                <div className="text-center py-8 text-gray-400">Загрузка...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-gray-400 glass-panel flex flex-col items-center gap-3">
                  <Users size={40} className="text-gray-500" />
                  <p>Ни одному студенту не выдан доступ</p>
                </div>
              ) : (
                <div className="glass-panel overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="p-4 font-semibold text-gray-300">Студент</th>
                        <th className="p-4 font-semibold text-gray-300">Дата выдачи</th>
                        <th className="p-4 text-right font-semibold text-gray-300">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-white">{s.full_name}</div>
                            <div className="text-sm text-gray-400">@{s.username}</div>
                          </td>
                          <td className="p-4 text-sm text-gray-300">{new Date(s.granted_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleUnassignStudent(s.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-colors font-medium text-sm">
                              Забрать доступ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};

export default CourseEditor;
