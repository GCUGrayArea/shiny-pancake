/**
 * Unit tests for message status utilities
 * Tests status computation logic based on message data
 */

import {
  computeMessageStatus,
  isMessageSending,
  isMessagePersisted,
  isMessageDelivered,
  isMessageRead,
  getDeliveryCount,
  getReadCount,
  hasUserReceivedMessage,
  hasUserReadMessage,
} from '../utils/message-status.utils';
import { Message } from '../types';

describe('message-status.utils', () => {
  const currentUserId = 'user-123';
  const otherUserId = 'user-456';

  // Helper to create a test message
  const createMessage = (overrides: Partial<Message>): Message => ({
    id: 'msg-123',
    chatId: 'chat-123',
    senderId: currentUserId,
    type: 'text',
    content: 'Test message',
    timestamp: Date.now(),
    status: 'sent', // This field is redundant but included for compatibility
    ...overrides,
  });

  describe('computeMessageStatus', () => {
    describe('for messages sent by current user', () => {
      it('should return "sending" when message has no Firebase ID', () => {
        const message = createMessage({ id: '', localId: 'local-123' });
        expect(computeMessageStatus(message, currentUserId)).toBe('sending');
      });

      it('should return "sending" when message has only localId', () => {
        const message = createMessage({ id: '', localId: 'local-123' });
        expect(computeMessageStatus(message, currentUserId)).toBe('sending');
      });

      it('should return "sent" when message has Firebase ID but no delivery confirmation', () => {
        const message = createMessage({ id: 'msg-123' });
        expect(computeMessageStatus(message, currentUserId)).toBe('sent');
      });

      it('should return "delivered" when at least one user has received it', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('delivered');
      });

      it('should return "delivered" when multiple users have received it', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId, 'user-789'],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('delivered');
      });

      it('should return "read" when at least one user has read it', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId],
          readBy: [otherUserId],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('read');
      });

      it('should return "read" when multiple users have read it', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId, 'user-789'],
          readBy: [otherUserId, 'user-789'],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('read');
      });

      it('should return "read" even if only one user read (not all delivered)', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId, 'user-789'],
          readBy: [otherUserId], // Only one user read
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('read');
      });

      it('should prioritize read over delivered status', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [],
          readBy: [otherUserId], // Read without explicit delivery
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('read');
      });
    });

    describe('for messages received from other users', () => {
      it('should return "sent" regardless of delivery arrays', () => {
        const message = createMessage({
          id: 'msg-123',
          senderId: otherUserId, // From other user
          deliveredTo: [currentUserId],
          readBy: [],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('sent');
      });

      it('should return "sent" even if we marked it as read', () => {
        const message = createMessage({
          id: 'msg-123',
          senderId: otherUserId,
          deliveredTo: [currentUserId],
          readBy: [currentUserId],
        });
        expect(computeMessageStatus(message, currentUserId)).toBe('sent');
      });
    });

    describe('without currentUserId', () => {
      it('should compute status based on message data alone', () => {
        const message = createMessage({ id: '', localId: 'local-123' });
        expect(computeMessageStatus(message)).toBe('sending');
      });

      it('should show sent for messages with Firebase ID', () => {
        const message = createMessage({ id: 'msg-123' });
        expect(computeMessageStatus(message)).toBe('sent');
      });

      it('should show delivered when deliveredTo has entries', () => {
        const message = createMessage({
          id: 'msg-123',
          deliveredTo: [otherUserId],
        });
        expect(computeMessageStatus(message)).toBe('delivered');
      });

      it('should show read when readBy has entries', () => {
        const message = createMessage({
          id: 'msg-123',
          readBy: [otherUserId],
        });
        expect(computeMessageStatus(message)).toBe('read');
      });
    });
  });

  describe('isMessageSending', () => {
    it('should return true when message has no Firebase ID', () => {
      const message = createMessage({ id: '', localId: 'local-123' });
      expect(isMessageSending(message)).toBe(true);
    });

    it('should return true when id is empty string', () => {
      const message = createMessage({ id: '' });
      expect(isMessageSending(message)).toBe(true);
    });

    it('should return false when message has Firebase ID', () => {
      const message = createMessage({ id: 'msg-123' });
      expect(isMessageSending(message)).toBe(false);
    });
  });

  describe('isMessagePersisted', () => {
    it('should return true when message has Firebase ID', () => {
      const message = createMessage({ id: 'msg-123' });
      expect(isMessagePersisted(message)).toBe(true);
    });

    it('should return false when message has no ID', () => {
      const message = createMessage({ id: '' });
      expect(isMessagePersisted(message)).toBe(false);
    });

    it('should return false when id is empty string', () => {
      const message = createMessage({ id: '' });
      expect(isMessagePersisted(message)).toBe(false);
    });
  });

  describe('isMessageDelivered', () => {
    it('should return true when deliveredTo has users', () => {
      const message = createMessage({ deliveredTo: [otherUserId] });
      expect(isMessageDelivered(message)).toBe(true);
    });

    it('should return true when deliveredTo has multiple users', () => {
      const message = createMessage({
        deliveredTo: [otherUserId, 'user-789'],
      });
      expect(isMessageDelivered(message)).toBe(true);
    });

    it('should return false when deliveredTo is empty', () => {
      const message = createMessage({ deliveredTo: [] });
      expect(isMessageDelivered(message)).toBe(false);
    });

    it('should return false when deliveredTo is undefined', () => {
      const message = createMessage({ deliveredTo: undefined });
      expect(isMessageDelivered(message)).toBe(false);
    });
  });

  describe('isMessageRead', () => {
    it('should return true when readBy has users', () => {
      const message = createMessage({ readBy: [otherUserId] });
      expect(isMessageRead(message)).toBe(true);
    });

    it('should return true when readBy has multiple users', () => {
      const message = createMessage({ readBy: [otherUserId, 'user-789'] });
      expect(isMessageRead(message)).toBe(true);
    });

    it('should return false when readBy is empty', () => {
      const message = createMessage({ readBy: [] });
      expect(isMessageRead(message)).toBe(false);
    });

    it('should return false when readBy is undefined', () => {
      const message = createMessage({ readBy: undefined });
      expect(isMessageRead(message)).toBe(false);
    });
  });

  describe('getDeliveryCount', () => {
    it('should return count of users who received message', () => {
      const message = createMessage({ deliveredTo: [otherUserId, 'user-789'] });
      expect(getDeliveryCount(message)).toBe(2);
    });

    it('should return 1 for single recipient', () => {
      const message = createMessage({ deliveredTo: [otherUserId] });
      expect(getDeliveryCount(message)).toBe(1);
    });

    it('should return 0 when deliveredTo is empty', () => {
      const message = createMessage({ deliveredTo: [] });
      expect(getDeliveryCount(message)).toBe(0);
    });

    it('should return 0 when deliveredTo is undefined', () => {
      const message = createMessage({ deliveredTo: undefined });
      expect(getDeliveryCount(message)).toBe(0);
    });
  });

  describe('getReadCount', () => {
    it('should return count of users who read message', () => {
      const message = createMessage({ readBy: [otherUserId, 'user-789'] });
      expect(getReadCount(message)).toBe(2);
    });

    it('should return 1 for single reader', () => {
      const message = createMessage({ readBy: [otherUserId] });
      expect(getReadCount(message)).toBe(1);
    });

    it('should return 0 when readBy is empty', () => {
      const message = createMessage({ readBy: [] });
      expect(getReadCount(message)).toBe(0);
    });

    it('should return 0 when readBy is undefined', () => {
      const message = createMessage({ readBy: undefined });
      expect(getReadCount(message)).toBe(0);
    });
  });

  describe('hasUserReceivedMessage', () => {
    it('should return true when user is in deliveredTo', () => {
      const message = createMessage({ deliveredTo: [otherUserId] });
      expect(hasUserReceivedMessage(message, otherUserId)).toBe(true);
    });

    it('should return false when user is not in deliveredTo', () => {
      const message = createMessage({ deliveredTo: [otherUserId] });
      expect(hasUserReceivedMessage(message, 'user-999')).toBe(false);
    });

    it('should return false when deliveredTo is empty', () => {
      const message = createMessage({ deliveredTo: [] });
      expect(hasUserReceivedMessage(message, otherUserId)).toBe(false);
    });

    it('should return false when deliveredTo is undefined', () => {
      const message = createMessage({ deliveredTo: undefined });
      expect(hasUserReceivedMessage(message, otherUserId)).toBe(false);
    });

    it('should handle multiple users in deliveredTo', () => {
      const message = createMessage({
        deliveredTo: [otherUserId, 'user-789', 'user-999'],
      });
      expect(hasUserReceivedMessage(message, 'user-789')).toBe(true);
      expect(hasUserReceivedMessage(message, 'user-999')).toBe(true);
      expect(hasUserReceivedMessage(message, 'user-000')).toBe(false);
    });
  });

  describe('hasUserReadMessage', () => {
    it('should return true when user is in readBy', () => {
      const message = createMessage({ readBy: [otherUserId] });
      expect(hasUserReadMessage(message, otherUserId)).toBe(true);
    });

    it('should return false when user is not in readBy', () => {
      const message = createMessage({ readBy: [otherUserId] });
      expect(hasUserReadMessage(message, 'user-999')).toBe(false);
    });

    it('should return false when readBy is empty', () => {
      const message = createMessage({ readBy: [] });
      expect(hasUserReadMessage(message, otherUserId)).toBe(false);
    });

    it('should return false when readBy is undefined', () => {
      const message = createMessage({ readBy: undefined });
      expect(hasUserReadMessage(message, otherUserId)).toBe(false);
    });

    it('should handle multiple users in readBy', () => {
      const message = createMessage({
        readBy: [otherUserId, 'user-789', 'user-999'],
      });
      expect(hasUserReadMessage(message, 'user-789')).toBe(true);
      expect(hasUserReadMessage(message, 'user-999')).toBe(true);
      expect(hasUserReadMessage(message, 'user-000')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle message with only localId (no Firebase ID)', () => {
      const message = createMessage({
        id: '',
        localId: 'local-123',
        deliveredTo: [otherUserId],
        readBy: [otherUserId],
      });
      // Should be sending because no Firebase ID, regardless of arrays
      expect(computeMessageStatus(message, currentUserId)).toBe('sending');
    });

    it('should handle message with empty arrays', () => {
      const message = createMessage({
        id: 'msg-123',
        deliveredTo: [],
        readBy: [],
      });
      expect(computeMessageStatus(message, currentUserId)).toBe('sent');
    });

    it('should handle message with readBy but no deliveredTo', () => {
      const message = createMessage({
        id: 'msg-123',
        readBy: [otherUserId],
      });
      // Read implies delivered
      expect(computeMessageStatus(message, currentUserId)).toBe('read');
    });
  });
});

