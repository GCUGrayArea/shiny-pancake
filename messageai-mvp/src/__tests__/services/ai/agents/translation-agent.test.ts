/**
 * Tests for Translation Agent
 */

import {
  translateMessage,
  isLanguagePairSupported,
  getLanguageName,
} from '@/services/ai/agents/translation-agent';
import * as AIClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Translation Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AIClient.isInitialized as jest.Mock).mockReturnValue(true);
  });

  describe('translateMessage', () => {
    it('should translate message preserving formatting', async () => {
      const mockTranslation = 'Hello!\nHow are you?\n😊';
      (AIClient.callCompletion as jest.Mock).mockResolvedValue(mockTranslation);

      const result = await translateMessage(
        'Hola!\n¿Cómo estás?\n😊',
        'es',
        'en'
      );

      expect(result).toBe(mockTranslation);
      expect(AIClient.callCompletion).toHaveBeenCalledTimes(1);

      // Verify the prompt preserves formatting
      const callArgs = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      expect(callArgs[0][0].content).toContain('Line breaks');
      expect(callArgs[0][0].content).toContain('Emojis');
    });

    it('should return original text for empty input', async () => {
      const result = await translateMessage('', 'es', 'en');

      expect(result).toBe('');
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should return original text when translating to same language', async () => {
      const text = 'Hello world';
      const result = await translateMessage(text, 'en', 'en');

      expect(result).toBe(text);
      expect(AIClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should throw error when source language is unknown', async () => {
      await expect(
        translateMessage('Hello', 'unknown', 'es')
      ).rejects.toThrow('Cannot translate from or to unknown language');
    });

    it('should throw error when target language is unknown', async () => {
      await expect(
        translateMessage('Hello', 'en', 'unknown')
      ).rejects.toThrow('Cannot translate from or to unknown language');
    });

    it('should throw error when AI client not initialized', async () => {
      (AIClient.isInitialized as jest.Mock).mockReturnValue(false);

      await expect(
        translateMessage('Hello', 'en', 'es')
      ).rejects.toThrow('OpenAI client not initialized');
    });

    it('should throw error when translation returns empty', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('  ');

      await expect(
        translateMessage('Hello', 'en', 'es')
      ).rejects.toThrow('Empty translation received');
    });

    it('should handle API errors gracefully', async () => {
      (AIClient.callCompletion as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      await expect(
        translateMessage('Hello', 'en', 'es')
      ).rejects.toThrow('Translation failed: API error');
    });

    it('should use correct language names in prompts', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Hola');

      await translateMessage('Hello', 'en', 'es');

      const callArgs = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      expect(callArgs[0][0].content).toContain('English');
      expect(callArgs[0][0].content).toContain('Spanish');
    });

    it('should include formatting preservation instructions', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Translated text');

      await translateMessage('Original text', 'en', 'fr');

      const callArgs = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      const systemPrompt = callArgs[0][0].content;

      expect(systemPrompt).toContain('Line breaks');
      expect(systemPrompt).toContain('Bullet points');
      expect(systemPrompt).toContain('Emojis');
      expect(systemPrompt).toContain('Markdown');
      expect(systemPrompt).toContain('Special characters');
      expect(systemPrompt).toContain('Tone and formality');
    });

    it('should set appropriate API parameters', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('Translated');

      await translateMessage('Text to translate', 'en', 'es');

      const callArgs = (AIClient.callCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[1];

      expect(options.temperature).toBe(0.3);
      expect(options.maxTokens).toBeGreaterThan(0);
    });

    it('should trim whitespace from translation result', async () => {
      (AIClient.callCompletion as jest.Mock).mockResolvedValue('  Translated text  \n');

      const result = await translateMessage('Original', 'en', 'es');

      expect(result).toBe('Translated text');
    });
  });

  describe('isLanguagePairSupported', () => {
    it('should return true for valid language pairs', () => {
      expect(isLanguagePairSupported('en', 'es')).toBe(true);
      expect(isLanguagePairSupported('fr', 'de')).toBe(true);
      expect(isLanguagePairSupported('zh', 'ja')).toBe(true);
    });

    it('should return false when source is unknown', () => {
      expect(isLanguagePairSupported('unknown', 'es')).toBe(false);
    });

    it('should return false when target is unknown', () => {
      expect(isLanguagePairSupported('en', 'unknown')).toBe(false);
    });

    it('should return false when languages are the same', () => {
      expect(isLanguagePairSupported('en', 'en')).toBe(false);
      expect(isLanguagePairSupported('es', 'es')).toBe(false);
    });
  });

  describe('getLanguageName', () => {
    it('should return correct language names', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('de')).toBe('German');
      expect(getLanguageName('zh')).toBe('Chinese');
      expect(getLanguageName('ja')).toBe('Japanese');
      expect(getLanguageName('ar')).toBe('Arabic');
    });

    it('should return uppercase code for unknown languages', () => {
      expect(getLanguageName('xx' as any)).toBe('XX');
      expect(getLanguageName('unknown')).toBe('Unknown');
    });
  });
});
