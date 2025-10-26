/**
 * Slang & Idiom Agent Tests
 */

import { detectSlangIdioms } from '@/services/ai/agents/slang-idiom-agent';
import * as aiClient from '@/services/ai/ai-client';

// Mock the AI client
jest.mock('@/services/ai/ai-client');

describe('Slang & Idiom Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectSlangIdioms', () => {
    it('should return empty array for very short messages', async () => {
      const result = await detectSlangIdioms('OK', 'en', 'msg-123');
      expect(result).toEqual([]);
      expect(aiClient.callCompletion).not.toHaveBeenCalled();
    });

    it('should detect slang and return structured items', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'piece of cake',
          literal: 'a slice of cake',
          actual: 'very easy',
          usage: 'This test is a piece of cake',
          formality: 'Informal, avoid in professional contexts',
          category: 'idiom',
          startIndex: 8,
          endIndex: 22
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'This is a piece of cake!',
        'en',
        'msg-456'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        messageId: 'msg-456',
        phrase: 'piece of cake',
        literal: 'a slice of cake',
        actual: 'very easy',
        category: 'idiom',
        language: 'en',
        known: false
      });
      expect(result[0].id).toBeDefined();
      expect(result[0].timestamp).toBeDefined();
    });

    it('should detect internet slang', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'LOL',
          literal: 'Laughing Out Loud',
          actual: 'something is funny',
          usage: 'That joke was hilarious, LOL!',
          formality: 'Very informal, use only in casual texts',
          category: 'internet-slang',
          regions: ['US', 'UK', 'Global'],
          startIndex: 0,
          endIndex: 3
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'LOL that\'s amazing',
        'en',
        'msg-789'
      );

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe('LOL');
      expect(result[0].category).toBe('internet-slang');
      expect(result[0].regions).toEqual(['US', 'UK', 'Global']);
    });

    it('should detect colloquialisms with regional info', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'y\'all',
          literal: 'you all',
          actual: 'plural you / you people',
          usage: 'How are y\'all doing today?',
          formality: 'Informal, regional dialect',
          category: 'colloquialism',
          regions: ['Southern US'],
          startIndex: 9,
          endIndex: 14
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'How are y\'all doing?',
        'en',
        'msg-col'
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('colloquialism');
      expect(result[0].regions).toContain('Southern US');
    });

    it('should handle markdown code block in AI response', async () => {
      const mockResponse = '```json\n[{"phrase":"spill the tea","literal":"pour out the tea","actual":"share gossip or secrets","usage":"Tell me more, spill the tea!","formality":"Very informal, slang","category":"slang","startIndex":0,"endIndex":13}]\n```';

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'Come on, spill the tea!',
        'en',
        'msg-json'
      );

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe('spill the tea');
      expect(result[0].category).toBe('slang');
    });

    it('should return empty array on AI client error', async () => {
      (aiClient.callCompletion as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await detectSlangIdioms(
        'Message with slang content',
        'en',
        'msg-error'
      );

      expect(result).toEqual([]);
    });

    it('should filter out invalid slang items', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'break the ice',
          literal: 'break ice into pieces',
          actual: 'start a conversation',
          usage: 'He told a joke to break the ice',
          formality: 'Neutral, widely acceptable',
          category: 'idiom',
          startIndex: 0,
          endIndex: 14
        },
        {
          // Missing required fields
          phrase: 'invalid item',
          literal: 'something',
          // missing actual, usage, formality
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'Message with mixed content',
        'en',
        'msg-filter'
      );

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe('break the ice');
    });

    it('should handle empty response from AI', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue('[]');

      const result = await detectSlangIdioms(
        'This is a standard message',
        'en',
        'msg-empty'
      );

      expect(result).toEqual([]);
    });

    it('should handle non-JSON response gracefully', async () => {
      (aiClient.callCompletion as jest.Mock).mockResolvedValue('No slang detected in this message.');

      const result = await detectSlangIdioms(
        'Standard English text',
        'en',
        'msg-nonjson'
      );

      expect(result).toEqual([]);
    });

    it('should use preferred language for explanations', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'cool',
          literal: 'baja temperatura',
          actual: 'impresionante o genial',
          usage: 'Esa película es muy cool',
          formality: 'Informal',
          category: 'slang',
          startIndex: 0,
          endIndex: 4
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'That\'s so cool',
        'en',
        'msg-lang',
        'es' // Spanish explanations
      );

      expect(result).toHaveLength(1);
      // The actual, literal, usage should be in Spanish based on preferred language
      expect(result[0].literal).toContain('temperatura');
    });

    it('should detect multiple slang items in one message', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: 'hang out',
          literal: 'suspend something outside',
          actual: 'spend time together casually',
          usage: 'Let\'s hang out this weekend',
          formality: 'Informal',
          category: 'slang',
          startIndex: 10,
          endIndex: 18
        },
        {
          phrase: 'chill',
          literal: 'make cold',
          actual: 'relax',
          usage: 'Just chill and watch TV',
          formality: 'Very informal',
          category: 'slang',
          startIndex: 23,
          endIndex: 28
        }
      ]);

      (aiClient.callCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await detectSlangIdioms(
        'Want to hang out and chill?',
        'en',
        'msg-multiple'
      );

      expect(result).toHaveLength(2);
      expect(result[0].phrase).toBe('hang out');
      expect(result[1].phrase).toBe('chill');
    });
  });
});
