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
    const model = Constants.expoConfig?.extra?.openaiModel || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
    const maxTokens = parseInt(Constants.expoConfig?.extra?.openaiMaxTokens || process.env.EXPO_PUBLIC_OPENAI_MAX_TOKENS || '1000', 10);
    const temperature = parseFloat(Constants.expoConfig?.extra?.openaiTemperature || process.env.EXPO_PUBLIC_OPENAI_TEMPERATURE || '0.3');
    const timeout = parseInt(Constants.expoConfig?.extra?.openaiTimeout || process.env.EXPO_PUBLIC_OPENAI_TIMEOUT || '30000', 10);

    if (apiKey) {
      try {
        initializeClient({
          apiKey,
          model,
          maxTokens,
          temperature,
          timeout,
        });
        console.log('✅ OpenAI client initialized');
        console.log(`   Model: ${model}`);
        console.log(`   Max Tokens: ${maxTokens}`);
        console.log(`   Temperature: ${temperature}`);
        console.log(`   Timeout: ${timeout}ms`);
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
