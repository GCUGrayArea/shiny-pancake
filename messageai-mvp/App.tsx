import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { initializeClient } from '@/services/ai/ai-client';
import Constants from 'expo-constants';

export default function App() {
  console.log('🚀 App: Component rendering');

  // Initialize OpenAI client on app startup
  useEffect(() => {
    const apiKey = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (apiKey) {
      try {
        initializeClient({
          apiKey,
          model: 'gpt-4o-mini', // Cost-effective model for translations
          maxTokens: 1000,
          temperature: 0.3,
          timeout: 30000,
        });
        console.log('✅ OpenAI client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error);
      }
    } else {
      console.warn('⚠️ OpenAI API key not found. AI features will be disabled.');
    }
  }, []);

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
