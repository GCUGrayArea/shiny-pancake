/**
 * Tests for Language Detection Service
 */

import {
  detectLanguage,
  detectMultipleLanguages,
  detectLanguageWithConfidence,
  clearCache,
  getCacheStats,
} from '@/services/ai/language-detection.service';
import * as AIClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Language Detection Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    jest.clearAllMocks();
  });

  describe('detectLanguage', () => {
    it('should detect English language', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('en');

      const result = await detectLanguage('Hello, how are you?');

      expect(result).toBe('en');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);
    });

    it('should detect Spanish language', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('es');

      const result = await detectLanguage('Hola, ¿cómo estás?');

      expect(result).toBe('es');
    });

    it('should return unknown for empty text', async () => {
      const result = await detectLanguage('');

      expect(result).toBe('unknown');
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should return unknown for very short text', async () => {
      const result = await detectLanguage('a');

      expect(result).toBe('unknown');
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should cache detection results', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('en');

      // First call - should hit API
      const result1 = await detectLanguage('Hello world');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await detectLanguage('Hello world');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1); // Not called again
      expect(result1).toBe(result2);
    });

    it('should handle API errors gracefully', async () => {
      (AIClient.callCompletion as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const result = await detectLanguage('Hello world');

      expect(result).toBe('unknown');
    });

    it('should validate language codes', async () => {
      // Return invalid language code
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('xyz');

      const result = await detectLanguage('Hello world');

      expect(result).toBe('unknown');
    });
  });

  describe('detectMultipleLanguages', () => {
    it('should detect multiple languages in parallel', async () => {
      (AIClient.callCompletion as jest.Mock)
        .mockResolvedValueOnce('en')
        .mockResolvedValueOnce('es')
        .mockResolvedValueOnce('fr');

      const results = await detectMultipleLanguages([
        'Hello',
        'Hola',
        'Bonjour',
      ]);

      expect(results).toEqual(['en', 'es', 'fr']);
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      const results = await detectMultipleLanguages([]);

      expect(results).toEqual([]);
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });
  });

  describe('detectLanguageWithConfidence', () => {
    it('should return language with confidence score', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({ language: 'en', confidence: 0.95 })
      );

      const result = await detectLanguageWithConfidence('Hello world');

      expect(result).toEqual({
        language: 'en',
        confidence: 0.95,
      });
    });

    it('should return unknown for empty text', async () => {
      const result = await detectLanguageWithConfidence('');

      expect(result).toEqual({
        language: 'unknown',
        confidence: 0,
      });
    });

    it('should return cached results with high confidence', async () => {
      // First call returns high confidence
      (AIClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({ language: 'en', confidence: 0.95 })
      );

      await detectLanguageWithConfidence('Hello world');

      // Second call should use cache
      const result = await detectLanguageWithConfidence('Hello world');

      expect(result.confidence).toBe(1.0); // Cached = high confidence
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);
    });

    it('should not cache low-confidence results', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({ language: 'en', confidence: 0.5 })
      );

      const result1 = await detectLanguageWithConfidence('Hmm ok');
      const result2 = await detectLanguageWithConfidence('Hmm ok');

      // Should call API twice since confidence was low
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(2);
    });

    it('should handle JSON parse errors', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('invalid json');

      const result = await detectLanguageWithConfidence('Hello');

      expect(result).toEqual({
        language: 'unknown',
        confidence: 0,
      });
    });
  });

  describe('Cache Management', () => {
    it('should report cache statistics', () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats.maxSize).toBe(100);
    });

    it('should clear cache', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('en');

      await detectLanguage('Hello');
      expect(getCacheStats().size).toBe(1);

      clearCache();
      expect(getCacheStats().size).toBe(0);
    });

    it('should enforce max cache size', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('en');

      // Add 101 entries (max is 100)
      for (let i = 0; i < 101; i++) {
        await detectLanguage(`Hello ${i}`);
      }

      const stats = getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(100);
    });
  });
});
