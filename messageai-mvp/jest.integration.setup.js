/**
 * Jest setup for INTEGRATION tests
 * NO MOCKS - uses real Firebase and SQLite
 */

// DO NOT MOCK anything for integration tests
// Integration tests need real implementations

// Set environment to test
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

console.log('🔧 Integration test setup loaded - NO MOCKS');

