import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { BarChart3, Eye, FileText, CheckCircle, XCircle, Download, AlertTriangle, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Course {
  id: number;
  title: string;
  type: string;
  slug: string;
}

interface ViewStat {
  username: string;
  full_name: string;
  viewed_at: string;
}

interface Result {
  id: number;
  student_name: string;
  topic: string;
  score: number;
  passed: number;
  date: string;
  violations: number;
  details?: Record<string, unknown>[]; // JSON with detailed questions
}

const Analytics = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  
  const [viewStats, setViewStats] = useState<ViewStat[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    api.get('/teacher/my_courses').then(res => {
      const examCourses = res.data.filter((c: Course) => c.type === 'exam');
      setCourses(examCourses);
      if (examCourses.length > 0) {
        setSelectedCourse(examCourses[0].id);
      }
    });

    api.get('/teacher/results').then(res => {
      setResults(res.data);
    });
  }, []);

  const selectedCourseDetails = courses.find(c => c.id === selectedCourse);

  // Filter results for the currently selected course
  const courseResults = useMemo(() => {
    if (!selectedCourseDetails) return [];
    return results.filter(r => r.topic === selectedCourseDetails.slug);
  }, [results, selectedCourseDetails]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    const bins = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
    courseResults.forEach(r => {
      if (r.score <= 20) bins['0-20%']++;
      else if (r.score <= 40) bins['21-40%']++;
      else if (r.score <= 60) bins['41-60%']++;
      else if (r.score <= 80) bins['61-80%']++;
      else bins['81-100%']++;
    });
    return Object.keys(bins).map(key => ({
      name: key,
      count: bins[key as keyof typeof bins]
    }));
  }, [courseResults]);

  // Problematic questions calculation
  const problematicQuestions = useMemo(() => {
    const errorCounts: Record<string, number> = {};
    courseResults.forEach(r => {
      if (r.details && Array.isArray(r.details)) {
        r.details.forEach((q: Record<string, unknown>) => {
          if (!q.isCorrect) {
            const text = String(q.questionText || 'Неизвестный вопрос');
            errorCounts[text] = (errorCounts[text] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(errorCounts)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [courseResults]);

  // Export functionality
  const exportData = (format: 'xlsx' | 'csv') => {
    if (courseResults.length === 0) return alert('Нет данных для экспорта');
    
    const dataToExport = courseResults.map(r => ({
      'Студент': r.student_name,
      'Балл (%)': r.score,
      'Статус': r.passed ? 'Сдано' : 'Провалено',
      'Нарушения': r.violations,
      'Дата': new Date(r.date).toLocaleString('ru-RU')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Результаты");
    XLSX.writeFile(wb, `${selectedCourseDetails?.title}_Отчет.${format}`);
    setShowExportMenu(false);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Аналитика</h1>
          <p className="text-gray-400 mt-1">Статистика просмотров лекций и результаты тестов</p>
        </div>
        
        {selectedCourseDetails?.type === 'exam' && courseResults.length > 0 && (
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 glass-button-primary"
            >
              <Download size={18} /> Скачать отчет
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-panel shadow-2xl overflow-hidden z-20">
                <button onClick={() => exportData('xlsx')} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/10 text-gray-200 transition-colors border-b border-white/10">
                  <FileSpreadsheet size={18} className="text-green-500" /> Excel (.xlsx)
                </button>
                <button onClick={() => exportData('csv')} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/10 text-gray-200 transition-colors">
                  <FileText size={18} className="text-blue-500" /> CSV (.csv)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <BarChart3 size={20} className="text-indigo-400" />
              Статистика по курсу
            </h2>
            <select 
              className="w-full p-3 glass-input rounded-xl text-white"
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(Number(e.target.value))}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.title} ({c.type === 'exam' ? 'Экзамен' : 'Лекция'})</option>
              ))}
            </select>
          </div>

          <div className="glass-panel p-6">
            <h3 className="font-semibold text-gray-300 mb-4">Общая сводка</h3>
            <div className="space-y-6">
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-400">Всего сдач (выбранный курс):</span>
                   <span className="font-bold text-lg text-white">{courseResults.length}</span>
                 </div>
                 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                 </div>
               </div>
               
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-400">Успешных сдач:</span>
                   <span className="font-bold text-green-400 text-lg">{courseResults.filter(r => r.passed === 1).length}</span>
                 </div>
                 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${courseResults.length ? (courseResults.filter(r => r.passed === 1).length / courseResults.length) * 100 : 0}%` }}></div>
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-400">Суммарно нарушений:</span>
                   <span className="font-bold text-orange-400 text-lg">{courseResults.reduce((acc, curr) => acc + (curr.violations || 0), 0)}</span>
                 </div>
                 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, courseResults.reduce((acc, curr) => acc + (curr.violations || 0), 0) * 10)}%` }}></div>
                 </div>
               </div>
            </div>
          </div>

          {selectedCourseDetails?.type === 'exam' && problematicQuestions.length > 0 && (
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" /> Топ ошибок
              </h3>
              <div className="space-y-4">
                {problematicQuestions.map((q, idx) => (
                  <div key={idx} className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <p className="text-sm font-medium text-gray-200 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.question }} />
                    <p className="text-xs text-red-400 mt-2 font-semibold">Ошибок: {q.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Data views */}
        <div className="lg:col-span-2 space-y-6">
          
          {selectedCourseDetails?.type === 'exam' && courseResults.length > 0 && (
            <div className="glass-panel p-6">
              <h3 className="font-bold text-white mb-6">Распределение баллов</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="transparent" className="stroke-white/10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-gray-400 text-xs" />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} className="text-gray-400 text-xs" />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === '81-100%' ? '#10b981' : entry.name === '0-20%' ? '#ef4444' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedCourseDetails?.type === 'exam' && courseResults.length > 0 && (
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <FileText size={20} className="text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Результаты тестирований</h2>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="py-4 px-6 font-medium text-gray-400 text-sm">Курсант</th>
                        <th className="py-4 px-6 font-medium text-gray-400 text-sm">Балл</th>
                        <th className="py-4 px-6 font-medium text-gray-400 text-sm">Статус</th>
                        <th className="py-4 px-6 font-medium text-gray-400 text-sm">Нарушения</th>
                        <th className="py-4 px-6 font-medium text-gray-400 text-sm text-right">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseResults.map((res) => (
                        <tr 
                          key={res.id} 
                          onClick={() => setSelectedResult(res)}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                          title="Нажмите для просмотра деталей"
                        >
                          <td className="py-4 px-6 font-medium text-gray-200">
                            {res.student_name}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`font-bold ${res.passed === 1 ? 'text-green-400' : 'text-red-400'}`}>
                              {res.score}%
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {res.passed === 1 ? (
                              <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/20 px-2.5 py-1 rounded-full text-xs font-medium">
                                <CheckCircle size={14} /> Сдано
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full text-xs font-medium">
                                <XCircle size={14} /> Провалено
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {res.violations > 0 ? (
                              <span className="text-orange-400 font-bold bg-orange-500/20 px-2 py-0.5 rounded text-sm">{res.violations}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right text-sm text-gray-400">
                            {new Date(res.date).toLocaleString('ru-RU')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal for Result Details */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-2xl font-bold text-white">Детали тестирования</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Курсант: <span className="font-semibold text-gray-200">{selectedResult.student_name}</span>
                </p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-center">
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Итоговый балл</div>
                  <div className={`text-2xl font-bold ${selectedResult.passed ? 'text-green-400' : 'text-red-400'}`}>{selectedResult.score}%</div>
                </div>
                <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-center">
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Статус</div>
                  <div className={`text-lg font-bold mt-1 ${selectedResult.passed ? 'text-green-400' : 'text-red-400'}`}>{selectedResult.passed ? 'СДАНО' : 'ПРОВАЛЕНО'}</div>
                </div>
                <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-center">
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Нарушения</div>
                  <div className={`text-2xl font-bold ${selectedResult.violations > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{selectedResult.violations}</div>
                </div>
              </div>

              {selectedResult.details && Array.isArray(selectedResult.details) ? (
                <div>
                  <h3 className="font-bold text-white mb-4 text-lg">Разбор ответов</h3>
                  <div className="space-y-4">
                    {selectedResult.details.map((q: Record<string, unknown>, i: number) => (
                      <div key={i} className={`p-4 rounded-xl border ${q.isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {q.isCorrect ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-100" dangerouslySetInnerHTML={{ __html: String(q.questionText || 'Вопрос не найден') }} />
                            {!q.isCorrect && (
                              <div className="mt-3 text-sm">
                                <p className="text-red-400"><strong>Ответ студента:</strong> {String(q.studentAnswer || 'Нет ответа')}</p>
                                <p className="text-green-400 mt-1"><strong>Правильный ответ:</strong> {String(q.correctAnswer || 'Скрыт')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={48} className="mx-auto text-gray-500 mb-4" />
                  <p>Детализация для данной попытки недоступна.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Analytics;
