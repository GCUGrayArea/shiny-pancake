/**
 * Group Chat Integration Tests
 * End-to-end tests for group chat creation, messaging, and delivery tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FirebaseHelper } from './emulator-setup';
import { FirebaseChatService } from '@/services/firebase-chat.service';
import { FirebaseMessageService } from '@/services/firebase-message.service';
import { FirebaseUserService } from '@/services/firebase-user.service';
import { SyncService } from '@/services/sync.service';
import { sqliteHelper } from './setup';
import { Chat, Message, User } from '@/types';

describe('Group Chat Integration', () => {
  let firebaseHelper: FirebaseHelper;
  let user1: User;
  let user2: User;
  let user3: User;

  beforeAll(async () => {
    firebaseHelper = new FirebaseHelper();
    await firebaseHelper.setup();
  });

  afterAll(async () => {
    await firebaseHelper.cleanup();
  });

  beforeEach(async () => {
    await firebaseHelper.clearAllData();

    // Create test users
    user1 = await firebaseHelper.createTestUser('user1@test.com', 'User One');
    user2 = await firebaseHelper.createTestUser('user2@test.com', 'User Two');
    user3 = await firebaseHelper.createTestUser('user3@test.com', 'User Three');
  });

  describe('Group Chat Creation', () => {
    it('should create group chat with multiple participants', async () => {
      const groupChat: Chat = {
        id: 'group-test-1',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Test Group Chat',
        createdAt: Date.now(),
      };

      // Create group chat in Firebase
      const createResult = await FirebaseChatService.createChatInFirebase(groupChat);
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBe(groupChat.id);

      // Verify chat was created in Firebase
      const firebaseChat = await FirebaseChatService.getChatFromFirebase(groupChat.id);
      expect(firebaseChat.success).toBe(true);
      expect(firebaseChat.data?.type).toBe('group');
      expect(firebaseChat.data?.name).toBe('Test Group Chat');
      expect(firebaseChat.data?.participantIds).toEqual({
        [user1.uid]: true,
        [user2.uid]: true,
        [user3.uid]: true,
      });
    });

    it('should sync group chat to local database', async () => {
      const groupChat: Chat = {
        id: 'group-test-2',
        type: 'group',
        participantIds: [user1.uid, user2.uid],
        name: 'Sync Test Group',
        createdAt: Date.now(),
      };

      // Create group chat in Firebase
      await FirebaseChatService.createChatInFirebase(groupChat);

      // Sync to local database
      await SyncService.syncChatToLocal(groupChat);

      // Verify chat exists in local database
      const localChat = await sqliteHelper.getChat(groupChat.id);
      expect(localChat).toBeTruthy();
      expect(localChat?.type).toBe('group');
      expect(localChat?.name).toBe('Sync Test Group');
    });

    it('should generate group name when not provided', async () => {
      const participants = [user1, user2, user3];
      const groupChat: Chat = {
        id: 'group-test-3',
        type: 'group',
        participantIds: participants.map(p => p.uid),
        createdAt: Date.now(),
        // No name provided - should auto-generate
      };

      const createResult = await FirebaseChatService.createChatInFirebase(groupChat);
      expect(createResult.success).toBe(true);

      const firebaseChat = await FirebaseChatService.getChatFromFirebase(groupChat.id);
      expect(firebaseChat.success).toBe(true);
      expect(firebaseChat.data?.name).toBe('User One, User Two, +1 others');
    });
  });

  describe('Group Messaging', () => {
    let groupChat: Chat;

    beforeEach(async () => {
      groupChat = {
        id: 'group-messaging-test',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Messaging Test Group',
        createdAt: Date.now(),
      };

      await FirebaseChatService.createChatInFirebase(groupChat);
      await SyncService.syncChatToLocal(groupChat);
    });

    it('should send message to group chat', async () => {
      const message: Message = {
        id: 'msg-1',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Hello everyone!',
        timestamp: Date.now(),
        status: 'sending',
      };

      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);
      expect(sendResult.data).toBeTruthy();

      // Verify message exists in Firebase
      const firebaseMessages = await FirebaseMessageService.getMessagesFromFirebase(groupChat.id);
      expect(firebaseMessages.success).toBe(true);
      expect(firebaseMessages.data?.length).toBe(1);
      expect(firebaseMessages.data?.[0].content).toBe('Hello everyone!');
    });

    it('should sync group messages to local database', async () => {
      const message: Message = {
        id: 'msg-2',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Group message test',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Send message to Firebase
      await FirebaseMessageService.sendMessageToFirebase(message);

      // Sync to local database
      await SyncService.syncMessageToLocal(message);

      // Verify message exists in local database
      const localMessages = await sqliteHelper.getMessages(groupChat.id);
      expect(localMessages.length).toBe(1);
      expect(localMessages[0].content).toBe('Group message test');
      expect(localMessages[0].senderId).toBe(user1.uid);
    });

    it('should track message delivery to group participants', async () => {
      const message: Message = {
        id: 'msg-3',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Delivery test',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Send message
      await FirebaseMessageService.sendMessageToFirebase(message);

      // Mark as delivered to user2
      await FirebaseMessageService.markMessageDelivered(message.id, groupChat.id, user2.uid);

      // Verify delivery tracking
      const deliveryStatus = await FirebaseMessageService.getMessageDeliveryFromFirebase(message.id, groupChat.id);
      expect(deliveryStatus).toEqual({
        [user2.uid]: { delivered: true, read: false }
      });
    });

    it('should track read receipts in group chat', async () => {
      const message: Message = {
        id: 'msg-4',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Read receipt test',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Send message
      await FirebaseMessageService.sendMessageToFirebase(message);

      // Mark as delivered to all participants
      await FirebaseMessageService.markMessageDelivered(message.id, groupChat.id, user2.uid);
      await FirebaseMessageService.markMessageDelivered(message.id, groupChat.id, user3.uid);

      // Mark as read by user2
      await FirebaseMessageService.markMessageRead(message.id, groupChat.id, user2.uid);

      // Verify read tracking
      const deliveryStatus = await FirebaseMessageService.getMessageDeliveryFromFirebase(message.id, groupChat.id);
      expect(deliveryStatus).toEqual({
        [user2.uid]: { delivered: true, read: true },
        [user3.uid]: { delivered: true, read: false }
      });
    });
  });

  describe('Group Chat Real-time Updates', () => {
    let groupChat: Chat;

    beforeEach(async () => {
      groupChat = {
        id: 'realtime-test',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Real-time Test Group',
        createdAt: Date.now(),
      };

      await FirebaseChatService.createChatInFirebase(groupChat);
    });

    it('should receive new messages in real-time', async () => {
      const message: Message = {
        id: 'realtime-msg-1',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Real-time message',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Set up message listener
      const receivedMessages: Message[] = [];
      const unsubscribe = FirebaseMessageService.subscribeToMessages(groupChat.id, (newMessage) => {
        receivedMessages.push(newMessage);
      });

      // Send message
      await FirebaseMessageService.sendMessageToFirebase(message);

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].content).toBe('Real-time message');
      expect(receivedMessages[0].senderId).toBe(user1.uid);

      unsubscribe();
    });

    it('should receive status updates in real-time', async () => {
      const message: Message = {
        id: 'status-update-msg',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Status update test',
        timestamp: Date.now(),
        status: 'sending',
      };

      // Send message first
      await FirebaseMessageService.sendMessageToFirebase(message);

      // Set up status update listener
      const statusUpdates: any[] = [];
      const unsubscribe = FirebaseMessageService.subscribeToMessageUpdates(groupChat.id, (update) => {
        statusUpdates.push(update);
      });

      // Mark message as delivered
      await FirebaseMessageService.markMessageDelivered(message.id, groupChat.id, user2.uid);

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusUpdates.length).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe('Group Chat Edge Cases', () => {
    it('should handle user leaving group', async () => {
      const groupChat: Chat = {
        id: 'leave-group-test',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Leave Test Group',
        createdAt: Date.now(),
      };

      await FirebaseChatService.createChatInFirebase(groupChat);

      // Simulate user2 leaving group (remove from participantIds)
      const updatedChat = {
        ...groupChat,
        participantIds: [user1.uid, user3.uid], // user2 removed
      };

      await FirebaseChatService.updateChatInFirebase(groupChat.id, {
        participantIds: updatedChat.participantIds,
      });

      // Verify user2 is no longer a participant
      const firebaseChat = await FirebaseChatService.getChatFromFirebase(groupChat.id);
      expect(firebaseChat.success).toBe(true);
      expect(firebaseChat.data?.participantIds).toEqual({
        [user1.uid]: true,
        [user3.uid]: true,
      });
    });

    it('should handle empty group chat (all users left)', async () => {
      const groupChat: Chat = {
        id: 'empty-group-test',
        type: 'group',
        participantIds: [user1.uid],
        name: 'Empty Group',
        createdAt: Date.now(),
      };

      const createResult = await FirebaseChatService.createChatInFirebase(groupChat);
      expect(createResult.success).toBe(true);

      // Try to send message to empty group
      const message: Message = {
        id: 'empty-group-msg',
        chatId: groupChat.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Message to empty group',
        timestamp: Date.now(),
        status: 'sending',
      };

      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true); // Should still work for the remaining user
    });

    it('should handle duplicate group creation prevention', async () => {
      const groupChat: Chat = {
        id: 'duplicate-group-1',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Duplicate Test',
        createdAt: Date.now(),
      };

      // Create group first time
      const createResult1 = await FirebaseChatService.createChatInFirebase(groupChat);
      expect(createResult1.success).toBe(true);

      // Try to create same group again (should succeed as different ID)
      const duplicateGroup: Chat = {
        ...groupChat,
        id: 'duplicate-group-2',
      };

      const createResult2 = await FirebaseChatService.createChatInFirebase(duplicateGroup);
      expect(createResult2.success).toBe(true);

      // Both groups should exist
      const chat1 = await FirebaseChatService.getChatFromFirebase(groupChat.id);
      const chat2 = await FirebaseChatService.getChatFromFirebase(duplicateGroup.id);

      expect(chat1.success).toBe(true);
      expect(chat2.success).toBe(true);
    });
  });

  describe('Group Chat Performance', () => {
    it('should handle rapid message sending in group', async () => {
      const groupChat: Chat = {
        id: 'performance-test',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
        name: 'Performance Test Group',
        createdAt: Date.now(),
      };

      await FirebaseChatService.createChatInFirebase(groupChat);

      // Send multiple messages rapidly
      const messages: Message[] = [];
      for (let i = 0; i < 10; i++) {
        const message: Message = {
          id: `perf-msg-${i}`,
          chatId: groupChat.id,
          senderId: user1.uid,
          type: 'text',
          content: `Rapid message ${i}`,
          timestamp: Date.now() + i,
          status: 'sending',
        };
        messages.push(message);
      }

      // Send all messages
      const sendPromises = messages.map(msg =>
        FirebaseMessageService.sendMessageToFirebase(msg)
      );

      const results = await Promise.all(sendPromises);
      expect(results.every(r => r.success)).toBe(true);

      // Verify all messages were received
      const firebaseMessages = await FirebaseMessageService.getMessagesFromFirebase(groupChat.id);
      expect(firebaseMessages.success).toBe(true);
      expect(firebaseMessages.data?.length).toBe(10);
    });

    it('should handle large group (5 participants)', async () => {
      // Create additional users for large group test
      const user4 = await firebaseHelper.createTestUser('user4@test.com', 'User Four');
      const user5 = await firebaseHelper.createTestUser('user5@test.com', 'User Five');

      const largeGroup: Chat = {
        id: 'large-group-test',
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid, user4.uid, user5.uid],
        name: 'Large Group Test',
        createdAt: Date.now(),
      };

      const createResult = await FirebaseChatService.createChatInFirebase(largeGroup);
      expect(createResult.success).toBe(true);

      // Send message to large group
      const message: Message = {
        id: 'large-group-msg',
        chatId: largeGroup.id,
        senderId: user1.uid,
        type: 'text',
        content: 'Message to large group',
        timestamp: Date.now(),
        status: 'sending',
      };

      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);

      // Mark as delivered to all participants
      for (const participantId of [user2.uid, user3.uid, user4.uid, user5.uid]) {
        await FirebaseMessageService.markMessageDelivered(message.id, largeGroup.id, participantId);
      }

      // Verify delivery tracking for all participants
      const deliveryStatus = await FirebaseMessageService.getMessageDeliveryFromFirebase(message.id, largeGroup.id);
      expect(Object.keys(deliveryStatus).length).toBe(4); // 4 other participants
    });
  });
});

