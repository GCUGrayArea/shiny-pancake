/**
 * Tests for RAG Service
 */

import {
  getConversationContext,
  formatMessagesForLLM,
  buildContextPrompt,
  trimContextToTokenLimit,
  extractTextContent,
  calculateAverageMessageLength,
} from '../../../services/ai/rag.service';
import { Message } from '../../../types';

// Mock the database services
jest.mock('../../../services/local-message.service', () => ({
  getMessagesByChat: jest.fn(),
}));

jest.mock('../../../services/local-user.service', () => ({
  getUsers: jest.fn(),
}));

import { getMessagesByChat } from '../../../services/local-message.service';
import { getUsers } from '../../../services/local-user.service';

describe('RAG Service', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg1',
      chatId: 'chat1',
      senderId: 'user1',
      type: 'text',
      content: 'Hello there!',
      timestamp: 1000,
      status: 'read',
    },
    {
      id: 'msg2',
      chatId: 'chat1',
      senderId: 'user2',
      type: 'text',
      content: 'Hi! How are you?',
      timestamp: 2000,
      status: 'read',
    },
    {
      id: 'msg3',
      chatId: 'chat1',
      senderId: 'user1',
      type: 'image',
      content: 'https://example.com/image.jpg',
      caption: 'Check this out',
      timestamp: 3000,
      status: 'read',
    },
  ];

  const mockUsers = [
    {
      uid: 'user1',
      email: 'alice@example.com',
      displayName: 'Alice',
      createdAt: 1000,
      lastSeen: 3000,
      isOnline: true,
    },
    {
      uid: 'user2',
      email: 'bob@example.com',
      displayName: 'Bob',
      createdAt: 1000,
      lastSeen: 2000,
      isOnline: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversationContext', () => {
    it('should retrieve and format conversation context', async () => {
      // Database returns messages in DESC order (newest first)
      (getMessagesByChat as jest.Mock).mockResolvedValue({
        success: true,
        data: [...mockMessages].reverse(), // Simulate DB DESC order
      });

      (getUsers as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const context = await getConversationContext('chat1', 50);

      expect(context.messageCount).toBe(3);
      expect(context.messages).toHaveLength(3);
      // Messages are returned in chronological order (oldest first after reverse)
      expect(context.messages[0].senderName).toBe('Alice');
      expect(context.messages[0].content).toBe('Hello there!');
      expect(context.messages[1].senderName).toBe('Bob');
      expect(context.messages[1].content).toBe('Hi! How are you?');
      expect(context.messages[2].senderName).toBe('Alice');
      expect(context.messages[2].content).toBe('[Image: Check this out]');
      expect(context.estimatedTokens).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      (getMessagesByChat as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const context = await getConversationContext('chat1', 50);

      expect(context.messageCount).toBe(0);
      expect(context.messages).toHaveLength(0);
      expect(context.estimatedTokens).toBe(0);
    });

    it('should handle missing user data', async () => {
      (getMessagesByChat as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMessages,
      });

      (getUsers as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      const context = await getConversationContext('chat1', 50);

      expect(context.messageCount).toBe(3);
      expect(context.messages[0].senderName).toBe('Unknown');
    });
  });

  describe('formatMessagesForLLM', () => {
    it('should format messages as conversation string', () => {
      const messages = [
        {
          senderName: 'Alice',
          content: 'Hello!',
          timestamp: 1000,
          type: 'text' as const,
        },
        {
          senderName: 'Bob',
          content: 'Hi there!',
          timestamp: 2000,
          type: 'text' as const,
        },
      ];

      const formatted = formatMessagesForLLM(messages);

      expect(formatted).toContain('Alice: Hello!');
      expect(formatted).toContain('Bob: Hi there!');
    });

    it('should include timestamps when requested', () => {
      const messages = [
        {
          senderName: 'Alice',
          content: 'Hello!',
          timestamp: 1000,
          type: 'text' as const,
        },
      ];

      const formatted = formatMessagesForLLM(messages, true);

      expect(formatted).toContain('Alice');
      expect(formatted).toContain('Hello!');
      // Timestamp format will vary by locale
    });

    it('should handle empty message array', () => {
      const formatted = formatMessagesForLLM([]);
      expect(formatted).toBe('No previous messages in this conversation.');
    });
  });

  describe('buildContextPrompt', () => {
    it('should build complete prompt with context', () => {
      const context = {
        messages: [
          {
            senderName: 'Alice',
            content: 'Hello!',
            timestamp: 1000,
            type: 'text' as const,
          },
        ],
        messageCount: 1,
        estimatedTokens: 10,
      };

      const prompt = buildContextPrompt('Translate this', context);

      expect(prompt).toContain('Conversation history:');
      expect(prompt).toContain('Alice: Hello!');
      expect(prompt).toContain('User query: Translate this');
    });

    it('should include system instructions when provided', () => {
      const context = {
        messages: [],
        messageCount: 0,
        estimatedTokens: 0,
      };

      const systemInstructions = 'You are a helpful assistant.';
      const prompt = buildContextPrompt('Help me', context, systemInstructions);

      expect(prompt).toContain(systemInstructions);
      expect(prompt).toContain('User query: Help me');
    });
  });

  describe('trimContextToTokenLimit', () => {
    it('should not trim context under limit', () => {
      const context = {
        messages: [
          {
            senderName: 'Alice',
            content: 'Short message',
            timestamp: 1000,
            type: 'text' as const,
          },
        ],
        messageCount: 1,
        estimatedTokens: 10,
      };

      const trimmed = trimContextToTokenLimit(context, 1000);

      expect(trimmed.messageCount).toBe(1);
      expect(trimmed.messages).toHaveLength(1);
    });

    it('should trim oldest messages to fit limit', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        senderName: 'User',
        content: 'This is a test message with some content',
        timestamp: i,
        type: 'text' as const,
      }));

      // Calculate actual estimated tokens for this content
      const testText = messages.map(m => `${m.senderName}: ${m.content}`).join('\n');
      const actualTokens = Math.ceil(testText.length / 4);

      const context = {
        messages,
        messageCount: 100,
        estimatedTokens: actualTokens,
      };

      // Set limit to about 1/4 of actual tokens
      const tokenLimit = Math.floor(actualTokens / 4);
      const trimmed = trimContextToTokenLimit(context, tokenLimit);

      expect(trimmed.messageCount).toBeLessThan(context.messageCount);
      expect(trimmed.estimatedTokens).toBeLessThanOrEqual(tokenLimit + 50); // Allow some margin
    });
  });

  describe('extractTextContent', () => {
    it('should extract text from text messages', () => {
      const textContent = extractTextContent(mockMessages);

      expect(textContent).toHaveLength(2);
      expect(textContent).toContain('Hello there!');
      expect(textContent).toContain('Hi! How are you?');
    });

    it('should exclude image messages', () => {
      const textContent = extractTextContent(mockMessages);

      expect(textContent).not.toContain('https://example.com/image.jpg');
    });
  });

  describe('calculateAverageMessageLength', () => {
    it('should calculate average length', () => {
      const messages: Message[] = [
        {
          id: '1',
          chatId: 'chat1',
          senderId: 'user1',
          type: 'text',
          content: '12345', // 5 chars
          timestamp: 1000,
          status: 'read',
        },
        {
          id: '2',
          chatId: 'chat1',
          senderId: 'user1',
          type: 'text',
          content: '1234567890', // 10 chars
          timestamp: 2000,
          status: 'read',
        },
      ];

      const avg = calculateAverageMessageLength(messages);
      expect(avg).toBe(8); // (5 + 10) / 2 = 7.5, rounded to 8
    });

    it('should handle empty array', () => {
      const avg = calculateAverageMessageLength([]);
      expect(avg).toBe(0);
    });

    it('should ignore image messages', () => {
      const avg = calculateAverageMessageLength(mockMessages);
      expect(avg).toBeGreaterThan(0);
      // Only counts text messages
    });
  });
});
