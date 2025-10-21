/**
 * Jest setup for INTEGRATION tests
 * Uses real Firebase and SQLite, but still needs React Native mocks
 * since we're running in Node environment
 */

// DO NOT MOCK Firebase or SQLite for integration tests
// But we DO need to mock React Native since we're in Node

// Mock React Native AppState for presence service
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((event, handler) => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
}));

// Set environment to test
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

console.log('🔧 Integration test setup loaded - Real Firebase, Mocked RN');


