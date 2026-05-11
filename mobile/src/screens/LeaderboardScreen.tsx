import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../services/api';
import { Trophy, Medal } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaders = async () => {
    try {
      const res = await api.get('/leaderboard');
      setLeaders(res.data);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaders();
  }, []);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    let medalColor = null;
    if (index === 0) medalColor = '#fbbf24'; // Gold
    else if (index === 1) medalColor = '#94a3b8'; // Silver
    else if (index === 2) medalColor = '#b45309'; // Bronze

    return (
      <View style={styles.row}>
        <View style={styles.rankContainer}>
          {medalColor ? (
            <Medal color={medalColor} size={24} />
          ) : (
            <Text style={styles.rankText}>#{index + 1}</Text>
          )}
        </View>
        <Text style={styles.usernameText}>{item.username}</Text>
        <Text style={styles.scoreText}>{item.score}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Рейтинг</Text>

      <LinearGradient
        colors={['#8b5cf6', '#6d28d9']}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bannerHeader}>
          <Trophy color="#ffffff" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.bannerTitle}>Зал Славы</Text>
        </View>
        <Text style={styles.bannerText}>Топ студентов платформы. Зарабатывай баллы за прохождение лекций и экзаменов, чтобы подняться выше!</Text>
      </LinearGradient>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.columnHeader, { width: 60 }]}>Место</Text>
          <Text style={[styles.columnHeader, { flex: 1 }]}>Студент</Text>
          <Text style={[styles.columnHeader, { width: 60, textAlign: 'right' }]}>Баллы</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#8b5cf6" style={{ marginVertical: 40 }} />
        ) : (
          <FlatList
            data={leaders}
            keyExtractor={(item, index) => `${item.username}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Рейтинг пока пуст.</Text>
            }
          />
        )}
      </View>
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
    color: '#ede9fe',
    fontSize: 14,
    lineHeight: 20,
  },
  tableCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    marginHorizontal: 20,
    flex: 1,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  columnHeader: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  rankContainer: {
    width: 60,
    justifyContent: 'center',
  },
  rankText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usernameText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreText: {
    width: 60,
    textAlign: 'right',
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  }
});
