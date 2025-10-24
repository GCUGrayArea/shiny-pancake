/**
 * Unit tests for Formality Agent
 * Tests formality detection and adjustment functionality
 */

import {
  detectFormality,
  adjustFormality,
  getFormalityLabel,
  getFormalityEmoji,
  clearCache,
  type FormalityLevel,
} from '@/services/ai/agents/formality-agent';
import * as aiClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Formality Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    (aiClient.isInitialized as jest.Mock).mockReturnValue(true);
  });

  describe('detectFormality', () => {
    it('should detect very informal text', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'very-informal',
          confidence: 0.9,
          explanation: 'Uses slang, abbreviations like lol, minimal punctuation',
        })
      );

      const result = await detectFormality('hey lol whats up brb', 'en');

      expect(result.level).toBe('very-informal');
      expect(result.confidence).toBe(0.9);
      expect(result.explanation).toBeTruthy();
    });

    it('should detect informal text', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'informal',
          confidence: 0.85,
          explanation: 'Conversational tone with contractions',
        })
      );

      const result = await detectFormality("Hey! How's it going? Can't wait to see you!", 'en');

      expect(result.level).toBe('informal');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect neutral text', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'neutral',
          confidence: 0.8,
          explanation: 'Standard grammar, balanced tone',
        })
      );

      const result = await detectFormality('Hello, how are you doing today?', 'en');

      expect(result.level).toBe('neutral');
    });

    it('should detect formal text', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'formal',
          confidence: 0.9,
          explanation: 'Proper grammar, polite markers, no contractions',
        })
      );

      const result = await detectFormality(
        'Good afternoon. I would appreciate your assistance with this matter.',
        'en'
      );

      expect(result.level).toBe('formal');
    });

    it('should detect very formal text', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'very-formal',
          confidence: 0.95,
          explanation: 'Academic style, complex vocabulary, elaborate courtesy',
        })
      );

      const result = await detectFormality(
        'I would be most grateful if you could kindly provide me with the requisite information.',
        'en'
      );

      expect(result.level).toBe('very-formal');
    });

    it('should return neutral for empty text', async () => {
      const result = await detectFormality('', 'en');

      expect(result.level).toBe('neutral');
      expect(result.confidence).toBe(1.0);
      expect(result.explanation).toBe('Empty text');
    });

    it('should cache detection results', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'informal',
          confidence: 0.85,
          explanation: 'Test explanation',
        })
      );

      const text = 'Hey there!';

      // First call
      const result1 = await detectFormality(text, 'en');
      expect(aiClient.callCompletion).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await detectFormality(text, 'en');
      expect(aiClient.callCompletion).toHaveBeenCalledTimes(1); // Still 1
      expect(result2).toEqual(result1);
    });

    it('should throw error when AI client not initialized', async () => {
      (aiClient.isInitialized as jest.Mock).mockReturnValue(false);

      await expect(detectFormality('Hello', 'en')).rejects.toThrow(
        'OpenAI client not initialized'
      );
    });

    it('should handle API errors gracefully', async () => {
      (aiClient.callCompletion as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      await expect(detectFormality('Hello world', 'en')).rejects.toThrow(
        'Formality detection failed'
      );
    });

    it('should clamp confidence scores to 0-1 range', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'informal',
          confidence: 1.5, // Invalid - over 1
          explanation: 'Test',
        })
      );

      const result = await detectFormality('Hello', 'en');

      expect(result.confidence).toBe(1); // Clamped to 1
    });
  });

  describe('adjustFormality', () => {
    it('should make text more formal', async () => {
      (aiClient.callCompletion as jest.Mock)
        .mockResolvedValueOnce(
          JSON.stringify({
            level: 'informal',
            confidence: 0.8,
            explanation: 'Casual tone',
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            adjustedText: 'Hello, I cannot wait to see you.',
            changes: [
              "Changed 'Hey' to 'Hello'",
              "Removed contraction 'can't' → 'cannot'",
            ],
          })
        );

      const result = await adjustFormality("Hey! Can't wait to see you!", 'formal', 'en');

      expect(result.adjustedText).toBeTruthy();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.fromLevel).toBe('informal');
      expect(result.toLevel).toBe('formal');
    });

    it('should make text more casual', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          adjustedText: "Hey! Can't wait to see you!",
          changes: [
            "Changed 'Hello' to 'Hey'",
            "Added contraction 'cannot' → 'can't'",
          ],
        })
      );

      const result = await adjustFormality(
        'Hello, I cannot wait to see you.',
        'informal',
        'en',
        'formal'
      );

      expect(result.adjustedText).toBeTruthy();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.fromLevel).toBe('formal');
      expect(result.toLevel).toBe('informal');
    });

    it('should return original text if already at target level', async () => {
      const text = 'Hello, how are you?';

      const result = await adjustFormality(text, 'neutral', 'en', 'neutral');

      expect(result.adjustedText).toBe(text);
      expect(result.originalText).toBe(text);
      expect(result.changes[0]).toContain('already at target');
    });

    it('should handle empty text', async () => {
      const result = await adjustFormality('', 'formal', 'en', 'informal');

      expect(result.adjustedText).toBe('');
      expect(result.originalText).toBe('');
    });

    it('should detect current level if not provided', async () => {
      (aiClient.callCompletion as jest.Mock)
        .mockResolvedValueOnce(
          JSON.stringify({
            level: 'informal',
            confidence: 0.8,
            explanation: 'Casual',
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            adjustedText: 'Good morning. How are you?',
            changes: ["Changed 'Hey' to 'Good morning'"],
          })
        );

      const result = await adjustFormality('Hey! How are you?', 'formal', 'en');

      expect(result.fromLevel).toBe('informal');
      expect(result.toLevel).toBe('formal');
    });

    it('should preserve emojis and special characters', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          adjustedText: 'Hello! How are you? 😊',
          changes: ["Changed 'Hey' to 'Hello'"],
        })
      );

      const result = await adjustFormality('Hey! How are you? 😊', 'neutral', 'en', 'informal');

      expect(result.adjustedText).toContain('😊');
    });

    it('should handle different languages', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          adjustedText: 'Buenos días. ¿Cómo está usted?',
          changes: ["Changed 'tú' form to 'usted' form"],
        })
      );

      const result = await adjustFormality('Hola, ¿cómo estás?', 'formal', 'es', 'informal');

      expect(result.adjustedText).toBeTruthy();
    });

    it('should throw error when AI client not initialized', async () => {
      (aiClient.isInitialized as jest.Mock).mockReturnValue(false);

      await expect(
        adjustFormality('Hello', 'formal', 'en', 'informal')
      ).rejects.toThrow('OpenAI client not initialized');
    });

    it('should handle API errors gracefully', async () => {
      (aiClient.callCompletion as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      await expect(
        adjustFormality('Hello world', 'formal', 'en', 'informal')
      ).rejects.toThrow('Formality adjustment failed');
    });
  });

  describe('Helper functions', () => {
    it('should return correct formality labels', () => {
      expect(getFormalityLabel('very-informal')).toBe('Very Casual');
      expect(getFormalityLabel('informal')).toBe('Casual');
      expect(getFormalityLabel('neutral')).toBe('Neutral');
      expect(getFormalityLabel('formal')).toBe('Polite');
      expect(getFormalityLabel('very-formal')).toBe('Very Formal');
    });

    it('should return correct formality emojis', () => {
      expect(getFormalityEmoji('very-informal')).toBe('😎');
      expect(getFormalityEmoji('informal')).toBe('😊');
      expect(getFormalityEmoji('neutral')).toBe('🙂');
      expect(getFormalityEmoji('formal')).toBe('🎩');
      expect(getFormalityEmoji('very-formal')).toBe('🤵');
    });
  });

  describe('Cache management', () => {
    it('should clear cache when clearCache is called', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          level: 'informal',
          confidence: 0.85,
          explanation: 'Test',
        })
      );

      // First call
      await detectFormality('Hey there!', 'en');
      expect(aiClient.callCompletion).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      await detectFormality('Hey there!', 'en');
      expect(aiClient.callCompletion).toHaveBeenCalledTimes(1);

      // Clear cache
      clearCache();

      // Third call - cache cleared, makes new call
      await detectFormality('Hey there!', 'en');
      expect(aiClient.callCompletion).toHaveBeenCalledTimes(2);
    });
  });
});
