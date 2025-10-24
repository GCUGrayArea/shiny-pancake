/**
 * Tests for Translation Service
 */

import {
  translateText,
  translate,
  clearCache,
  getCacheStats,
  invalidateMessageCache,
} from '@/services/ai/translation.service';
import * as AIClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Translation Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    it('should translate text from Spanish to English', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hello, how are you?');

      const result = await translateText('Hola, ¿cómo estás?', 'es', 'en');

      expect(result).toBe('Hello, how are you?');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);
    });

    it('should translate text from English to French', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Bonjour, comment allez-vous?');

      const result = await translateText('Hello, how are you?', 'en', 'fr');

      expect(result).toBe('Bonjour, comment allez-vous?');
    });

    it('should return original text for empty input', async () => {
      const result = await translateText('', 'en', 'es');

      expect(result).toBe('');
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should return original text when translating to same language', async () => {
      const text = 'Hello world';
      const result = await translateText(text, 'en', 'en');

      expect(result).toBe(text);
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should return original text when source is unknown', async () => {
      const text = 'Hello world';
      const result = await translateText(text, 'unknown', 'es');

      expect(result).toBe(text);
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should return original text when target is unknown', async () => {
      const text = 'Hello world';
      const result = await translateText(text, 'en', 'unknown');

      expect(result).toBe(text);
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should cache translation results', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola mundo');

      // First call - should hit API
      const result1 = await translateText('Hello world', 'en', 'es');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await translateText('Hello world', 'en', 'es');
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1); // Not called again
      expect(result1).toBe(result2);
    });

    it('should cache with message ID', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola');

      const messageId = 'msg-123';

      // First call with messageId
      await translateText('Hello', 'en', 'es', messageId);
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);

      // Second call with same messageId and target language
      await translateText('Hello', 'en', 'es', messageId);
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1); // Cached
    });

    it('should handle API errors gracefully', async () => {
      (AIClient.callCompletion as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const text = 'Hello world';
      const result = await translateText(text, 'en', 'es');

      // Should return original text on error
      expect(result).toBe(text);
    });

    it('should preserve formatting in translation', async () => {
      const mockTranslation = 'Línea 1\nLínea 2\n- Punto 1\n- Punto 2';
      (AIClient.callCompletion as jest.Mock).mockResolvedValue(mockTranslation);

      const result = await translateText(
        'Line 1\nLine 2\n- Point 1\n- Point 2',
        'en',
        'es'
      );

      expect(result).toContain('\n'); // Line breaks preserved
    });
  });

  describe('translate', () => {
    it('should return full translation result', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola mundo');

      const result = await translate('Hello world', 'en', 'es');

      expect(result).toEqual({
        originalText: 'Hello world',
        translatedText: 'Hola mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
      });
    });

    it('should return confidence 1.0 for untranslated text', async () => {
      const result = await translate('Hello', 'en', 'en');

      expect(result.confidence).toBe(1.0);
      expect(result.originalText).toBe(result.translatedText);
    });
  });

  describe('Cache Management', () => {
    it('should report cache statistics', () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats.maxSize).toBe(200);
    });

    it('should clear cache', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola');

      await translateText('Hello', 'en', 'es');
      expect(getCacheStats().size).toBe(1);

      clearCache();
      expect(getCacheStats().size).toBe(0);
    });

    it('should invalidate message cache', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola');

      const messageId = 'msg-123';
      await translateText('Hello', 'en', 'es', messageId);
      await translateText('Hello', 'en', 'fr', messageId);

      expect(getCacheStats().size).toBe(2);

      invalidateMessageCache(messageId);

      // Cache should be smaller after invalidation
      expect(getCacheStats().size).toBe(0);
    });

    it('should enforce max cache size', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Translation');

      // Add 201 entries (max is 200)
      for (let i = 0; i < 201; i++) {
        await translateText(`Text ${i}`, 'en', 'es');
      }

      const stats = getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(200);
    });
  });

  describe('Token Management', () => {
    it('should calculate appropriate max tokens for long text', async () => {
      const longText = 'Hello world '.repeat(100); // ~1200 chars
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Translated');

      await translateText(longText, 'en', 'es');

      const call = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      const options = call[1];

      // Should allow room for expansion (2x length minimum)
      expect(options.maxTokens).toBeGreaterThanOrEqual(longText.length * 2);
    });

    it('should have minimum max tokens of 500', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hi');

      await translateText('Hi', 'en', 'es');

      const call = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      const options = call[1];

      expect(options.maxTokens).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Language Name Mapping', () => {
    it('should use proper language names in prompts', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola');

      await translateText('Hello', 'en', 'es');

      const call = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      const systemMessage = call[0][0].content;

      expect(systemMessage).toContain('English');
      expect(systemMessage).toContain('Spanish');
    });
  });
});
