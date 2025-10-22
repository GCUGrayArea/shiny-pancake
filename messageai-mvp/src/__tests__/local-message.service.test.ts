/**
 * Unit tests for local-message.service.ts
 */

import { Message } from '../types';
import {
  saveMessage,
  getMessage,
  getMessagesByChat,
  updateMessageStatus,
  updateMessageDelivery,
  getMessageDeliveryStatus,
  deleteMessage,
  getPendingMessages,
  getMessageByLocalId,
} from '../services/local-message.service';
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

describe('Local Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMessage: Message = {
    id: 'msg123',
    chatId: 'chat123',
    senderId: 'user1',
    type: 'text',
    content: 'Hello, World!',
    timestamp: Date.now(),
    status: 'sent',
    localId: 'local_123',
  };

  const mockImageMessage: Message = {
    id: 'msg456',
    chatId: 'chat123',
    senderId: 'user1',
    type: 'image',
    content: 'https://example.com/image.jpg',
    timestamp: Date.now(),
    status: 'sent',
    metadata: {
      imageWidth: 1920,
      imageHeight: 1080,
      imageSize: 1500000,
    },
  };

  describe('saveMessage', () => {
    it('should save text message successfully', async () => {
      mockExecuteTransaction.mockResolvedValue({ success: true });

      const result = await saveMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(mockExecuteTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sql: expect.stringContaining('INSERT OR REPLACE INTO messages'),
          }),
        ])
      );
    });

    it('should save image message with metadata', async () => {
      mockExecuteTransaction.mockResolvedValue({ success: true });

      const result = await saveMessage(mockImageMessage);

      expect(result.success).toBe(true);
      expect(mockExecuteTransaction).toHaveBeenCalled();
    });

    it('should save message with delivery tracking', async () => {
      mockExecuteTransaction.mockResolvedValue({ success: true });

      const groupMessage: Message = {
        ...mockMessage,
        deliveredTo: ['user2', 'user3'],
        readBy: ['user2'],
      };

      const result = await saveMessage(groupMessage);

      expect(result.success).toBe(true);
      const queries = mockExecuteTransaction.mock.calls[0][0];
      expect(queries.length).toBeGreaterThan(1); // Should include delivery records
    });

    it('should handle transaction errors', async () => {
      mockExecuteTransaction.mockResolvedValue({
        success: false,
        error: 'Transaction failed',
      });

      const result = await saveMessage(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getMessage', () => {
    it('should retrieve message by id', async () => {
      const mockRow = {
        id: mockMessage.id,
        localId: mockMessage.localId,
        chatId: mockMessage.chatId,
        senderId: mockMessage.senderId,
        type: mockMessage.type,
        content: mockMessage.content,
        timestamp: mockMessage.timestamp,
        status: mockMessage.status,
        imageWidth: null,
        imageHeight: null,
        imageSize: null,
      };

      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: mockRow,
      });

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getMessage(mockMessage.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockMessage.id);
      expect(result.data?.content).toBe(mockMessage.content);
    });

    it('should return null when message not found', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getMessage('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should include delivery status', async () => {
      const mockRow = {
        id: mockMessage.id,
        chatId: mockMessage.chatId,
        senderId: mockMessage.senderId,
        type: mockMessage.type,
        content: mockMessage.content,
        timestamp: mockMessage.timestamp,
        status: mockMessage.status,
      };

      const mockDeliveries = [
        { userId: 'user2', delivered: 1, read: 0 },
        { userId: 'user3', delivered: 1, read: 1 },
      ];

      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: mockRow,
      });

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: mockDeliveries,
      });

      const result = await getMessage(mockMessage.id);

      expect(result.success).toBe(true);
      expect(result.data?.deliveredTo).toContain('user2');
      expect(result.data?.deliveredTo).toContain('user3');
      expect(result.data?.readBy).toContain('user3');
    });
  });

  describe('getMessagesByChat', () => {
    it('should retrieve messages with pagination', async () => {
      const mockRows = [
        {
          id: 'msg1',
          chatId: 'chat123',
          senderId: 'user1',
          type: 'text',
          content: 'Message 1',
          timestamp: Date.now(),
          status: 'sent',
        },
        {
          id: 'msg2',
          chatId: 'chat123',
          senderId: 'user2',
          type: 'text',
          content: 'Message 2',
          timestamp: Date.now() - 1000,
          status: 'read',
        },
      ];

      mockExecuteQuery
        .mockResolvedValueOnce({
          success: true,
          data: mockRows,
        })
        .mockResolvedValue({
          success: true,
          data: [],
        });

      const result = await getMessagesByChat('chat123', 50, 0);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        ['chat123', 50, 0]
      );
    });

    it('should use default pagination values', async () => {
      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      await getMessagesByChat('chat123');

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['chat123', 50, 0]
      );
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await updateMessageStatus(mockMessage.id, 'delivered');

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'UPDATE messages SET status = ? WHERE id = ?',
        ['delivered', mockMessage.id]
      );
    });
  });

  describe('updateMessageDelivery', () => {
    it('should update delivery status for user', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await updateMessageDelivery(mockMessage.id, 'user2', true, false);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO message_delivery'),
        [mockMessage.id, 'user2', 1, 0]
      );
    });

    it('should update read status', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await updateMessageDelivery(mockMessage.id, 'user2', true, true);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.any(String),
        [mockMessage.id, 'user2', 1, 1]
      );
    });
  });

  describe('getMessageDeliveryStatus', () => {
    it('should retrieve delivery status', async () => {
      const mockDeliveries = [
        { userId: 'user2', delivered: 1, read: 0 },
        { userId: 'user3', delivered: 1, read: 1 },
      ];

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: mockDeliveries,
      });

      const result = await getMessageDeliveryStatus(mockMessage.id);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].delivered).toBe(true);
      expect(result.data?.[0].read).toBe(false);
      expect(result.data?.[1].read).toBe(true);
    });

    it('should return empty array when no deliveries', async () => {
      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getMessageDeliveryStatus(mockMessage.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await deleteMessage(mockMessage.id);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'DELETE FROM messages WHERE id = ?',
        [mockMessage.id]
      );
    });
  });

  describe('getPendingMessages', () => {
    it('should retrieve messages with sending status', async () => {
      const mockPendingRows = [
        {
          id: 'msg_pending',
          chatId: 'chat123',
          senderId: 'user1',
          type: 'text',
          content: 'Pending message',
          timestamp: Date.now(),
          status: 'sending',
          localId: 'local_pending',
        },
      ];

      mockExecuteQuery
        .mockResolvedValueOnce({
          success: true,
          data: mockPendingRows,
        })
        .mockResolvedValue({
          success: true,
          data: [],
        });

      const result = await getPendingMessages();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].status).toBe('sending');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'sending'")
      );
    });
  });

  describe('getMessageByLocalId', () => {
    it('should retrieve message by local id', async () => {
      const mockRow = {
        id: mockMessage.id,
        localId: mockMessage.localId,
        chatId: mockMessage.chatId,
        senderId: mockMessage.senderId,
        type: mockMessage.type,
        content: mockMessage.content,
        timestamp: mockMessage.timestamp,
        status: mockMessage.status,
      };

      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: mockRow,
      });

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getMessageByLocalId(mockMessage.localId!);

      expect(result.success).toBe(true);
      expect(result.data?.localId).toBe(mockMessage.localId);
      expect(mockExecuteQueryFirst).toHaveBeenCalledWith(
        'SELECT * FROM messages WHERE localId = ?',
        [mockMessage.localId]
      );
    });

    it('should return null when not found by local id', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getMessageByLocalId('nonexistent_local');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});
