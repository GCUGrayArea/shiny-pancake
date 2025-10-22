/**
 * Integration Tests: Message Delivery and Read Status
 * Tests the complete flow of message status: sending → sent → delivered → read
 *
 * NO MOCKS - Uses real Firebase RTDB and SQLite
 */

import {
  FirebaseTestHelper,
  SQLiteTestHelper,
  createTestUser,
  createTestChat,
  createTestMessage,
  waitFor,
  sleep,
} from './setup';

import type { Message } from '../../types';
import { computeMessageStatus } from '../../utils/message-status.utils';

// Import services - NO MOCKS
import * as FirebaseMessageService from '../../services/firebase-message.service';
import * as FirebaseChatService from '../../services/firebase-chat.service';
import * as LocalMessageService from '../../services/local-message.service';
import * as LocalChatService from '../../services/local-chat.service';

describe('Message Delivery and Read Status Integration Tests', () => {
  let firebaseHelper: FirebaseTestHelper;
  let sqliteHelper: SQLiteTestHelper;

  beforeAll(async () => {
    firebaseHelper = new FirebaseTestHelper();
    sqliteHelper = new SQLiteTestHelper();
    await sqliteHelper.init();
  });

  afterAll(async () => {
    await firebaseHelper.cleanup();
    await sqliteHelper.cleanup();
  });

  describe('Status Progression: sending → sent → delivered → read', () => {
    it('should progress through all status states', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      
      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 1. Create message (sending state - no Firebase ID)
      const localMessage: Message = {
        id: '', // No Firebase ID yet
        localId: `local-${Date.now()}`,
        chatId: chat.id,
        senderId: sender.uid,
        type: 'text',
        content: 'Test message for status flow',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Save to local (simulating optimistic UI)
      await LocalMessageService.saveMessage(localMessage);

      // Verify status is "sending" (no Firebase ID)
      let status = computeMessageStatus(localMessage, sender.uid);
      expect(status).toBe('sending');

      // 2. Send to Firebase (sent state)
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(localMessage);
      expect(sendResult.success).toBe(true);
      
      const firebaseId = sendResult.data!;
      const sentMessage: Message = {
        ...localMessage,
        id: firebaseId,
      };

      // Update local with Firebase ID
      await LocalMessageService.saveMessage(sentMessage);

      // Verify status is now "sent" (has Firebase ID, no delivery)
      status = computeMessageStatus(sentMessage, sender.uid);
      expect(status).toBe('sent');

      // 3. Recipient marks as delivered
      await FirebaseMessageService.markMessageDelivered(
        firebaseId,
        chat.id,
        recipient.uid
      );

      // Wait for Firebase to update
      await sleep(1000);

      // Fetch updated message from Firebase
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      expect(messagesResult.success).toBe(true);
      
      const deliveredMessage = messagesResult.data!.find(m => m.id === firebaseId)!;
      expect(deliveredMessage).toBeDefined();
      expect(deliveredMessage.deliveredTo).toContain(recipient.uid);

      // Verify status is now "delivered"
      status = computeMessageStatus(deliveredMessage, sender.uid);
      expect(status).toBe('delivered');

      // 4. Recipient marks as read
      await FirebaseMessageService.markMessageRead(
        firebaseId,
        chat.id,
        recipient.uid
      );

      // Wait for Firebase to update
      await sleep(1000);

      // Fetch updated message from Firebase
      const messagesResult2 = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      expect(messagesResult2.success).toBe(true);
      
      const readMessage = messagesResult2.data!.find(m => m.id === firebaseId)!;
      expect(readMessage).toBeDefined();
      expect(readMessage.readBy).toContain(recipient.uid);

      // Verify status is now "read"
      status = computeMessageStatus(readMessage, sender.uid);
      expect(status).toBe('read');
    });
  });

  describe('Delivery Tracking', () => {
    it('should track delivery to single recipient', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);

      const messageId = sendResult.data!;

      // Mark as delivered
      const deliveryResult = await FirebaseMessageService.markMessageDelivered(
        messageId,
        chat.id,
        recipient.uid
      );
      expect(deliveryResult.success).toBe(true);

      // Wait for update
      await sleep(1000);

      // Verify delivery tracking
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.deliveredTo).toBeDefined();
      expect(updatedMessage.deliveredTo).toContain(recipient.uid);
      expect(updatedMessage.deliveredTo?.length).toBe(1);
    });

    it('should track delivery to multiple recipients in group chat', async () => {
      const sender = createTestUser();
      const recipient1 = createTestUser();
      const recipient2 = createTestUser();
      const recipient3 = createTestUser();
      
      const chat = createTestChat({
        type: 'group',
        participantIds: [sender.uid, recipient1.uid, recipient2.uid, recipient3.uid],
      });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);

      const messageId = sendResult.data!;

      // Recipients mark as delivered one by one
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient1.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient2.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient3.uid);
      await sleep(1000);

      // Verify all deliveries tracked
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.deliveredTo).toBeDefined();
      expect(updatedMessage.deliveredTo).toContain(recipient1.uid);
      expect(updatedMessage.deliveredTo).toContain(recipient2.uid);
      expect(updatedMessage.deliveredTo).toContain(recipient3.uid);
      expect(updatedMessage.deliveredTo?.length).toBe(3);

      // Status should be "delivered" when at least one recipient has it
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('delivered');
    });

    it('should not duplicate delivery tracking for same user', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Mark as delivered multiple times by same user
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient.uid);
      await sleep(1000);

      // Verify no duplicates
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.deliveredTo?.length).toBe(1);
      expect(updatedMessage.deliveredTo).toEqual([recipient.uid]);
    });
  });

  describe('Read Receipt Tracking', () => {
    it('should track read receipt for single recipient', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Mark as read (which also implies delivered)
      const readResult = await FirebaseMessageService.markMessageRead(
        messageId,
        chat.id,
        recipient.uid
      );
      expect(readResult.success).toBe(true);

      // Wait for update
      await sleep(1000);

      // Verify read tracking
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.readBy).toBeDefined();
      expect(updatedMessage.readBy).toContain(recipient.uid);
      expect(updatedMessage.readBy?.length).toBe(1);

      // Status should be "read"
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('read');
    });

    it('should track read receipts for multiple recipients', async () => {
      const sender = createTestUser();
      const recipient1 = createTestUser();
      const recipient2 = createTestUser();
      
      const chat = createTestChat({
        type: 'group',
        participantIds: [sender.uid, recipient1.uid, recipient2.uid],
      });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Both recipients mark as read
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient1.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient2.uid);
      await sleep(1000);

      // Verify both read receipts tracked
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.readBy).toBeDefined();
      expect(updatedMessage.readBy).toContain(recipient1.uid);
      expect(updatedMessage.readBy).toContain(recipient2.uid);
      expect(updatedMessage.readBy?.length).toBe(2);

      // Status should be "read" when at least one recipient read it
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('read');
    });

    it('should not duplicate read tracking for same user', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Mark as read multiple times by same user
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);
      await sleep(500);
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);
      await sleep(1000);

      // Verify no duplicates
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      expect(updatedMessage.readBy?.length).toBe(1);
      expect(updatedMessage.readBy).toEqual([recipient.uid]);
    });
  });

  describe('Real-time Status Updates', () => {
    it('should receive status updates via onChildChanged listener', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Subscribe to message updates
      const receivedUpdates: Message[] = [];
      const unsubscribe = FirebaseMessageService.subscribeToMessageUpdates(
        chat.id,
        (updatedMessage) => {
          receivedUpdates.push(updatedMessage);
        }
      );

      // Wait for subscription to be active
      await sleep(500);

      // Mark as delivered
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient.uid);

      // Wait for update event
      await waitFor(() => receivedUpdates.length > 0, 5000);

      expect(receivedUpdates.length).toBeGreaterThan(0);
      const deliveryUpdate = receivedUpdates[0];
      expect(deliveryUpdate.id).toBe(messageId);
      expect(deliveryUpdate.deliveredTo).toContain(recipient.uid);

      // Mark as read
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);

      // Wait for second update
      await waitFor(() => receivedUpdates.length > 1, 5000);

      expect(receivedUpdates.length).toBeGreaterThan(1);
      const readUpdate = receivedUpdates[receivedUpdates.length - 1];
      expect(readUpdate.id).toBe(messageId);
      expect(readUpdate.readBy).toContain(recipient.uid);

      unsubscribe();
    });
  });

  describe('Status for Received Messages', () => {
    it('should show received messages as "sent" from recipient perspective', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Sender sends message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Recipient marks as delivered and read
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient.uid);
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);
      await sleep(1000);

      // Fetch message
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const receivedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      // From recipient's perspective, status should be "sent" (they received it)
      const recipientStatus = computeMessageStatus(receivedMessage, recipient.uid);
      expect(recipientStatus).toBe('sent');

      // From sender's perspective, status should be "read"
      const senderStatus = computeMessageStatus(receivedMessage, sender.uid);
      expect(senderStatus).toBe('read');
    });
  });

  describe('Edge Cases', () => {
    it('should handle read without explicit delivery', async () => {
      const sender = createTestUser();
      const recipient = createTestUser();
      const chat = createTestChat({ participantIds: [sender.uid, recipient.uid] });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Mark as read WITHOUT marking as delivered first
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient.uid);
      await sleep(1000);

      // Fetch message
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      // Status should be "read" (read implies delivered)
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('read');

      expect(updatedMessage.readBy).toContain(recipient.uid);
    });

    it('should handle partial delivery in group chat', async () => {
      const sender = createTestUser();
      const recipient1 = createTestUser();
      const recipient2 = createTestUser();
      const recipient3 = createTestUser();
      
      const chat = createTestChat({
        type: 'group',
        participantIds: [sender.uid, recipient1.uid, recipient2.uid, recipient3.uid],
      });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // Only recipient1 marks as delivered
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient1.uid);
      await sleep(1000);

      // Fetch message
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      // Should show as "delivered" even though only one recipient has it
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('delivered');

      expect(updatedMessage.deliveredTo?.length).toBe(1);
    });

    it('should handle partial read in group chat', async () => {
      const sender = createTestUser();
      const recipient1 = createTestUser();
      const recipient2 = createTestUser();
      
      const chat = createTestChat({
        type: 'group',
        participantIds: [sender.uid, recipient1.uid, recipient2.uid],
      });
      const message = createTestMessage(chat.id, sender.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      const messageId = sendResult.data!;

      // recipient1 delivers and reads, recipient2 only delivers
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient1.uid);
      await FirebaseMessageService.markMessageRead(messageId, chat.id, recipient1.uid);
      await FirebaseMessageService.markMessageDelivered(messageId, chat.id, recipient2.uid);
      await sleep(1000);

      // Fetch message
      const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id);
      const updatedMessage = messagesResult.data!.find(m => m.id === messageId)!;

      // Should show as "read" even though only one recipient read it
      const status = computeMessageStatus(updatedMessage, sender.uid);
      expect(status).toBe('read');

      expect(updatedMessage.deliveredTo?.length).toBe(2);
      expect(updatedMessage.readBy?.length).toBe(1);
    });
  });
});

