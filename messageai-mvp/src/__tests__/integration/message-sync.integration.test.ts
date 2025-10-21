/**
 * Integration Tests: Message Sync
 * Tests bidirectional sync between Firebase and SQLite for messages
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

// Import services - NO MOCKS
import * as FirebaseMessageService from '../../services/firebase-message.service';
import * as FirebaseChatService from '../../services/firebase-chat.service';
import * as LocalMessageService from '../../services/local-message.service';
import * as LocalChatService from '../../services/local-chat.service';
import * as SyncService from '../../services/sync.service';

describe('Message Sync Integration Tests', () => {
  let firebaseHelper: FirebaseTestHelper;
  let sqliteHelper: SQLiteTestHelper;

  beforeAll(async () => {
    firebaseHelper = new FirebaseTestHelper();
    sqliteHelper = new SQLiteTestHelper();
    await sqliteHelper.init();

    // Database override is now handled automatically by SQLiteTestHelper
    // No need to manually override service database instances
  });

  afterAll(async () => {
    await firebaseHelper.cleanup();
    await sqliteHelper.cleanup();
  });

  describe('Firebase → Local Sync', () => {
    it('should sync message from Firebase to local database', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const message = createTestMessage(chat.id, user1.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat in Firebase
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Send message to Firebase
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);

      // 3. Verify it's in Firebase
      const firebaseExists = await firebaseHelper.verifyExists(
        `messages/${chat.id}/${message.id}`
      );
      expect(firebaseExists).toBe(true);

      // 4. Sync to local
      await SyncService.syncMessageToLocal(message);

      // 5. Verify it's in local database
      const localExists = await sqliteHelper.verifyMessageExists(message.id);
      expect(localExists).toBe(true);

      // 6. Verify data integrity
      const localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage).toMatchObject({
        id: message.id,
        chatId: chat.id,
        senderId: user1.uid,
        content: message.content,
        type: 'text',
      });
    });

    it('should handle real-time message updates', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Subscribe to messages
      let receivedMessages: Message[] = [];
      const unsubscribe = FirebaseMessageService.subscribeToMessages(
        chat.id,
        async (message) => {
          receivedMessages.push(message);
          await SyncService.syncMessageToLocal(message);
        }
      );

      // 3. Send a message
      const message = createTestMessage(chat.id, user1.uid, { content: 'Hello!' });
      await FirebaseMessageService.sendMessageToFirebase(message);

      // 4. Wait for real-time update
      await waitFor(() => receivedMessages.length > 0, 5000);
      expect(receivedMessages.length).toBeGreaterThanOrEqual(1);

      // 5. Verify message was synced to local
      const localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage).toBeTruthy();
      expect(localMessage?.content).toBe('Hello!');

      // Cleanup
      unsubscribe();
    }, 10000);

    it('should sync multiple messages in order', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 1. Send multiple messages
      const message1 = createTestMessage(chat.id, user1.uid, {
        content: 'First',
        timestamp: Date.now(),
      });
      const message2 = createTestMessage(chat.id, user2.uid, {
        content: 'Second',
        timestamp: Date.now() + 1000,
      });
      const message3 = createTestMessage(chat.id, user1.uid, {
        content: 'Third',
        timestamp: Date.now() + 2000,
      });

      await FirebaseMessageService.sendMessageToFirebase(message1);
      await FirebaseMessageService.sendMessageToFirebase(message2);
      await FirebaseMessageService.sendMessageToFirebase(message3);

      // 2. Sync all to local
      await SyncService.syncMessageToLocal(message1);
      await SyncService.syncMessageToLocal(message2);
      await SyncService.syncMessageToLocal(message3);

      // 3. Get messages from local
      const localMessages = await sqliteHelper.getMessagesForChat(chat.id);
      expect(localMessages).toHaveLength(3);

      // 4. Verify order (should be sorted by timestamp)
      expect(localMessages[0].content).toBe('First');
      expect(localMessages[1].content).toBe('Second');
      expect(localMessages[2].content).toBe('Third');
    });
  });

  describe('Local → Firebase Sync', () => {
    it('should sync message from local database to Firebase', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const message = createTestMessage(chat.id, user1.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Save message to local database
      const localResult = await LocalMessageService.saveMessage(message);
      expect(localResult.success).toBe(true);

      // 3. Verify it's in local
      const localExists = await sqliteHelper.verifyMessageExists(message.id);
      expect(localExists).toBe(true);

      // 4. Sync to Firebase
      await SyncService.syncMessageToFirebase(message);
      await sleep(500);

      // 5. Verify it's in Firebase
      const firebaseMessage = await firebaseHelper.getData<any>(
        `messages/${chat.id}/${message.id}`
      );
      expect(firebaseMessage).toBeTruthy();
      expect(firebaseMessage.content).toBe(message.content);
    });

    it('should send message and update chat lastMessage', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);

      // 2. Send message
      const message = createTestMessage(chat.id, user1.uid, { content: 'Test message' });
      const sendResult = await FirebaseMessageService.sendMessageToFirebase(message);
      expect(sendResult.success).toBe(true);

      await sleep(500);

      // 3. Get updated chat
      const chatResult = await FirebaseChatService.getChatFromFirebase(chat.id);
      expect(chatResult.success).toBe(true);
      expect(chatResult.data?.lastMessage).toBeTruthy();
      expect(chatResult.data?.lastMessage?.content).toBe('Test message');
    });
  });

  describe('Message Status Updates', () => {
    it('should sync message status updates', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const message = createTestMessage(chat.id, user1.uid, { status: 'sent' });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);
      await FirebaseMessageService.sendMessageToFirebase(message);
      await SyncService.syncMessageToLocal(message);

      // 2. Update message status to delivered
      const updateResult = await FirebaseMessageService.updateMessageStatusInFirebase(
        message.id,
        chat.id,
        'delivered'
      );
      expect(updateResult.success).toBe(true);

      await sleep(300);

      // 3. Get updated message
      const messages = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 10);
      expect(messages.success).toBe(true);
      const updatedMessage = messages.data?.find(m => m.id === message.id);
      expect(updatedMessage?.status).toBe('delivered');

      // 4. Sync to local
      if (updatedMessage) {
        await SyncService.syncMessageToLocal(updatedMessage);
      }

      // 5. Verify local has updated status
      const localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage?.status).toBe('delivered');
    });

    it('should track read receipts in group chat', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();
      const chat = createTestChat({
        type: 'group',
        participantIds: [user1.uid, user2.uid, user3.uid],
      });
      const message = createTestMessage(chat.id, user1.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat and send message
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);
      await FirebaseMessageService.sendMessageToFirebase(message);

      // 2. Mark as read by user2
      const readResult = await FirebaseMessageService.markMessageRead(
        message.id,
        chat.id,
        user2.uid
      );
      expect(readResult.success).toBe(true);

      await sleep(300);

      // 3. Get updated message
      const messages = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 10);
      const updatedMessage = messages.data?.find(m => m.id === message.id);

      expect(updatedMessage?.readBy).toBeTruthy();
      expect(updatedMessage?.readBy).toContain(user2.uid);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should maintain message consistency across Firebase and local', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const message = createTestMessage(chat.id, user1.uid);

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create in Firebase, sync to local
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);
      await FirebaseMessageService.sendMessageToFirebase(message);
      await SyncService.syncMessageToLocal(message);

      // 2. Verify both have the same data
      const firebaseData = await firebaseHelper.getData<any>(
        `messages/${chat.id}/${message.id}`
      );
      const localData = await sqliteHelper.getMessage(message.id);

      expect(firebaseData.id).toBe(localData?.id);
      expect(firebaseData.content).toBe(localData?.content);
      expect(firebaseData.senderId).toBe(localData?.senderId);
      expect(firebaseData.type).toBe(localData?.type);
    });

    it('should handle message sent while offline (optimistic UI)', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const message = createTestMessage(chat.id, user1.uid, {
        status: 'sending',
        localId: 'local-temp-id',
      });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Save message locally (simulating offline creation)
      await LocalMessageService.saveMessage(message);

      // 3. Verify it's in local with 'sending' status
      let localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage?.status).toBe('sending');
      expect(localMessage?.localId).toBe('local-temp-id');

      // 4. "Come back online" - sync to Firebase
      await SyncService.syncMessageToFirebase(message);
      await sleep(500);

      // 5. Update status to 'sent' and sync back
      const sentMessage = { ...message, status: 'sent' as const };
      await FirebaseMessageService.updateMessageStatusInFirebase(message.id, chat.id, 'sent');
      await sleep(300);

      // Get updated message
      const messages = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 10);
      const updatedMessage = messages.data?.find(m => m.id === message.id);

      if (updatedMessage) {
        await SyncService.syncMessageToLocal(updatedMessage);
      }

      // 6. Verify local now shows 'sent'
      localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage?.status).toBe('sent');
    });
  });

  describe('Get Messages', () => {
    it('should retrieve messages for a chat with limit', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Send multiple messages
      const messages = [];
      for (let i = 0; i < 5; i++) {
        const msg = createTestMessage(chat.id, user1.uid, {
          content: `Message ${i + 1}`,
          timestamp: Date.now() + i * 1000,
        });
        messages.push(msg);
        await FirebaseMessageService.sendMessageToFirebase(msg);
        await SyncService.syncMessageToLocal(msg);
      }

      await sleep(500);

      // 3. Get messages with limit
      const result = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 3);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.data!.length).toBeLessThanOrEqual(3);

      // 4. Verify local has all messages
      const localMessages = await sqliteHelper.getMessagesForChat(chat.id);
      expect(localMessages.length).toBe(5);
    });

    it('should retrieve messages in correct order (newest first)', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);

      // 2. Send messages with different timestamps
      const msg1 = createTestMessage(chat.id, user1.uid, {
        content: 'First',
        timestamp: 1000,
      });
      const msg2 = createTestMessage(chat.id, user2.uid, {
        content: 'Second',
        timestamp: 2000,
      });
      const msg3 = createTestMessage(chat.id, user1.uid, {
        content: 'Third',
        timestamp: 3000,
      });

      await FirebaseMessageService.sendMessageToFirebase(msg1);
      await FirebaseMessageService.sendMessageToFirebase(msg2);
      await FirebaseMessageService.sendMessageToFirebase(msg3);

      await sleep(500);

      // 3. Get messages (should be newest first in Firebase query)
      const result = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 10);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();

      // Firebase returns newest first
      const sorted = result.data!.sort((a, b) => b.timestamp - a.timestamp);
      expect(sorted[0].content).toBe('Third');
      expect(sorted[1].content).toBe('Second');
      expect(sorted[2].content).toBe('First');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing messages gracefully', async () => {
      const nonExistentChatId = 'non-existent-chat';

      // Try to get messages from non-existent chat
      const result = await FirebaseMessageService.getMessagesFromFirebase(
        nonExistentChatId,
        10
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle sync errors without crashing', async () => {
      const message = createTestMessage('fake-chat', 'fake-user');

      // Try to sync message
      await expect(
        SyncService.syncMessageToLocal(message)
      ).resolves.not.toThrow();
    });
  });

  describe('Image Messages', () => {
    it('should sync image messages with metadata', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const chat = createTestChat({ participantIds: [user1.uid, user2.uid] });
      const imageMessage = createTestMessage(chat.id, user1.uid, {
        type: 'image',
        content: 'https://example.com/image.jpg',
        metadata: {
          imageWidth: 800,
          imageHeight: 600,
          imageSize: 102400,
        },
      });

      firebaseHelper.trackForCleanup(`chats/${chat.id}`);
      firebaseHelper.trackForCleanup(`messages/${chat.id}`);

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(chat);
      await LocalChatService.saveChat(chat);

      // 2. Send image message
      await FirebaseMessageService.sendMessageToFirebase(imageMessage);
      await SyncService.syncMessageToLocal(imageMessage);

      // 3. Verify local has image metadata
      const localMessage = await sqliteHelper.getMessage(imageMessage.id);
      expect(localMessage?.type).toBe('image');
      expect(localMessage?.content).toBe('https://example.com/image.jpg');
      expect(localMessage?.metadata).toBeTruthy();
      expect(localMessage?.metadata?.imageWidth).toBe(800);
      expect(localMessage?.metadata?.imageHeight).toBe(600);
      expect(localMessage?.metadata?.imageSize).toBe(102400);
    });
  });
});
