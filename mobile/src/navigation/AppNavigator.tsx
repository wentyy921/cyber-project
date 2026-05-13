import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Home, BookOpen, User as UserIcon, Calendar, Trophy } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import LectureScreen from '../screens/LectureScreen';
import QuizScreen from '../screens/QuizScreen';

import KnowledgeBaseScreen from '../screens/KnowledgeBaseScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ArticleScreen from '../screens/ArticleScreen';
import CalendarScreen from '../screens/CalendarScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

// Инициализация стековых и таб-навигаторов (React Navigation v6).
// Stack Navigator обеспечивает линейную навигацию (push/pop) для глубоких экранов (экзамены, лекции).
const Stack = createNativeStackNavigator();
// Tab Navigator обеспечивает плоскую навигацию между основными разделами приложения.
const Tab = createBottomTabNavigator();

// Компонент нижнего меню (Bottom Tabs).
// Архитектурно инкапсулирует основные корневые экраны пользователя (Студента).
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Отключение встроенных заголовков для кастомной стилизации экранов
        tabBarStyle: {
          backgroundColor: '#1e293b', // Темная тема оформления (Slate 800)
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#38bdf8', // Sky 400 (Активное состояние)
        tabBarInactiveTintColor: '#94a3b8', // Slate 400 (Неактивное состояние)
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Курсы',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="CalendarTab" 
        component={CalendarScreen} 
        options={{
          tabBarLabel: 'Календарь',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="LeaderboardTab" 
        component={LeaderboardScreen} 
        options={{
          tabBarLabel: 'Рейтинг',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="KnowledgeBaseTab" 
        component={KnowledgeBaseScreen} 
        options={{
          tabBarLabel: 'База Знаний',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

// Корневой навигатор приложения (Root Navigator).
// Реализует паттерн "Authentication Flow": переключает стеки навигации 
// в зависимости от состояния авторизации (user ? AppStack : AuthStack).
export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  // Ожидание завершения восстановления сессии (валидация токена из AsyncStorage)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Авторизованная зона (Protected Routes). 
          // Пользователь имеет доступ к табам (MainTabs) и скрытым экранам деталей.
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
            <Stack.Screen name="Lecture" component={LectureScreen} />
            <Stack.Screen name="Quiz" component={QuizScreen} />
            <Stack.Screen name="Article" component={ArticleScreen} />
          </>
        ) : (
          // Неавторизованная зона (Public Routes). Только экран входа.
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

