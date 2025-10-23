/**
 * RAG Service Tests
 * Tests for conversation context retrieval and formatting
 */

import {
  formatMessagesForLLM,
  buildContextPrompt,
  extractLanguageCode,
} from '../rag.service';
import { Message, User } from '../../../types';
import { ConversationContext } from '../types';

describe('RAG Service', () => {
  const mockUsers: User[] = [
    {
      uid: 'user1',
      email: 'alice@example.com',
      displayName: 'Alice',
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    },
    {
      uid: 'user2',
      email: 'bob@example.com',
      displayName: 'Bob',
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: false,
    },
  ];

  const mockMessages: Message[] = [
    {
      id: 'msg1',
      chatId: 'chat1',
      senderId: 'user1',
      type: 'text',
      content: 'Hello Bob!',
      timestamp: Date.now() - 3000,
      status: 'read',
    },
    {
      id: 'msg2',
      chatId: 'chat1',
      senderId: 'user2',
      type: 'text',
      content: 'Hi Alice, how are you?',
      timestamp: Date.now() - 2000,
      status: 'read',
    },
    {
      id: 'msg3',
      chatId: 'chat1',
      senderId: 'user1',
      type: 'image',
      content: 'https://example.com/image.jpg',
      timestamp: Date.now() - 1000,
      status: 'delivered',
    },
  ];

  describe('formatMessagesForLLM', () => {
    it('should format text messages correctly', () => {
      const formatted = formatMessagesForLLM(
        mockMessages.slice(0, 2),
        mockUsers
      );

      expect(formatted).toContain('Alice: Hello Bob!');
      expect(formatted).toContain('Bob: Hi Alice, how are you?');
    });

    it('should format image messages correctly', () => {
      const formatted = formatMessagesForLLM(mockMessages, mockUsers);

      // Image messages should be formatted with [image: url]
      expect(formatted).toContain('[image:');
    });

    it('should handle unknown users', () => {
      const messagesFromUnknown: Message[] = [
        {
          id: 'msg4',
          chatId: 'chat1',
          senderId: 'unknown-user',
          type: 'text',
          content: 'Hello',
          timestamp: Date.now(),
          status: 'sent',
        },
      ];

      const formatted = formatMessagesForLLM(
        messagesFromUnknown,
        mockUsers
      );

      expect(formatted).toContain('Unknown: Hello');
    });

    it('should join messages with newlines', () => {
      const formatted = formatMessagesForLLM(
        mockMessages.slice(0, 2),
        mockUsers
      );

      expect(formatted).toContain('\n');
      expect(formatted.split('\n')).toHaveLength(2);
    });
  });

  describe('buildContextPrompt', () => {
    const mockContext: ConversationContext = {
      chatId: 'chat1',
      messages: mockMessages,
      participants: mockUsers,
      totalMessages: 3,
    };

    it('should build context with system instructions', () => {
      const systemInstructions = 'You are a helpful assistant.';
      const query = 'Translate this message';

      const context = buildContextPrompt(
        query,
        mockContext,
        systemInstructions
      );

      expect(context.systemPrompt).toBe(systemInstructions);
      expect(context.conversationHistory).toBeTruthy();
      expect(context.estimatedTokens).toBeGreaterThan(0);
    });

    it('should include conversation history', () => {
      const query = 'What did Alice say?';

      const context = buildContextPrompt(query, mockContext);

      expect(context.conversationHistory).toContain('Alice');
      expect(context.conversationHistory).toContain('Bob');
    });

    it('should estimate token count', () => {
      const query = 'Test query';

      const context = buildContextPrompt(query, mockContext);

      expect(context.estimatedTokens).toBeGreaterThan(0);
      expect(typeof context.estimatedTokens).toBe('number');
    });

    it('should handle empty context', () => {
      const emptyContext: ConversationContext = {
        chatId: 'chat2',
        messages: [],
        participants: [],
        totalMessages: 0,
      };

      const query = 'Test query';

      const context = buildContextPrompt(query, emptyContext);

      expect(context.conversationHistory).toBe('');
      expect(context.systemPrompt).toBe('');
    });
  });

  describe('extractLanguageCode', () => {
    it('should extract valid language codes', () => {
      expect(extractLanguageCode('en')).toBe('en');
      expect(extractLanguageCode('es')).toBe('es');
      expect(extractLanguageCode('fr')).toBe('fr');
      expect(extractLanguageCode('zh')).toBe('zh');
    });

    it('should handle uppercase codes', () => {
      expect(extractLanguageCode('EN')).toBe('en');
      expect(extractLanguageCode('ES')).toBe('es');
    });

    it('should handle codes with whitespace', () => {
      expect(extractLanguageCode('  en  ')).toBe('en');
      expect(extractLanguageCode('\nes\n')).toBe('es');
    });

    it('should return unknown for invalid codes', () => {
      expect(extractLanguageCode('invalid')).toBe('unknown');
      expect(extractLanguageCode('123')).toBe('unknown');
      expect(extractLanguageCode('')).toBe('unknown');
    });

    it('should handle mixed case', () => {
      expect(extractLanguageCode('En')).toBe('en');
      expect(extractLanguageCode('eS')).toBe('es');
    });
  });
});
