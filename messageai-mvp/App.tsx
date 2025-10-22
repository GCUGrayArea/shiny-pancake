import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function App() {
  console.log('🚀 App: Component rendering');
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NetworkProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppNavigator />
            </NotificationProvider>
          </AuthProvider>
        </NetworkProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
