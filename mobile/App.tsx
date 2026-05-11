import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { TrophyProvider } from './src/context/TrophyContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TrophyProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </TrophyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
