import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTrophies, TROPHIES } from '../context/TrophyContext';
import api from '../services/api';
import { LogOut, Trophy as TrophyIcon, UserCircle, Lock, Mail, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, logout, login } = useAuth();
  const { unlockedTrophies } = useTrophies();
  const [activeTab, setActiveTab] = useState<'trophies' | 'settings'>('trophies');
  
  // Stats
  const [stats, setStats] = useState({ passedExams: 0, efficiency: 0, attempts: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchStats = async () => {
    try {
      const [resResults, resMe] = await Promise.all([
        api.get('/results'),
        api.get('/users/me')
      ]);

      const myResults = resResults.data || [];
      const passedCount = myResults.filter((r: any) => r.passed).length;
      const totalCount = myResults.length;
      const eff = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

      setStats({
        passedExams: passedCount,
        efficiency: eff,
        attempts: totalCount
      });

      setFullName(resMe.data.full_name || '');
      setEmail(resMe.data.email || '');

    } catch (error) {
      console.error("Failed to load profile stats", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        id: user.id,
        full_name: fullName,
        email: email,
      };
      if (password) {
        payload.password = password;
      }
      
      const res = await api.post('/student/update_profile', payload);
      if (res.data.success) {
        Alert.alert("Успех", "Профиль успешно обновлен");
        // Re-login to update context with new token if returned
        if (res.data.token) {
          await login(res.data.token, res.data.user);
        }
        setPassword('');
      } else {
        Alert.alert("Ошибка", res.data.message || "Не удалось обновить");
      }
    } catch (e) {
      Alert.alert("Ошибка", "Сетевая ошибка при обновлении профиля");
    } finally {
      setIsSaving(false);
    }
  };

  const renderTrophies = () => {
    const allTrophies = Object.values(TROPHIES);

    return (
      <View style={styles.trophiesContainer}>
        {allTrophies.map(trophy => {
          const isUnlocked = unlockedTrophies.includes(trophy.id);
          return (
            <View key={trophy.id} style={[styles.trophyCard, !isUnlocked && styles.trophyCardLocked]}>
              <View style={styles.trophyIconContainer}>
                <TrophyIcon color={isUnlocked ? "#fbbf24" : "#475569"} size={32} />
              </View>
              <Text style={styles.trophyTitle}>{trophy.title}</Text>
              <Text style={styles.trophyDesc}>{trophy.description}</Text>
              <View style={styles.trophyBadge}>
                <Text style={[styles.trophyBadgeText, isUnlocked ? styles.trophyBadgeTextUnlocked : {}]}>
                  {isUnlocked ? 'РАЗБЛОКИРОВАНО' : 'ЗАБЛОКИРОВАНО'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.settingsForm}>
      <View style={styles.inputGroup}>
        <User color="#94a3b8" size={20} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="ФИО"
          placeholderTextColor="#64748b"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>
      <View style={styles.inputGroup}>
        <Mail color="#94a3b8" size={20} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputGroup}>
        <Lock color="#94a3b8" size={20} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Новый пароль (оставьте пустым)"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      
      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSaveProfile}
        disabled={isSaving}
      >
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Сохранить изменения</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Кабинет</Text>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        <LinearGradient
          colors={['#4f46e5', '#312e81']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileHeaderTop}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: user.avatar.startsWith('http') ? user.avatar : `http://127.0.0.1:8000${user.avatar}` }} 
                  style={styles.avatar} 
                />
              ) : (
                <UserCircle color="#a5b4fc" size={48} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{user?.full_name || user?.username}</Text>
              <View style={styles.emailRow}>
                <Mail color="#a5b4fc" size={14} />
                <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutIcon} onPress={logout}>
              <LogOut color="#fca5a5" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>СДАНО ЭКЗАМЕНОВ</Text>
              <Text style={styles.statValue}>{isLoading ? '-' : stats.passedExams}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxBorder]}>
              <Text style={styles.statLabel}>ЭФФЕКТИВНОСТЬ</Text>
              <Text style={styles.statValue}>{isLoading ? '-' : `${stats.efficiency}%`}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ВСЕГО ПОПЫТОК</Text>
              <Text style={styles.statValue}>{isLoading ? '-' : stats.attempts}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'trophies' && styles.tabActive]}
            onPress={() => setActiveTab('trophies')}
          >
            <TrophyIcon color={activeTab === 'trophies' ? '#6366f1' : '#64748b'} size={18} />
            <Text style={[styles.tabText, activeTab === 'trophies' && styles.tabTextActive]}>
              Стена Трофеев
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <User color={activeTab === 'settings' ? '#6366f1' : '#64748b'} size={18} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
              Настройки
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'trophies' ? renderTrophies() : renderSettings()}
        </View>

      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  email: {
    color: '#a5b4fc',
    fontSize: 14,
    marginLeft: 6,
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  tabContent: {
    minHeight: 300,
  },
  trophiesContainer: {
    gap: 16,
  },
  trophyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trophyCardLocked: {
    opacity: 0.6,
  },
  trophyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  trophyDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  trophyBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trophyBadgeText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trophyBadgeTextUnlocked: {
    color: '#fbbf24',
  },
  settingsForm: {
    gap: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
