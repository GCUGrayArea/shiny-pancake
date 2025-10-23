/**
 * AI Client Tests
 * Tests for OpenAI client initialization and basic functionality
 */

import {
  initializeClient,
  getClient,
  estimateTokens,
  isClientInitialized,
  resetClient,
} from '../ai-client';

describe('AI Client', () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    // Set test API key
    process.env.OPENAI_API_KEY = 'sk-test-key-for-testing';
    process.env.OPENAI_MODEL = 'gpt-4-turbo';
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  beforeEach(() => {
    resetClient();
    // Ensure API key is set for each test
    process.env.OPENAI_API_KEY = 'sk-test-key-for-testing';
  });

  describe('initializeClient', () => {
    it('should initialize OpenAI client', () => {
      const client = initializeClient();
      expect(client).toBeDefined();
      expect(isClientInitialized()).toBe(true);
    });

    it('should throw error if API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      resetClient();

      expect(() => initializeClient()).toThrow('OpenAI API key not configured');

      // Restore for other tests
      process.env.OPENAI_API_KEY = 'sk-test-key-for-testing';
    });

    it('should return same client instance on multiple calls', () => {
      const client1 = initializeClient();
      const client2 = getClient();

      expect(client1).toBe(client2);
    });
  });

  describe('getClient', () => {
    it('should initialize client if not already initialized', () => {
      expect(isClientInitialized()).toBe(false);

      const client = getClient();

      expect(client).toBeDefined();
      expect(isClientInitialized()).toBe(true);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count for text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);

      // "Hello world" is 11 characters, ~3 tokens
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should handle empty string', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should estimate more tokens for longer text', () => {
      const shortText = 'Hello';
      const longText = 'This is a much longer text that should have more tokens';

      const shortTokens = estimateTokens(shortText);
      const longTokens = estimateTokens(longText);

      expect(longTokens).toBeGreaterThan(shortTokens);
    });
  });

  describe('resetClient', () => {
    it('should reset client initialization state', () => {
      initializeClient();
      expect(isClientInitialized()).toBe(true);

      resetClient();
      expect(isClientInitialized()).toBe(false);
    });
  });
});
