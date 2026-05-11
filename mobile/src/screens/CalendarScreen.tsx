import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Calendar as CalendarIcon, Lock, Unlock, Clock } from 'lucide-react-native';

export default function CalendarScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const withDeadlines = res.data.filter((c: any) => c.available_until || c.type === 'exam');
      // Sort by available_until ascending
      withDeadlines.sort((a: any, b: any) => {
        if (!a.available_until) return 1;
        if (!b.available_until) return -1;
        return new Date(a.available_until).getTime() - new Date(b.available_until).getTime();
      });
      setCourses(withDeadlines);
    } catch (error) {
      console.error("Failed to fetch courses for calendar", error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const isExpired = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() < new Date().getTime();
  };

  const renderItem = ({ item }: { item: any }) => {
    const expired = isExpired(item.available_until);
    
    return (
      <View style={[styles.card, expired && styles.cardExpired]}>
        <View style={styles.iconContainer}>
          {expired ? <Lock color="#475569" size={24} /> : <Unlock color="#10b981" size={24} />}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={styles.typeBadge}>{item.type === 'exam' ? 'Экзамен' : 'Курс'}</Text>
            <Text style={[styles.statusText, expired ? styles.textExpired : styles.textActive]}>
              {expired ? 'Завершено' : 'Доступно сейчас'}
            </Text>
          </View>
          <Text style={[styles.title, expired && styles.titleExpired]}>{item.title}</Text>
          <View style={styles.dateRow}>
            {item.available_from && (
              <View style={styles.dateItem}>
                <Clock color="#64748b" size={14} />
                <Text style={styles.dateText}>Открытие: {formatDate(item.available_from)}</Text>
              </View>
            )}
            {item.available_until && (
              <View style={styles.dateItem}>
                <Clock color={expired ? "#ef4444" : "#f43f5e"} size={14} />
                <Text style={[styles.dateText, expired ? {color: '#ef4444'} : {color: '#f43f5e'}]}>
                  Дедлайн: {formatDate(item.available_until)}
                </Text>
              </View>
            )}
          </View>
        </View>
        {!expired && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CourseDetail', { course: item })}
          >
            <Text style={styles.actionButtonText}>Перейти</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Календарь</Text>
      
      <View style={styles.banner}>
        <View style={styles.bannerHeader}>
          <CalendarIcon color="#ffffff" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.bannerTitle}>Календарь Дедлайнов</Text>
        </View>
        <Text style={styles.bannerText}>Следите за расписанием открытия и закрытия учебных материалов, чтобы не пропустить важное.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Нет предстоящих дедлайнов.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  banner: {
    backgroundColor: '#10b981', // emerald-500
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bannerText: {
    color: '#ecfdf5',
    fontSize: 14,
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardExpired: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)', // amber
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textActive: {
    color: '#10b981',
  },
  textExpired: {
    color: '#64748b',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  titleExpired: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  }
});
