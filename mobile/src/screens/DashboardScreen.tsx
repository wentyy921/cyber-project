import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Book, FileQuestion, Clock, Rocket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCourses();
  }, []);

  // Group courses
  const lessons = courses.filter(c => c.type !== 'exam');
  const exams = courses.filter(c => c.type === 'exam');

  const sections = [];
  if (lessons.length > 0) {
    sections.push({ title: 'Учебные материалы', data: lessons });
  }
  if (exams.length > 0) {
    sections.push({ title: 'Доступные экзамены', data: exams });
  }

  const renderBanner = () => (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerBorder}>
        <View style={styles.bannerInner}>
          <View style={styles.bannerHeader}>
            <Rocket color="#10b981" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.bannerTitle}>Так держать!</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Начать</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerText}>
            Продолжайте обучение. Следующая цель: сдать текущие экзамены.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isExam = item.type === 'exam';
    
    // Different gradients for Exams (Red/Orange) and Lessons (Blue/Purple)
    const colors = isExam ? ['#f97316', '#ef4444'] : ['#4f46e5', '#3b82f6'];
    const buttonColors = isExam ? ['#fb923c', '#f87171'] : ['#8b5cf6', '#a855f7'];

    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
      >
        <LinearGradient
          colors={colors}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.circleDecoration} />
        </LinearGradient>
        <View style={styles.cardContent}>
          <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.courseDescription} numberOfLines={1}>{item.description || 'Описание отсутствует'}</Text>
          
          <View style={styles.cardAction}>
            <LinearGradient
              colors={buttonColors}
              style={styles.actionButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>
                {isExam ? 'Перейти к экзамену' : 'Изучить материал'}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Кабинет</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 50 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderBanner}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Доступных материалов пока нет.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bannerContainer: {
    marginBottom: 16,
  },
  bannerBorder: {
    borderWidth: 1,
    borderColor: '#10b981', // emerald
    borderRadius: 16,
    padding: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  bannerInner: {
    padding: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  bannerButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bannerText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 12,
    marginTop: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // slate-800
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  cardGradient: {
    height: 120,
    padding: 16,
    justifyContent: 'flex-end',
  },
  circleDecoration: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardContent: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  cardAction: {
    alignItems: 'stretch',
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  }
});
