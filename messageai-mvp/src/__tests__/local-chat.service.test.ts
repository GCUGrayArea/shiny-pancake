/**
 * Unit tests for local-chat.service.ts
 */

import { Chat } from '../types';
import {
  saveChat,
  getChat,
  getAllChats,
  updateChatLastMessage,
  deleteChat,
  addParticipant,
  removeParticipant,
  getUnreadCount,
  updateUnreadCount,
  resetUnreadCount,
} from '../services/local-chat.service';
import * as dbService from '../services/database.service';

// Mock database service
jest.mock('../services/database.service');

const mockExecuteTransaction = dbService.executeTransaction as jest.MockedFunction<
  typeof dbService.executeTransaction
>;
const mockExecuteQuery = dbService.executeQuery as jest.MockedFunction<
  typeof dbService.executeQuery
>;
const mockExecuteQueryFirst = dbService.executeQueryFirst as jest.MockedFunction<
  typeof dbService.executeQueryFirst
>;
const mockExecuteUpdate = dbService.executeUpdate as jest.MockedFunction<
  typeof dbService.executeUpdate
>;

describe('Local Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockChat: Chat = {
    id: 'chat123',
    type: '1:1',
    participantIds: ['user1', 'user2'],
    createdAt: Date.now(),
    lastMessage: {
      content: 'Hello',
      senderId: 'user1',
      timestamp: Date.now(),
      type: 'text',
    },
    unreadCounts: {
      user1: 0,
      user2: 5,
    },
  };

  describe('saveChat', () => {
    it('should save chat with participants', async () => {
      mockExecuteTransaction.mockResolvedValue({ success: true });

      const result = await saveChat(mockChat);

      expect(result.success).toBe(true);
      expect(mockExecuteTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sql: expect.stringContaining('INSERT OR REPLACE INTO chats'),
          }),
          expect.objectContaining({
            sql: 'DELETE FROM chat_participants WHERE chatId = ?',
          }),
        ])
      );
    });

    it('should save group chat with name', async () => {
      mockExecuteTransaction.mockResolvedValue({ success: true });

      const groupChat: Chat = {
        ...mockChat,
        type: 'group',
        name: 'Test Group',
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = await saveChat(groupChat);

      expect(result.success).toBe(true);
    });

    it('should handle transaction errors', async () => {
      mockExecuteTransaction.mockResolvedValue({
        success: false,
        error: 'Transaction failed',
      });

      const result = await saveChat(mockChat);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getChat', () => {
    it('should retrieve chat with participants', async () => {
      const mockChatRow = {
        id: mockChat.id,
        type: mockChat.type,
        name: null,
        createdAt: mockChat.createdAt,
        lastMessageContent: mockChat.lastMessage?.content,
        lastMessageSenderId: mockChat.lastMessage?.senderId,
        lastMessageTimestamp: mockChat.lastMessage?.timestamp,
        lastMessageType: mockChat.lastMessage?.type,
      };

      const mockParticipantRows = [
        { userId: 'user1', unreadCount: 0 },
        { userId: 'user2', unreadCount: 5 },
      ];

      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: mockChatRow,
      });

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: mockParticipantRows,
      });

      const result = await getChat(mockChat.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockChat.id);
      expect(result.data?.participantIds).toHaveLength(2);
      expect(result.data?.unreadCounts?.user2).toBe(5);
    });

    it('should return null when chat not found', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getChat('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle query errors', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: false,
        error: 'Query error',
      });

      const result = await getChat(mockChat.id);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getAllChats', () => {
    it('should retrieve all chats sorted by last message', async () => {
      const mockChatRows = [
        {
          id: 'chat1',
          type: '1:1',
          name: null,
          createdAt: Date.now() - 1000,
          lastMessageContent: 'Recent message',
          lastMessageSenderId: 'user1',
          lastMessageTimestamp: Date.now(),
          lastMessageType: 'text',
        },
        {
          id: 'chat2',
          type: 'group',
          name: 'Group Chat',
          createdAt: Date.now() - 2000,
          lastMessageContent: 'Older message',
          lastMessageSenderId: 'user2',
          lastMessageTimestamp: Date.now() - 500,
          lastMessageType: 'text',
        },
      ];

      mockExecuteQuery
        .mockResolvedValueOnce({
          success: true,
          data: mockChatRows,
        })
        .mockResolvedValue({
          success: true,
          data: [{ userId: 'user1', unreadCount: 0 }],
        });

      const result = await getAllChats();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c.lastMessageTimestamp DESC')
      );
    });

    it('should handle empty chat list', async () => {
      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getAllChats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('updateChatLastMessage', () => {
    it('should update last message', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const lastMessage = {
        content: 'New message',
        senderId: 'user1',
        timestamp: Date.now(),
        type: 'text' as const,
      };

      const result = await updateChatLastMessage(mockChat.id, lastMessage);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chats'),
        [
          lastMessage.content,
          lastMessage.senderId,
          lastMessage.timestamp,
          lastMessage.type,
          mockChat.id,
        ]
      );
    });
  });

  describe('deleteChat', () => {
    it('should delete chat successfully', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await deleteChat(mockChat.id);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'DELETE FROM chats WHERE id = ?',
        [mockChat.id]
      );
    });
  });

  describe('addParticipant', () => {
    it('should add participant to chat', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await addParticipant(mockChat.id, 'user3');

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO chat_participants'),
        [mockChat.id, 'user3']
      );
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from chat', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await removeParticipant(mockChat.id, 'user2');

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'DELETE FROM chat_participants WHERE chatId = ? AND userId = ?',
        [mockChat.id, 'user2']
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count for user in chat', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: { unreadCount: 5 },
      });

      const result = await getUnreadCount(mockChat.id, 'user2');

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should return 0 when no unread count found', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getUnreadCount(mockChat.id, 'user1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('updateUnreadCount', () => {
    it('should update unread count', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await updateUnreadCount(mockChat.id, 'user2', 10);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_participants'),
        [10, mockChat.id, 'user2']
      );
    });
  });

  describe('resetUnreadCount', () => {
    it('should reset unread count to zero', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await resetUnreadCount(mockChat.id, 'user2');

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.any(String),
        [0, mockChat.id, 'user2']
      );
    });
  });
});
