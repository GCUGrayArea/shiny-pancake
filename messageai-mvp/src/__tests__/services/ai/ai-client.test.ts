/**
 * Tests for AI Client
 */

import {
  initializeClient,
  getClient,
  callCompletion,
  estimateTokens,
  isInitialized,
  resetClient,
} from '../../../services/ai/ai-client';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mocked response',
            },
          }],
        }),
      },
    },
  }));
});

describe('AI Client', () => {
  beforeEach(() => {
    resetClient();
  });

  describe('initializeClient', () => {
    it('should initialize client with API key', () => {
      const config = {
        apiKey: 'sk-test-key',
      };

      const client = initializeClient(config);
      expect(client).toBeDefined();
      expect(isInitialized()).toBe(true);
    });

    it('should throw error without API key', () => {
      expect(() => {
        initializeClient({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should accept custom configuration', () => {
      const config = {
        apiKey: 'sk-test-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.5,
        timeout: 20000,
      };

      const client = initializeClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('getClient', () => {
    it('should return initialized client', () => {
      initializeClient({ apiKey: 'sk-test-key' });
      const client = getClient();
      expect(client).toBeDefined();
    });

    it('should throw error if not initialized', () => {
      expect(() => {
        getClient();
      }).toThrow('OpenAI client not initialized');
    });
  });

  describe('callCompletion', () => {
    beforeEach(() => {
      initializeClient({ apiKey: 'sk-test-key' });
    });

    it('should call completion API', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];

      const response = await callCompletion(messages);
      expect(response).toBe('Mocked response');
    });

    it('should accept custom options', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];

      const options = {
        model: 'gpt-3.5-turbo',
        maxTokens: 100,
        temperature: 0.3,
      };

      const response = await callCompletion(messages, options);
      expect(response).toBe('Mocked response');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for short text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 4));
    });

    it('should estimate tokens for long text', () => {
      const text = 'A'.repeat(1000);
      const tokens = estimateTokens(text);
      expect(tokens).toBe(250); // 1000 / 4
    });

    it('should handle empty text', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(isInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      initializeClient({ apiKey: 'sk-test-key' });
      expect(isInitialized()).toBe(true);
    });

    it('should return false after reset', () => {
      initializeClient({ apiKey: 'sk-test-key' });
      resetClient();
      expect(isInitialized()).toBe(false);
    });
  });

  describe('resetClient', () => {
    it('should reset client state', () => {
      initializeClient({ apiKey: 'sk-test-key' });
      expect(isInitialized()).toBe(true);

      resetClient();
      expect(isInitialized()).toBe(false);

      expect(() => {
        getClient();
      }).toThrow('OpenAI client not initialized');
    });
  });
});
