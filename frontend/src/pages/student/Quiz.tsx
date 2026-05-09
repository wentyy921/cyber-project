import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTrophies } from '../../context/TrophyContext';
import { Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface Question {
  id: number;
  type: string;
  question: string;
  options: string[] | null;
}

const Quiz = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unlockTrophy } = useTrophies();
  const isTeacher = user?.role === 'teacher';
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  // const [timeLimit, setTimeLimit] = useState<number>(10); // unused, using timeLeft
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Current question state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  
  // Feedback state
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{correct: boolean; explanation: string; correct_text?: string} | null>(null);
  
  // Quiz results state
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [violations, setViolations] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [details, setDetails] = useState<Record<string, unknown>[]>([]);

  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    const initQuiz = async () => {
      try {
        const [qRes, cRes] = await Promise.all([
          api.get(`/questions?topic=${slug}`),
          api.get('/courses')
        ]);
        
        setQuestions(qRes.data);
        const foundCourse = cRes.data.find((c: any) => c.slug === slug);
        setCourse(foundCourse);
        if (foundCourse?.time_limit) {
          setTimeLeft(foundCourse.time_limit * 60);
        }
      } catch (err) {
        console.error("Error loading quiz", err);
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [slug]);

  // Timer logic
  useEffect(() => {
    if (timeLeft === null || isFinished || isAnswered) return;
    
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    
    const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, isAnswered]);

  const handleVisibilityChange = () => {
    if (isTeacher) return;
    if (document.hidden && !isFinished) {
      setViolations(v => v + 1);
      alert("Внимание! Вы покинули вкладку во время тестирования. Это зафиксировано как нарушение.");
    }
  };

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished]);

  const submitAnswer = async () => {
    if (questions.length === 0) return;
    const q = questions[currentQIndex];
    const answer = q.type === 'text' ? textAnswer : (selectedOption !== null ? selectedOption.toString() : '');
    
    if (answer === '') return;

    try {
      const res = await api.post('/check_answer', {
        questionId: q.id,
        userAnswer: answer
      });
      
      const { correct, explanation, correct_text } = res.data;
      if (correct) setCorrectAnswers(c => c + 1);
      
      setDetails(prev => [...prev, {
        questionText: q.question,
        studentAnswer: answer,
        correctAnswer: correct_text,
        isCorrect: correct
      }]);
      
      setFeedback({ correct, explanation, correct_text });
      setIsAnswered(true);
    } catch (e) {
      console.error("Check answer failed", e);
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setSelectedOption(null);
      setTextAnswer('');
      setIsAnswered(false);
      setFeedback(null);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsFinished(true);
    
    try {
      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= 70 ? 1 : 0; // Configurable threshold
      
      await api.post('/results', {
        topic: slug,
        score,
        total: questions.length,
        passed,
        violations,
        details
      });

      if (score === 100) {
        unlockTrophy('perfect_score');
      }
      if (passed && violations === 0 && timeLeft && timeLeft > (questions.length * 20)) {
        // Fast learner if finished quickly without violations
        unlockTrophy('fast_learner');
      }

    } catch (e) {
      console.error("Save result failed", e);
    }
  };

  if (loading) return <div className="p-8 text-center text-xl">Загрузка вопросов...</div>;
  if (questions.length === 0) return <div className="p-8 text-center text-xl text-red-500">В этом курсе пока нет вопросов.</div>;

  const isLocked = () => {
    if (isTeacher || !course) return false;
    const now = new Date().getTime();
    if (course.available_from && new Date(course.available_from).getTime() > now) return true;
    if (course.available_until && new Date(course.available_until).getTime() < now) return true;
    return false;
  };

  if (isLocked()) {
    return (
      <div className="max-w-4xl mx-auto mt-12 p-8 text-center glass-panel border border-red-500/30">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Доступ закрыт</h2>
        <p className="text-gray-300 mb-6">В данный момент этот экзамен недоступен для прохождения.</p>
        <button onClick={() => navigate('/student')} className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
          Вернуться к курсам
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  if (isFinished) {
    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= 70;
    
    return (
      <div className="max-w-2xl mx-auto mt-10 p-10 glass-panel text-center animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {passed ? <CheckCircle size={48} className="text-green-500" /> : <XCircle size={48} className="text-red-500" />}
        </div>
        <h2 className="text-3xl font-bold mb-2 text-white">Тестирование завершено</h2>
        <p className="text-gray-400 mb-8">Результаты отправлены на сервер</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-sm text-gray-400 uppercase tracking-wide font-semibold mb-1">Правильных ответов</div>
            <div className="text-3xl font-bold text-white">{correctAnswers} <span className="text-lg text-gray-500 font-normal">из {questions.length}</span></div>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-sm text-gray-400 uppercase tracking-wide font-semibold mb-1">Итоговый балл</div>
            <div className={`text-3xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}%</div>
          </div>
        </div>

        {violations > 0 && (
          <div className="mb-8 bg-orange-500/20 border border-orange-500/30 text-orange-400 p-4 rounded-xl flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            <span>Зафиксировано нарушений (уход со страницы): {violations}</span>
          </div>
        )}

        <button 
          onClick={() => navigate(isTeacher ? '/teacher' : '/student')}
          className="glass-button-primary w-full max-w-sm mx-auto flex items-center justify-center font-semibold py-3 px-8 rounded-xl transition-all"
        >
          Вернуться к списку курсов
        </button>
      </div>
    );
  }

  // Formatting time
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      {/* Top Bar (Sticky) */}
      <div className="sticky top-4 z-50 flex flex-col gap-3 mb-8 glass-panel p-4 shadow-[0_0_25px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]"></span>
            Вопрос {currentQIndex + 1} из {questions.length}
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-inner font-mono text-lg font-bold transition-colors ${
            timeLeft !== null && timeLeft < 60 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-gray-200 border border-white/5'
          }`}>
            <Clock size={18} className={timeLeft !== null && timeLeft < 60 ? 'text-red-500 animate-bounce' : 'text-gray-500'} />
            {formatTime(timeLeft)}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-panel overflow-hidden mb-6">
        <div className="p-8 md:p-10">
          <h3 className="text-2xl font-bold text-white mb-8 leading-tight">{currentQ.question}</h3>
          
          <div className="space-y-4">
            {currentQ.type === 'choice' && currentQ.options ? (
              currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                    selectedOption === idx 
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_20px_rgba(129,140,248,0.2)] transform -translate-y-0.5' 
                      : 'border-white/10 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10'
                  } ${isAnswered ? 'opacity-75 cursor-default transform-none' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedOption === idx ? 'border-indigo-400 bg-indigo-500/20' : 'border-gray-500 bg-black/20'
                    }`}>
                      {selectedOption === idx && <div className="w-3 h-3 rounded-full bg-indigo-400" />}
                    </div>
                    <span className="text-lg text-gray-200">{opt}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={`w-full p-1 rounded-2xl transition-all duration-300 ${isAnswered ? (feedback?.correct ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-800'}`}>
                <div className="bg-gray-900 rounded-xl p-5 flex items-center gap-3 font-mono text-lg shadow-inner">
                  <span className="text-green-400 font-bold select-none">ctf@trainer:~$</span>
                  <input
                    type="text"
                    disabled={isAnswered}
                    className="flex-1 bg-transparent text-green-400 focus:outline-none placeholder-gray-600 caret-green-400 disabled:opacity-75"
                    placeholder="flag{...}"
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textAnswer.trim() !== '' && !isAnswered) submitAnswer();
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="bg-white/5 p-6 md:px-10 border-t border-white/10 flex justify-end">
          {!isAnswered ? (
            <button
              onClick={submitAnswer}
              disabled={currentQ.type === 'choice' ? selectedOption === null : textAnswer.trim() === ''}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-colors"
            >
              Ответить
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              {currentQIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {isAnswered && feedback && (
        <div className={`rounded-2xl p-6 border animate-fade-in flex gap-4 shadow-sm ${
          feedback.correct ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex-shrink-0 mt-1">
            {feedback.correct ? <CheckCircle size={28} className="text-green-500" /> : <XCircle size={28} className="text-red-500" />}
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1">{feedback.correct ? 'Правильно!' : 'Неправильно'}</h4>
            {feedback.explanation && <p className="opacity-90 text-gray-300">{feedback.explanation}</p>}
            {!feedback.correct && feedback.correct_text && (
               <p className="mt-2 text-sm font-medium opacity-80 text-gray-300">Ожидаемый ответ: <span className="text-red-300 font-bold">{feedback.correct_text}</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
