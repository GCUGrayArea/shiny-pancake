/**
 * Unit tests for Firebase Chat Service
 */

import type { Chat } from '../types';

// Mock Firebase modules
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  equalTo: jest.fn(),
  push: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseDatabase: jest.fn(() => ({ mock: 'database' })),
}));

import {
  createChatInFirebase,
  getChatFromFirebase,
  updateChatInFirebase,
  findOrCreateOneOnOneChat,
} from '../services/firebase-chat.service';

import {
  ref,
  set,
  get,
  update,
  push,
} from 'firebase/database';

const testChat: Chat = {
  id: 'chat-123',
  type: '1:1',
  participantIds: ['user-1', 'user-2'],
  createdAt: 1234567890,
  unreadCounts: {
    'user-1': 0,
    'user-2': 0,
  },
};

const testGroupChat: Chat = {
  id: 'group-456',
  type: 'group',
  participantIds: ['user-1', 'user-2', 'user-3'],
  name: 'Test Group',
  createdAt: 1234567890,
  lastMessage: {
    content: 'Hello',
    senderId: 'user-1',
    timestamp: 1234567890,
    type: 'text',
  },
};

describe('Firebase Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatInFirebase', () => {
    it('should create a chat with provided ID', async () => {
      const mockRef = { path: '/chats/chat-123' };
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await createChatInFirebase(testChat);

      expect(result.success).toBe(true);
      expect(result.data).toBe('chat-123');
      expect(set).toHaveBeenCalledWith(mockRef, {
        id: 'chat-123',
        type: '1:1',
        participantIds: {
          'user-1': true,
          'user-2': true,
        },
        name: null,
        createdAt: 1234567890,
        lastMessage: null,
        unreadCounts: {
          'user-1': 0,
          'user-2': 0,
        },
      });
    });

    it('should generate ID if not provided', async () => {
      const chatWithoutId = { ...testChat, id: '' };
      const mockNewRef = { key: 'generated-id-xyz' };

      (ref as jest.Mock).mockReturnValue({});
      (push as jest.Mock).mockReturnValue(mockNewRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await createChatInFirebase(chatWithoutId);

      expect(result.success).toBe(true);
      expect(result.data).toBe('generated-id-xyz');
      expect(push).toHaveBeenCalled();
    });

    it('should create group chat with name and lastMessage', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await createChatInFirebase(testGroupChat);

      expect(result.success).toBe(true);
      expect(set).toHaveBeenCalledWith(mockRef, expect.objectContaining({
        name: 'Test Group',
        type: 'group',
        lastMessage: testGroupChat.lastMessage,
        participantIds: {
          'user-1': true,
          'user-2': true,
          'user-3': true,
        },
      }));
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await createChatInFirebase(testChat);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getChatFromFirebase', () => {
    it('should retrieve an existing chat', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          id: 'chat-123',
          type: '1:1',
          participantIds: {
            'user-1': true,
            'user-2': true,
          },
          createdAt: 1234567890,
          unreadCounts: {
            'user-1': 0,
            'user-2': 0,
          },
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getChatFromFirebase('chat-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'chat-123',
        type: '1:1',
        participantIds: ['user-1', 'user-2'],
        name: undefined,
        createdAt: 1234567890,
        lastMessage: undefined,
        unreadCounts: {
          'user-1': 0,
          'user-2': 0,
        },
      });
    });

    it('should return null for non-existent chat', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getChatFromFirebase('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle chats with no participantIds gracefully', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => ({
          id: 'chat-123',
          type: '1:1',
          participantIds: null,
          createdAt: 1234567890,
        }),
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getChatFromFirebase('chat-123');

      expect(result.success).toBe(true);
      expect(result.data?.participantIds).toEqual([]);
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getChatFromFirebase('chat-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateChatInFirebase', () => {
    it('should update chat fields', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      const updates = {
        name: 'Updated Group Name',
        lastMessage: {
          content: 'New message',
          senderId: 'user-1',
          timestamp: 9999999,
          type: 'text' as const,
        },
      };

      const result = await updateChatInFirebase('chat-123', updates);

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledWith(mockRef, updates);
    });

    it('should convert participantIds array to object', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      const updates = {
        participantIds: ['user-1', 'user-2', 'user-3'],
      };

      await updateChatInFirebase('chat-123', updates);

      expect(update).toHaveBeenCalledWith(mockRef, {
        participantIds: {
          'user-1': true,
          'user-2': true,
          'user-3': true,
        },
      });
    });

    it('should not allow updating id field', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      const updates: any = {
        id: 'different-id',
        name: 'Updated Name',
      };

      await updateChatInFirebase('chat-123', updates);

      expect(update).toHaveBeenCalledWith(mockRef, {
        name: 'Updated Name',
      });
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const result = await updateChatInFirebase('chat-123', { name: 'New' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('findOrCreateOneOnOneChat', () => {
    it('should return existing 1:1 chat if found', async () => {
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          callback({
            val: () => ({
              id: 'existing-chat',
              type: '1:1',
              participantIds: {
                'user-1': true,
                'user-2': true,
              },
            }),
          });
        },
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await findOrCreateOneOnOneChat('user-1', 'user-2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('existing-chat');
      expect(set).not.toHaveBeenCalled();
    });

    it('should find chat regardless of participant order', async () => {
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          callback({
            val: () => ({
              id: 'existing-chat',
              type: '1:1',
              participantIds: {
                'user-2': true,
                'user-1': true,
              },
            }),
          });
        },
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await findOrCreateOneOnOneChat('user-1', 'user-2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('existing-chat');
    });

    it('should not match group chats', async () => {
      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          callback({
            val: () => ({
              id: 'group-chat',
              type: 'group',
              participantIds: {
                'user-1': true,
                'user-2': true,
              },
            }),
          });
        },
      };

      const mockNewRef = { key: 'new-chat-id' };
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);
      (push as jest.Mock).mockReturnValue(mockNewRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await findOrCreateOneOnOneChat('user-1', 'user-2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('new-chat-id');
      expect(set).toHaveBeenCalled();
    });

    it('should create new chat if none exists', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      const mockNewRef = { key: 'new-chat-id' };
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);
      (push as jest.Mock).mockReturnValue(mockNewRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await findOrCreateOneOnOneChat('user-1', 'user-2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('new-chat-id');
      expect(set).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await findOrCreateOneOnOneChat('user-1', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
