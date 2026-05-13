import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { TrophyProvider } from './src/context/TrophyContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

// Корневой компонент мобильного приложения (React Native / Expo).
// Архитектурно выстраивает дерево контекстов (Context Tree) для обеспечения 
// глобального состояния и безопасного рендеринга на различных устройствах.
export default function App() {
  return (
    // SafeAreaProvider защищает интерфейс от "челок" (notches) и закругленных краев современных смартфонов.
    <SafeAreaProvider>
      {/* Провайдер аутентификации (внедрение зависимости для работы с JWT-токеном) */}
      <AuthProvider>
        {/* Провайдер геймификации (достижения, уровни) */}
        <TrophyProvider>
          {/* Стилизация системной статус-бара (батарея, время, сеть) */}
          <StatusBar style="light" />
          {/* Инициализация стека навигации (React Navigation) */}
          <AppNavigator />
        </TrophyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

