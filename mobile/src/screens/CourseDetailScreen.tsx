import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Clock, BookOpen, FileQuestion, HelpCircle, AlertTriangle } from 'lucide-react-native';
import api from '../services/api';

export default function CourseDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { course } = route.params;

  const isExam = course.type === 'exam';
  
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(isExam); // Only load if exam

  useEffect(() => {
    const fetchQuestionsCount = async () => {
      if (isExam) {
        try {
          const res = await api.get(`/questions?topic=${course.slug}`);
          setQuestionCount(res.data.length);
        } catch (e) {
          console.error("Failed to fetch questions count", e);
          setQuestionCount(0);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchQuestionsCount();
  }, [course.slug, isExam]);

  const handleStart = async () => {
    if (isExam) {
      navigation.navigate('Quiz', { course });
    } else {
      try {
        const userStr = await import('expo-secure-store').then(m => m.getItemAsync('lms_user'));
        if (userStr) {
          const user = JSON.parse(userStr);
          await api.post('/mark-lecture-viewed', { courseId: course.id, studentId: user.id });
        }
      } catch (e) {
        console.error("Failed to mark viewed", e);
      }
      navigation.navigate('Lecture', { course });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#f8fafc" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Предпросмотр</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.typeBadge}>
          {isExam ? <FileQuestion color="#ef4444" size={20} /> : <BookOpen color="#38bdf8" size={20} />}
          <Text style={[styles.typeText, { color: isExam ? '#ef4444' : '#38bdf8' }]}>
            {isExam ? 'Экзамен' : 'Лекция'}
          </Text>
        </View>

        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.description}>{course.description}</Text>

        {isExam && (
          <View style={styles.examInfoContainer}>
            <Text style={styles.infoSectionTitle}>Информация об экзамене</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Clock color="#8b5cf6" size={24} style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Время на выполнение</Text>
                <Text style={styles.infoValue}>{course.time_limit || 10} минут</Text>
              </View>
              
              <View style={styles.infoBox}>
                <HelpCircle color="#8b5cf6" size={24} style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Количество вопросов</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <Text style={styles.infoValue}>{questionCount}</Text>
                )}
              </View>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle color="#f59e0b" size={20} style={{ marginRight: 12 }} />
              <Text style={styles.warningText}>
                Внимание! Как только вы нажмете кнопку «Начать экзамен», таймер будет запущен. Экзамен автоматически завершится по истечении времени.
              </Text>
            </View>
          </View>
        )}

        {!isExam && course.deadline && (
          <View style={styles.deadlineRow}>
            <Clock color="#f59e0b" size={16} />
            <Text style={styles.deadlineText}>Дедлайн: {new Date(course.deadline).toLocaleDateString()}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.startButton, isExam && styles.startButtonExam]} 
          onPress={handleStart}
          disabled={isLoading}
        >
          <Text style={styles.startButtonText}>
            {isExam ? 'Начать экзамен' : 'Читать лекцию'}
          </Text>
        </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  typeText: {
    fontWeight: 'bold',
    marginLeft: 6,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  examInfoContainer: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  infoSectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16,
    borderRadius: 12,
  },
  warningText: {
    color: '#fcd34d',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deadlineText: {
    color: '#f59e0b',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  startButton: {
    backgroundColor: '#0ea5e9', // sky-500
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonExam: {
    backgroundColor: '#ef4444', // red-500
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
