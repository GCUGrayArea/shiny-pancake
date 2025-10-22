/**
 * Message Queue Service Unit Tests
 */

import {
  enqueueMessage,
  dequeueMessages,
  processQueue,
  retryFailedMessages,
  markMessageSending,
  markMessageSent,
  markMessageFailed,
  clearRetryState,
  getRetryState,
} from '../services/message-queue.service';
import * as localMessageService from '../services/local-message.service';
import * as firebaseMessageService from '../services/firebase-message.service';
import { Message } from '../types';

// Mock dependencies
jest.mock('../services/local-message.service');
jest.mock('../services/firebase-message.service');

describe('Message Queue Service', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    localId: 'local-1',
    chatId: 'chat-1',
    senderId: 'user-1',
    type: 'text',
    content: 'Test message',
    timestamp: Date.now(),
    status: 'sending',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRetryState();
  });

  describe('enqueueMessage', () => {
    it('should enqueue message with sending status', async () => {
      const saveMessageMock = jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: true });

      const result = await enqueueMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(saveMessageMock).toHaveBeenCalledWith({
        ...mockMessage,
        status: 'sending',
      });
    });

    it('should initialize retry state', async () => {
      jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: true });

      await enqueueMessage(mockMessage);

      const retryState = getRetryState(mockMessage.localId!);
      expect(retryState).toBeDefined();
      expect(retryState?.attempts).toBe(0);
    });

    it('should handle save failure', async () => {
      jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: false, error: 'Save failed' });

      const result = await enqueueMessage(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Save failed');
    });
  });

  describe('dequeueMessages', () => {
    it('should retrieve pending messages', async () => {
      const pendingMessages = [mockMessage];
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: pendingMessages });

      const result = await dequeueMessages();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pendingMessages);
    });

    it('should handle retrieval failure', async () => {
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: false, error: 'Retrieval failed' });

      const result = await dequeueMessages();

      expect(result.success).toBe(false);
    });
  });

  describe('processQueue', () => {
    it('should send pending messages successfully', async () => {
      const pendingMessages = [mockMessage];
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: pendingMessages });
      jest
        .spyOn(firebaseMessageService, 'sendMessageToFirebase')
        .mockResolvedValue({ success: true, data: 'server-id-1' });
      jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: true });

      const result = await processQueue();

      expect(result.success).toBe(true);
      expect(result.data?.sent).toBe(1);
      expect(result.data?.failed).toBe(0);
    });

    it('should handle send failures with retry', async () => {
      const pendingMessages = [mockMessage];
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: pendingMessages });
      jest
        .spyOn(firebaseMessageService, 'sendMessageToFirebase')
        .mockResolvedValue({ success: false, error: 'Network error' });

      const result = await processQueue();

      expect(result.success).toBe(true);
      expect(result.data?.failed).toBe(1);

      // Check retry state updated
      const retryState = getRetryState(mockMessage.localId!);
      expect(retryState?.attempts).toBe(1);
    });

    it('should skip messages not ready for retry', async () => {
      const futureMessage = { ...mockMessage };
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: [futureMessage] });

      // Set retry state with future nextRetry
      await enqueueMessage(futureMessage);
      await markMessageFailed(futureMessage.localId!, 'Error');

      const result = await processQueue();

      expect(result.data?.sent).toBe(0);
      expect(result.data?.failed).toBe(0);
    });

    it('should handle no pending messages', async () => {
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: [] });

      const result = await processQueue();

      expect(result.success).toBe(true);
      expect(result.data?.sent).toBe(0);
      expect(result.data?.failed).toBe(0);
    });
  });

  describe('markMessageSent', () => {
    it('should update message with server ID and status', async () => {
      const localId = 'local-1';
      const serverId = 'server-1';

      jest
        .spyOn(localMessageService, 'getMessageByLocalId')
        .mockResolvedValue({ success: true, data: mockMessage });
      jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: true });

      const result = await markMessageSent(localId, serverId);

      expect(result.success).toBe(true);
      expect(localMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: serverId,
          status: 'sent',
        })
      );
    });

    it('should clear retry state on success', async () => {
      const localId = 'local-1';
      const serverId = 'server-1';

      await enqueueMessage(mockMessage);

      jest
        .spyOn(localMessageService, 'getMessageByLocalId')
        .mockResolvedValue({ success: true, data: mockMessage });
      jest
        .spyOn(localMessageService, 'saveMessage')
        .mockResolvedValue({ success: true });

      await markMessageSent(localId, serverId);

      expect(getRetryState(localId)).toBeUndefined();
    });

    it('should handle message not found', async () => {
      jest
        .spyOn(localMessageService, 'getMessageByLocalId')
        .mockResolvedValue({ success: false, error: 'Not found' });

      const result = await markMessageSent('local-1', 'server-1');

      expect(result.success).toBe(false);
    });
  });

  describe('markMessageFailed', () => {
    it('should increment retry attempts', async () => {
      const localId = 'local-1';
      await enqueueMessage(mockMessage);

      await markMessageFailed(localId, 'Network error');

      const retryState = getRetryState(localId);
      expect(retryState?.attempts).toBe(1);
    });

    it('should apply exponential backoff', async () => {
      const localId = 'local-1';
      await enqueueMessage(mockMessage);

      const before = Date.now();
      await markMessageFailed(localId, 'Network error');
      const after = Date.now();

      const retryState = getRetryState(localId);
      // First retry should be ~1s in future
      expect(retryState?.nextRetry).toBeGreaterThan(before);
      expect(retryState?.nextRetry).toBeLessThan(after + 2000);
    });

    it('should clear retry state after max retries', async () => {
      const localId = 'local-1';
      await enqueueMessage(mockMessage);

      // Exhaust retries
      for (let i = 0; i < 5; i++) {
        await markMessageFailed(localId, 'Network error');
      }

      expect(getRetryState(localId)).toBeUndefined();
    });
  });

  describe('retryFailedMessages', () => {
    it('should call processQueue', async () => {
      jest
        .spyOn(localMessageService, 'getPendingMessages')
        .mockResolvedValue({ success: true, data: [] });

      const result = await retryFailedMessages();

      expect(result.success).toBe(true);
      expect(localMessageService.getPendingMessages).toHaveBeenCalled();
    });
  });

  describe('markMessageSending', () => {
    it('should update message status to sending', async () => {
      jest
        .spyOn(localMessageService, 'getMessageByLocalId')
        .mockResolvedValue({ success: true, data: mockMessage });
      jest
        .spyOn(localMessageService, 'updateMessageStatus')
        .mockResolvedValue({ success: true });

      const result = await markMessageSending('local-1');

      expect(result.success).toBe(true);
      expect(localMessageService.updateMessageStatus).toHaveBeenCalledWith(
        mockMessage.id,
        'sending'
      );
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay exponentially', async () => {
      const localId = 'local-1';
      await enqueueMessage(mockMessage);

      const delays: number[] = [];

      for (let i = 0; i < 4; i++) {
        const before = Date.now();
        await markMessageFailed(localId, 'Error');
        const retryState = getRetryState(localId);
        const delay = retryState!.nextRetry - before;
        delays.push(delay);
      }

      // Verify exponential growth: 1s, 2s, 4s, 8s
      expect(delays[0]).toBeLessThan(1500);
      expect(delays[1]).toBeGreaterThan(1500);
      expect(delays[1]).toBeLessThan(3000);
      expect(delays[2]).toBeGreaterThan(3000);
      expect(delays[2]).toBeLessThan(5000);
      expect(delays[3]).toBeGreaterThan(7000);
    });
  });
});
