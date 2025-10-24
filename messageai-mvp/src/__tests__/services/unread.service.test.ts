/**
 * Unit Tests for Unread Message Count Service
 */

import * as UnreadService from '../../services/unread.service';
import { database } from '../../services/firebase';
import { ref, get, set } from 'firebase/database';

// Mock Firebase
jest.mock('../../services/firebase', () => ({
  database: {},
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  increment: jest.fn((val) => val),
  onValue: jest.fn(),
  off: jest.fn(),
}));

describe('UnreadService', () => {
  const mockChatId = 'chat123';
  const mockUserId = 'user456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChatUnreadCount', () => {
    it('should return unread count for a chat', async () => {
      const mockSnapshot = {
        val: jest.fn().mockReturnValue(5),
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const count = await UnreadService.getChatUnreadCount(mockChatId, mockUserId);

      expect(count).toBe(5);
      expect(ref).toHaveBeenCalledWith(database, `/chats/${mockChatId}/unreadCount/${mockUserId}`);
      expect(get).toHaveBeenCalled();
    });

    it('should return 0 when no unread count exists', async () => {
      const mockSnapshot = {
        val: jest.fn().mockReturnValue(null),
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const count = await UnreadService.getChatUnreadCount(mockChatId, mockUserId);

      expect(count).toBe(0);
    });

    it('should return 0 on error', async () => {
      (get as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const count = await UnreadService.getChatUnreadCount(mockChatId, mockUserId);

      expect(count).toBe(0);
    });
  });

  describe('getTotalUnreadCount', () => {
    it('should calculate total unread count across all chats', async () => {
      const mockChatsSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        forEach: jest.fn((callback) => {
          const chatSnapshots = [
            {
              val: () => ({
                participantIds: ['user456', 'user789'],
                unreadCount: { user456: 3 },
              }),
            },
            {
              val: () => ({
                participantIds: ['user456', 'user999'],
                unreadCount: { user456: 2 },
              }),
            },
            {
              val: () => ({
                participantIds: ['user789', 'user999'],
                unreadCount: { user789: 5 },
              }),
            },
          ];
          chatSnapshots.forEach(callback);
        }),
      };

      (get as jest.Mock).mockResolvedValue(mockChatsSnapshot);

      const total = await UnreadService.getTotalUnreadCount(mockUserId);

      expect(total).toBe(5); // 3 + 2 (user456 is not in third chat)
    });

    it('should return 0 when no chats exist', async () => {
      const mockSnapshot = {
        exists: jest.fn().mockReturnValue(false),
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const total = await UnreadService.getTotalUnreadCount(mockUserId);

      expect(total).toBe(0);
    });

    it('should handle missing unreadCount field', async () => {
      const mockChatsSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        forEach: jest.fn((callback) => {
          const chatSnapshot = {
            val: () => ({
              participantIds: ['user456', 'user789'],
              // No unreadCount field
            }),
          };
          callback(chatSnapshot);
        }),
      };

      (get as jest.Mock).mockResolvedValue(mockChatsSnapshot);

      const total = await UnreadService.getTotalUnreadCount(mockUserId);

      expect(total).toBe(0);
    });
  });

  describe('markChatAsRead', () => {
    it('should set unread count to 0', async () => {
      await UnreadService.markChatAsRead(mockChatId, mockUserId);

      expect(ref).toHaveBeenCalledWith(database, `/chats/${mockChatId}/unreadCount/${mockUserId}`);
      expect(set).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it('should handle errors gracefully', async () => {
      (set as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      // Should not throw
      await expect(
        UnreadService.markChatAsRead(mockChatId, mockUserId)
      ).resolves.not.toThrow();
    });
  });

  describe('incrementUnreadCount', () => {
    it('should increment unread count by 1', async () => {
      await UnreadService.incrementUnreadCount(mockChatId, mockUserId);

      expect(ref).toHaveBeenCalledWith(database, `/chats/${mockChatId}/unreadCount/${mockUserId}`);
      expect(set).toHaveBeenCalled();
    });
  });

  describe('getAllChatUnreadCounts', () => {
    it('should return map of chat IDs to unread counts', async () => {
      const mockChatsSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        forEach: jest.fn((callback) => {
          const chatSnapshots = [
            {
              key: 'chat1',
              val: () => ({
                participantIds: ['user456', 'user789'],
                unreadCount: { user456: 3 },
              }),
            },
            {
              key: 'chat2',
              val: () => ({
                participantIds: ['user456', 'user999'],
                unreadCount: { user456: 2 },
              }),
            },
          ];
          chatSnapshots.forEach(callback);
        }),
      };

      (get as jest.Mock).mockResolvedValue(mockChatsSnapshot);

      const counts = await UnreadService.getAllChatUnreadCounts(mockUserId);

      expect(counts.size).toBe(2);
      expect(counts.get('chat1')).toBe(3);
      expect(counts.get('chat2')).toBe(2);
    });

    it('should return empty map when no chats exist', async () => {
      const mockSnapshot = {
        exists: jest.fn().mockReturnValue(false),
      };

      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const counts = await UnreadService.getAllChatUnreadCounts(mockUserId);

      expect(counts.size).toBe(0);
    });

    it('should only include chats where user is participant', async () => {
      const mockChatsSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        forEach: jest.fn((callback) => {
          const chatSnapshots = [
            {
              key: 'chat1',
              val: () => ({
                participantIds: ['user456', 'user789'],
                unreadCount: { user456: 3 },
              }),
            },
            {
              key: 'chat2',
              val: () => ({
                participantIds: ['user789', 'user999'], // user456 not in this chat
                unreadCount: { user789: 5 },
              }),
            },
          ];
          chatSnapshots.forEach(callback);
        }),
      };

      (get as jest.Mock).mockResolvedValue(mockChatsSnapshot);

      const counts = await UnreadService.getAllChatUnreadCounts(mockUserId);

      expect(counts.size).toBe(1);
      expect(counts.get('chat1')).toBe(3);
      expect(counts.has('chat2')).toBe(false);
    });
  });
});
