import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Clock } from 'lucide-react-native';
import api from '../services/api';

export default function QuizScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { course } = route.params;

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>((course.time_limit || 10) * 60);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get(`/questions?topic=${course.slug}`);
        setQuestions(res.data);
      } catch (err) {
        Alert.alert("Ошибка", "Не удалось загрузить вопросы");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, [course.slug]);

  const finishQuiz = useCallback(async (finalScore: number) => {
    setIsFinished(true);
    try {
      await api.post('/results', {
        topic: course.slug,
        score: finalScore,
        total: questions.length,
        passed: (finalScore) / questions.length >= 0.7 ? 1 : 0
      });
    } catch (e) {
      console.error("Failed to save result", e);
    }
  }, [course.slug, questions.length]);

  useEffect(() => {
    if (isLoading || isFinished || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishQuiz(score + (feedback?.correct && !isAnswered ? 1 : 0));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, isFinished, questions.length, score, feedback, isAnswered, finishQuiz]);

  const handleCheck = async () => {
    const q = questions[currentQIndex];
    const answer = q.type === 'text' ? textAnswer : selectedOption?.toString();
    
    if (answer === undefined || answer === null || answer === '') {
      Alert.alert("Внимание", "Пожалуйста, дайте ответ");
      return;
    }

    try {
      const res = await api.post('/check_answer', {
        questionId: q.id,
        userAnswer: answer
      });
      
      setFeedback(res.data);
      setIsAnswered(true);
      if (res.data.correct) {
        setScore(prev => prev + 1);
      }
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось проверить ответ");
    }
  };

  const handleNext = async () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setIsAnswered(false);
      setFeedback(null);
      setSelectedOption(null);
      setTextAnswer('');
    } else {
      finishQuiz(score + (feedback?.correct ? 1 : 0));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Нет вопросов для этого экзамена.</Text>
      </View>
    );
  }

  if (isFinished) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.backButton}>
            <ChevronLeft color="#f8fafc" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Результат</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedTitle}>Экзамен завершен!</Text>
          <Text style={styles.scoreText}>Правильных ответов: {score} из {questions.length}</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.actionButtonText}>Вернуться к курсам</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#f8fafc" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Вопрос {currentQIndex + 1}/{questions.length}</Text>
        <View style={styles.timerContainer}>
          <Clock color={timeLeft < 60 ? "#ef4444" : "#f8fafc"} size={16} />
          <Text style={[styles.timerText, timeLeft < 60 && styles.timerTextDanger]}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.questionText}>{currentQ.question}</Text>
        
        {currentQ.type !== 'text' && currentQ.options?.map((opt: string, idx: number) => {
          const isSelected = selectedOption === idx;
          let boxStyle = styles.optionBox;
          if (isSelected) boxStyle = [styles.optionBox, styles.optionSelected];
          
          if (isAnswered) {
            if (feedback?.correctIndex === idx) {
              boxStyle = [styles.optionBox, styles.optionCorrect];
            } else if (isSelected && !feedback?.correct) {
              boxStyle = [styles.optionBox, styles.optionWrong];
            }
          }

          return (
            <TouchableOpacity 
              key={idx} 
              style={boxStyle}
              onPress={() => !isAnswered && setSelectedOption(idx)}
              disabled={isAnswered}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {isAnswered && (
          <View style={[styles.feedbackBox, feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackTitle}>
              {feedback.correct ? 'Верно!' : 'Ошибка!'}
            </Text>
            {!feedback.correct && feedback.correctText && (
              <Text style={styles.feedbackDetail}>Правильный ответ: {feedback.correctText}</Text>
            )}
            {feedback.explanation && (
              <Text style={styles.feedbackDetail}>{feedback.explanation}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!isAnswered ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleCheck}>
            <Text style={styles.actionButtonText}>Проверить ответ</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
            <Text style={styles.actionButtonText}>
              {currentQIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  timerTextDanger: {
    color: '#ef4444',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
  },
  questionText: {
    fontSize: 20,
    color: '#f8fafc',
    fontWeight: 'bold',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  optionCorrect: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  optionWrong: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  feedbackBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  feedbackDetail: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    backgroundColor: '#0ea5e9', // sky-500
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 18,
    color: '#38bdf8',
    marginBottom: 40,
  }
});
