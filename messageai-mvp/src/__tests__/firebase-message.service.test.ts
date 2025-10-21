/**
 * Unit tests for Firebase Message Service
 */

import type { Message } from '../types';

// Mock Firebase modules
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  push: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  limitToLast: jest.fn(),
  endBefore: jest.fn(),
  onChildAdded: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseDatabase: jest.fn(() => ({ mock: 'database' })),
}));

import {
  sendMessageToFirebase,
  getMessagesFromFirebase,
  updateMessageStatusInFirebase,
  markMessageDelivered,
  markMessageRead,
  getMessageDeliveryFromFirebase,
} from '../services/firebase-message.service';

import {
  ref,
  set,
  get,
  update,
  push,
  query,
  orderByChild,
  limitToLast,
  endBefore,
} from 'firebase/database';

const testMessage: Message = {
  id: 'msg-123',
  chatId: 'chat-456',
  senderId: 'user-1',
  type: 'text',
  content: 'Hello, world!',
  timestamp: 1234567890,
  status: 'sent',
  localId: 'local-123',
  deliveredTo: [],
  readBy: [],
};

describe('Firebase Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear timers between tests
    jest.clearAllTimers();
  });

  describe('sendMessageToFirebase', () => {
    it('should send a message with provided ID', async () => {
      const mockRef = { path: '/messages/chat-456/msg-123' };
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await sendMessageToFirebase(testMessage);

      expect(result.success).toBe(true);
      expect(result.data).toBe('msg-123');
      expect(set).toHaveBeenCalledWith(mockRef, {
        id: 'msg-123',
        chatId: 'chat-456',
        senderId: 'user-1',
        type: 'text',
        content: 'Hello, world!',
        timestamp: 1234567890,
        status: 'sent',
        localId: 'local-123',
        deliveredTo: [],
        readBy: [],
        metadata: null,
      });
    });

    it('should generate ID if not provided', async () => {
      const messageWithoutId = { ...testMessage, id: '' };
      const mockNewRef = { key: 'generated-msg-id' };

      (ref as jest.Mock).mockReturnValue({});
      (push as jest.Mock).mockReturnValue(mockNewRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await sendMessageToFirebase(messageWithoutId);

      expect(result.success).toBe(true);
      expect(result.data).toBe('generated-msg-id');
      expect(push).toHaveBeenCalled();
    });

    it('should send image message with metadata', async () => {
      const imageMessage: Message = {
        ...testMessage,
        type: 'image',
        content: 'https://example.com/image.jpg',
        metadata: {
          imageWidth: 1920,
          imageHeight: 1080,
          imageSize: 524288,
        },
      };

      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await sendMessageToFirebase(imageMessage);

      expect(result.success).toBe(true);
      expect(set).toHaveBeenCalledWith(mockRef, expect.objectContaining({
        type: 'image',
        metadata: {
          imageWidth: 1920,
          imageHeight: 1080,
          imageSize: 524288,
        },
      }));
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await sendMessageToFirebase(testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getMessagesFromFirebase', () => {
    it('should retrieve messages with default limit', async () => {
      const messages = [
        testMessage,
        { ...testMessage, id: 'msg-2', timestamp: 1234567891 },
      ];

      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          messages.forEach(msg => callback({ val: () => msg }));
        },
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderByChild as jest.Mock).mockReturnValue({});
      (limitToLast as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getMessagesFromFirebase('chat-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(messages);
      expect(limitToLast).toHaveBeenCalledWith(50);
    });

    it('should support custom limit', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      await getMessagesFromFirebase('chat-456', 100);

      expect(limitToLast).toHaveBeenCalledWith(100);
    });

    it('should support pagination with timestamp', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      await getMessagesFromFirebase('chat-456', 50, 1234567890);

      expect(endBefore).toHaveBeenCalledWith(1234567890);
      expect(limitToLast).toHaveBeenCalledWith(50);
    });

    it('should return empty array when no messages exist', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getMessagesFromFirebase('chat-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockImplementation(() => {
        throw new Error('Query error');
      });

      const result = await getMessagesFromFirebase('chat-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query error');
    });
  });

  describe('updateMessageStatusInFirebase', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update message status with debouncing', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (update as jest.Mock).mockResolvedValue(undefined);

      const promise = updateMessageStatusInFirebase('msg-123', 'chat-456', 'delivered');

      // Advance timers to trigger debounced update
      jest.advanceTimersByTime(500);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledWith(expect.anything(), { status: 'delivered' });
    });

    it.skip('should batch multiple status updates', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (update as jest.Mock).mockResolvedValue(undefined);

      // Trigger multiple updates within debounce window
      const promise1 = updateMessageStatusInFirebase('msg-123', 'chat-456', 'delivered');
      const promise2 = updateMessageStatusInFirebase('msg-123', 'chat-456', 'read');

      // Run all timers and wait for promises
      jest.runAllTimers();

      await Promise.all([promise1, promise2]);

      // Should only call update once with latest status
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(expect.anything(), { status: 'read' });
    });
  });

  describe('markMessageDelivered', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.skip('should add user to deliveredTo array', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          ...testMessage,
          deliveredTo: ['user-2'],
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);
      (update as jest.Mock).mockResolvedValue(undefined);

      const promise = markMessageDelivered('msg-123', 'chat-456', 'user-3');

      jest.runAllTimers();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        deliveredTo: ['user-2', 'user-3'],
      });
    });

    it('should not add duplicate user', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          ...testMessage,
          deliveredTo: ['user-2', 'user-3'],
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await markMessageDelivered('msg-123', 'chat-456', 'user-2');

      expect(result.success).toBe(true);
      expect(update).not.toHaveBeenCalled();
    });

    it('should handle missing message', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await markMessageDelivered('msg-123', 'chat-456', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found');
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await markMessageDelivered('msg-123', 'chat-456', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('markMessageRead', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.skip('should add user to readBy array', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          ...testMessage,
          readBy: ['user-2'],
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);
      (update as jest.Mock).mockResolvedValue(undefined);

      const promise = markMessageRead('msg-123', 'chat-456', 'user-3');

      jest.runAllTimers();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        readBy: ['user-2', 'user-3'],
      });
    });

    it('should not add duplicate user', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          ...testMessage,
          readBy: ['user-2'],
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await markMessageRead('msg-123', 'chat-456', 'user-2');

      expect(result.success).toBe(true);
      expect(update).not.toHaveBeenCalled();
    });

    it('should handle missing message', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await markMessageRead('msg-123', 'chat-456', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found');
    });
  });

  describe('getMessageDeliveryFromFirebase', () => {
    it('should return delivery status for all users', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          ...testMessage,
          deliveredTo: ['user-2', 'user-3', 'user-4'],
          readBy: ['user-2', 'user-3'],
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getMessageDeliveryFromFirebase('msg-123', 'chat-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        'user-2': { delivered: true, read: true },
        'user-3': { delivered: true, read: true },
        'user-4': { delivered: true, read: false },
      });
    });

    it('should return empty object for non-existent message', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getMessageDeliveryFromFirebase('msg-123', 'chat-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle messages with no delivery data', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => testMessage,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getMessageDeliveryFromFirebase('msg-123', 'chat-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getMessageDeliveryFromFirebase('msg-123', 'chat-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
