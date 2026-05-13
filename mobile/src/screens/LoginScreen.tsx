import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield } from 'lucide-react-native';

// Экран авторизации мобильного приложения.
// Является публичным (не требует JWT-токена). 
export default function LoginScreen() {
  const { login } = useAuth();
  
  // Управление состоянием полей ввода (Controlled Components)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Обработчик аутентификации.
  // Выполняет сетевой запрос к серверу и валидирует права доступа пользователя.
  const handleLogin = async () => {
    // Валидация на стороне клиента перед отправкой запроса (Client-side validation)
    if (!username || !password) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setIsLoading(true);
    try {
      // POST-запрос к FastAPI серверу
      const response = await api.post('/login', {
        username: username,
        password: password
      });

      const data = response.data;
      if (data.success && data.token) {
        // Role-Based Access Control (RBAC):
        // Ограничение мобильного приложения только для студентов.
        // Админы и преподаватели должны использовать веб-версию.
        if (data.user.role !== 'student') {
          Alert.alert('Доступ запрещен', 'Мобильное приложение доступно только для студентов.');
          return;
        }
        
        // Передача токена в глобальный AuthContext для сохранения в AsyncStorage
        await login(data.token, data.user);
      }
    } catch (error: any) {
      console.error(error);
      // Обработка ошибок HTTP 401/403 или недоступности сервера
      Alert.alert(
        'Ошибка входа', 
        error.response?.data?.detail || 'Неверный логин или пароль. Либо сервер недоступен.'
      );
    } finally {
      setIsLoading(false); // Снятие блокировки UI
    }
  };

  return (
    <View style={styles.container}>
      {/* Контейнер с визуальным эффектом Glassmorphism */}
      <View style={styles.glassCard}>
        <View style={styles.logoContainer}>
          <Shield color="#38bdf8" size={64} />
          <Text style={styles.title}>Cyber Trainer</Text>
          <Text style={styles.subtitle}>Платформа кибер-обучения</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Логин</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите ваш логин"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none" // Отключение автоматического регистра (важно для логинов)
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите пароль"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry // Скрытие символов пароля
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Войти в систему</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // slate-800 with opacity
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8', // slate-400
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#cbd5e1', // slate-300
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // slate-900 with opacity
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#ffffff',
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0284c7', // sky-600
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

