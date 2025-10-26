/**
 * Cultural Context Agent Tests
 */

import { analyzeCulturalContext, analyzeCulturalContextBatch } from '@/services/ai/agents/cultural-context-agent';
import * as aiClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Cultural Context Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCulturalContext', () => {
    it('should return empty array for very short messages', async () => {
      const result = await analyzeCulturalContext('Hi', 'en', 'msg-123');
      expect(result).toEqual([]);
      expect(aiClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should detect cultural references and return hints', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'Merry Christmas',
          explanation: 'A greeting used during the Christmas holiday season',
          culturalBackground: 'Christmas is a major Christian holiday celebrated on December 25th',
          category: 'holiday',
          startIndex: 0,
          endIndex: 15
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzeCulturalContext(
        'Merry Christmas everyone!',
        'en',
        'msg-456'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        messageId: 'msg-456',
        phrase: 'Merry Christmas',
        explanation: 'A greeting used during the Christmas holiday season',
        category: 'holiday'
      });
      expect(result[0].id).toBeDefined();
      expect(result[0].timestamp).toBeDefined();
    });

    it('should handle markdown code block in AI response', async () => {
      const mockResponse = '```json\n[{"phrase":"break a leg","explanation":"Good luck","culturalBackground":"Theater idiom","category":"idiom","startIndex":0,"endIndex":12}]\n```';

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzeCulturalContext(
        'Break a leg out there!',
        'en',
        'msg-789'
      );

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe('break a leg');
    });

    it('should return empty array on AI client error', async () => {
      (aiClient.callCompletion as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await analyzeCulturalContext(
        'Some message with cultural content',
        'en',
        'msg-error'
      );

      expect(result).toEqual([]);
    });

    it('should filter out invalid references', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'valid reference',
          explanation: 'This is valid',
          culturalBackground: 'Background info',
          category: 'custom',
          startIndex: 0,
          endIndex: 15
        },
        {
          // Missing explanation
          phrase: 'invalid reference',
          culturalBackground: 'Background',
          category: 'idiom'
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzeCulturalContext(
        'Message with references',
        'en',
        'msg-filter'
      );

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe('valid reference');
    });
  });

  describe('analyzeCulturalContextBatch', () => {
    it('should analyze multiple messages in batches', async () => {
      const mockResponse1 = JSON.stringify([
        {
          phrase: 'Diwali',
          explanation: 'Festival of lights',
          culturalBackground: 'Hindu festival',
          category: 'holiday',
          startIndex: 0,
          endIndex: 6
        }
      ]);

      const mockResponse2 = JSON.stringify([]);

      (aiClient.callCompletion as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const messages = [
        { id: 'msg-1', text: 'Happy Diwali!', language: 'en' as const },
        { id: 'msg-2', text: 'How are you?', language: 'en' as const }
      ];

      const result = await analyzeCulturalContextBatch(messages);

      expect(result.size).toBe(2);
      expect(result.get('msg-1')).toHaveLength(1);
      expect(result.get('msg-2')).toHaveLength(0);
    });

    it('should process empty array without errors', async () => {
      const result = await analyzeCulturalContextBatch([]);
      expect(result.size).toBe(0);
    });
  });
});
