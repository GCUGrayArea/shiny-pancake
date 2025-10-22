import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
      <ActivityIndicator animating size="large" />
      <Text>{message}</Text>
    </View>
  );
}



