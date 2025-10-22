import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';

export default function MainScreen() {
  const { signOut, user } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
      <Text variant="headlineSmall">Welcome</Text>
      <Text>{user?.displayName || user?.email}</Text>
      <Button mode="contained" onPress={signOut}>Sign Out</Button>
    </View>
  );
}



