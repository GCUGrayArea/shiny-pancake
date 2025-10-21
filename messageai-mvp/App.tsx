import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkProvider } from '@/contexts/NetworkContext';

export default function App() {
  console.log('🚀 App: Component rendering');
  return (
    <PaperProvider>
      <NetworkProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </NetworkProvider>
    </PaperProvider>
  );
}
