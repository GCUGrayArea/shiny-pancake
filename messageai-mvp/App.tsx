import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MessageAI MVP</Text>
      <Text style={styles.subtitle}>Block 1: Foundation Complete ✓</Text>
      <Text style={styles.info}>Next: Block 2 - Authentication</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
  },
});
