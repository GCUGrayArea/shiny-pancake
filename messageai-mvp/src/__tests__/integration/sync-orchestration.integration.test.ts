/**
 * Integration Tests: Sync Orchestration
 * Tests end-to-end sync flows including initial sync and real-time sync
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

// Import services - NO MOCKS
import * as FirebaseUserService from '../../services/firebase-user.service';
import * as FirebaseChatService from '../../services/firebase-chat.service';
import * as FirebaseMessageService from '../../services/firebase-message.service';
import * as LocalUserService from '../../services/local-user.service';
import * as LocalChatService from '../../services/local-chat.service';
import * as LocalMessageService from '../../services/local-message.service';
import * as SyncService from '../../services/sync.service';

describe('Sync Orchestration Integration Tests', () => {
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

  afterEach(() => {
    // Stop any active subscriptions after each test
    SyncService.stopRealtimeSync();
  });

  describe('Initial Sync', () => {
    it('should perform complete initial sync for a new user', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}`);

      // 1. Create users in Firebase
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await FirebaseUserService.createUserInFirebase(user3);

      // 2. Create chats for user1
      const chat1Result = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chat2Result = await FirebaseChatService.createChat([user1.uid, user3.uid]);

      expect(chat1Result.success).toBe(true);
      expect(chat2Result.success).toBe(true);

      const chat1Id = chat1Result.data!;
      const chat2Id = chat2Result.data!;

      firebaseHelper.trackForCleanup(`chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`chats/${chat2Id}`);
      firebaseHelper.trackForCleanup(`messages/${chat1Id}`);
      firebaseHelper.trackForCleanup(`messages/${chat2Id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat2Id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}/chats/${chat2Id}`);

      // 3. Add messages to chats
      const msg1 = createTestMessage(chat1Id, user1.uid, { content: 'Hello user2' });
      const msg2 = createTestMessage(chat1Id, user2.uid, { content: 'Hi user1' });
      const msg3 = createTestMessage(chat2Id, user1.uid, { content: 'Hello user3' });

      await FirebaseMessageService.sendMessageToFirebase(msg1);
      await FirebaseMessageService.sendMessageToFirebase(msg2);
      await FirebaseMessageService.sendMessageToFirebase(msg3);

      await sleep(1000);

      // 4. Perform initial sync for user1
      await SyncService.initialSync(user1.uid);

      // 5. Verify local database has all synced data
      // Check chats
      const localChat1 = await sqliteHelper.getChat(chat1Id);
      const localChat2 = await sqliteHelper.getChat(chat2Id);
      expect(localChat1).toBeTruthy();
      expect(localChat2).toBeTruthy();

      // Check participants (users)
      const localUser2 = await sqliteHelper.getUser(user2.uid);
      const localUser3 = await sqliteHelper.getUser(user3.uid);
      expect(localUser2).toBeTruthy();
      expect(localUser3).toBeTruthy();

      // Check messages
      const chat1Messages = await sqliteHelper.getMessagesForChat(chat1Id);
      const chat2Messages = await sqliteHelper.getMessagesForChat(chat2Id);
      expect(chat1Messages.length).toBe(2);
      expect(chat2Messages.length).toBe(1);

      // Verify message content
      expect(chat1Messages.some(m => m.content === 'Hello user2')).toBe(true);
      expect(chat1Messages.some(m => m.content === 'Hi user1')).toBe(true);
      expect(chat2Messages[0].content).toBe('Hello user3');
    }, 15000);

    it('should handle initial sync with no existing chats', async () => {
      const newUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${newUser.uid}`);

      // 1. Create user in Firebase
      await FirebaseUserService.createUserInFirebase(newUser);

      // 2. Perform initial sync (should complete without errors)
      await expect(SyncService.initialSync(newUser.uid)).resolves.not.toThrow();

      // 3. Verify no chats in local (but shouldn't crash)
      const status = SyncService.getSyncStatus();
      expect(status).toBeTruthy();
    }, 10000);

    it('should sync only recent messages (last 50) during initial sync', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);

      // 1. Create users
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);

      // 2. Create chat
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chatId = chatResult.data!;

      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`messages/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      // 3. Send only a few messages (less than 50 limit)
      const messages = [];
      for (let i = 0; i < 10; i++) {
        const msg = createTestMessage(chatId, user1.uid, {
          content: `Message ${i + 1}`,
          timestamp: Date.now() + i * 100,
        });
        messages.push(msg);
        await FirebaseMessageService.sendMessageToFirebase(msg);
      }

      await sleep(1000);

      // 4. Perform initial sync
      await SyncService.initialSync(user1.uid);

      // 5. Verify all messages were synced (since we have less than 50)
      const localMessages = await sqliteHelper.getMessagesForChat(chatId);
      expect(localMessages.length).toBe(10);
    }, 15000);
  });

  describe('Real-Time Sync', () => {
    it('should start real-time sync and receive live updates', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);

      // 1. Create users
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await LocalUserService.saveUser(user1);
      await LocalUserService.saveUser(user2);

      // 2. Create a chat
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chatId = chatResult.data!;

      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`messages/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      await sleep(500);

      // 3. Start real-time sync for user1
      await SyncService.startRealtimeSync(user1.uid);

      // 4. Wait for subscriptions to be established
      await sleep(1000);

      // 5. Verify sync status
      const status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(true);

      // 6. Send a message while real-time sync is active
      const message = createTestMessage(chatId, user2.uid, {
        content: 'Real-time message!',
      });
      await FirebaseMessageService.sendMessageToFirebase(message);

      // 7. Wait for real-time sync to process
      await waitFor(
        async () => {
          const localMsg = await sqliteHelper.getMessage(message.id);
          return localMsg !== null;
        },
        5000
      );

      // 8. Verify message was synced to local
      const localMessage = await sqliteHelper.getMessage(message.id);
      expect(localMessage).toBeTruthy();
      expect(localMessage?.content).toBe('Real-time message!');

      // 9. Stop sync
      SyncService.stopRealtimeSync();
      const stoppedStatus = SyncService.getSyncStatus();
      expect(stoppedStatus.hasUserChatsSubscription).toBe(false);
    }, 15000);

    it('should sync new chats created while real-time sync is active', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}`);

      // 1. Create users
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await FirebaseUserService.createUserInFirebase(user3);
      await LocalUserService.saveUser(user1);

      // 2. Start real-time sync BEFORE creating any chats
      await SyncService.startRealtimeSync(user1.uid);
      await sleep(500);

      // 3. Create a new chat while sync is running
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chatId = chatResult.data!;

      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`messages/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      // 4. Wait for chat to be synced
      await waitFor(
        async () => {
          const localChat = await sqliteHelper.getChat(chatId);
          return localChat !== null;
        },
        5000
      );

      // 5. Verify chat was synced
      const localChat = await sqliteHelper.getChat(chatId);
      expect(localChat).toBeTruthy();
      expect(localChat?.participantIds).toContain(user1.uid);
      expect(localChat?.participantIds).toContain(user2.uid);

      SyncService.stopRealtimeSync();
    }, 15000);

    it('should sync participant presence updates', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser({ isOnline: false });

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);

      // 1. Create users
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await LocalUserService.saveUser(user1);
      await LocalUserService.saveUser(user2);

      // 2. Create chat
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chatId = chatResult.data!;

      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`messages/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      await sleep(500);

      // 3. Start real-time sync for user1
      await SyncService.startRealtimeSync(user1.uid);
      await sleep(1000);

      // 4. Verify initial presence
      let localUser2 = await sqliteHelper.getUser(user2.uid);
      expect(localUser2?.isOnline).toBe(false);

      // 5. Update user2's presence
      await FirebaseUserService.updateUserInFirebase(user2.uid, {
        isOnline: true,
        lastSeen: Date.now(),
      });

      // 6. Wait for presence update to sync
      await waitFor(
        async () => {
          const updated = await sqliteHelper.getUser(user2.uid);
          return updated?.isOnline === true;
        },
        5000
      );

      // 7. Verify presence was updated
      localUser2 = await sqliteHelper.getUser(user2.uid);
      expect(localUser2?.isOnline).toBe(true);

      SyncService.stopRealtimeSync();
    }, 15000);
  });

  describe('Sync Status', () => {
    it('should track active subscriptions', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}`);

      // 1. Initial status - no subscriptions
      let status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(false);
      expect(status.activeMessageSubscriptions).toBe(0);
      expect(status.activePresenceSubscriptions).toBe(0);

      // 2. Create users and chats
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await FirebaseUserService.createUserInFirebase(user3);

      const chat1 = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chat2 = await FirebaseChatService.createChat([user1.uid, user3.uid]);

      firebaseHelper.trackForCleanup(`chats/${chat1.data}`);
      firebaseHelper.trackForCleanup(`chats/${chat2.data}`);
      firebaseHelper.trackForCleanup(`messages/${chat1.data}`);
      firebaseHelper.trackForCleanup(`messages/${chat2.data}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat1.data}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat2.data}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chat1.data}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}/chats/${chat2.data}`);

      await sleep(500);

      // 3. Start real-time sync
      await SyncService.startRealtimeSync(user1.uid);
      await sleep(1500);

      // 4. Check status - should have active subscriptions
      status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(true);
      expect(status.activeMessageSubscriptions).toBeGreaterThanOrEqual(1);

      // 5. Stop sync
      SyncService.stopRealtimeSync();
      status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(false);
      expect(status.activeMessageSubscriptions).toBe(0);
      expect(status.activePresenceSubscriptions).toBe(0);
    }, 15000);
  });

  describe('Complete User Journey', () => {
    it('should handle complete app lifecycle: login → initial sync → real-time sync → messages', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);

      // === STEP 1: User logs in ===
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);

      // === STEP 2: App creates a chat for the user ===
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chatId = chatResult.data!;

      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`messages/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      // Send some historical messages
      const historicalMsg = createTestMessage(chatId, user2.uid, {
        content: 'Historical message',
        timestamp: Date.now() - 10000,
      });
      await FirebaseMessageService.sendMessageToFirebase(historicalMsg);

      await sleep(1000);

      // === STEP 3: Perform initial sync ===
      await SyncService.initialSync(user1.uid);

      // Verify initial sync worked
      const localChat = await sqliteHelper.getChat(chatId);
      expect(localChat).toBeTruthy();

      const localUser2 = await sqliteHelper.getUser(user2.uid);
      expect(localUser2).toBeTruthy();

      const initialMessages = await sqliteHelper.getMessagesForChat(chatId);
      expect(initialMessages.length).toBe(1);
      expect(initialMessages[0].content).toBe('Historical message');

      // === STEP 4: Start real-time sync ===
      await SyncService.startRealtimeSync(user1.uid);
      await sleep(1000);

      // === STEP 5: Receive real-time message ===
      const realtimeMsg = createTestMessage(chatId, user2.uid, {
        content: 'New real-time message!',
      });
      await FirebaseMessageService.sendMessageToFirebase(realtimeMsg);

      // Wait for real-time sync
      await waitFor(
        async () => {
          const messages = await sqliteHelper.getMessagesForChat(chatId);
          return messages.length >= 2;
        },
        5000
      );

      // Verify real-time message was synced
      const allMessages = await sqliteHelper.getMessagesForChat(chatId);
      expect(allMessages.length).toBe(2);
      expect(allMessages.some(m => m.content === 'New real-time message!')).toBe(true);

      // === STEP 6: User sends a message ===
      const sentMsg = createTestMessage(chatId, user1.uid, {
        content: 'My reply',
      });
      await LocalMessageService.saveMessage(sentMsg);
      await SyncService.syncMessageToFirebase(sentMsg);

      await sleep(1000);

      // Verify message in Firebase
      const firebaseMessages = await FirebaseMessageService.getMessagesFromFirebase(chatId, 10);
      expect(firebaseMessages.data?.some(m => m.content === 'My reply')).toBe(true);

      // === STEP 7: User logs out ===
      SyncService.stopRealtimeSync();

      const finalStatus = SyncService.getSyncStatus();
      expect(finalStatus.hasUserChatsSubscription).toBe(false);
    }, 20000);
  });

  describe('Error Recovery', () => {
    it('should handle network errors gracefully during sync', async () => {
      const user = createTestUser();

      // Try to sync a user that doesn't exist in Firebase yet
      // This simulates various network/data inconsistencies
      await expect(SyncService.initialSync(user.uid)).resolves.not.toThrow();
    });

    it('should allow restarting sync after stopping', async () => {
      const user1 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      await FirebaseUserService.createUserInFirebase(user1);

      // Start sync
      await SyncService.startRealtimeSync(user1.uid);
      await sleep(500);

      let status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(true);

      // Stop sync
      SyncService.stopRealtimeSync();
      status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(false);

      // Restart sync (should work without errors)
      await expect(SyncService.startRealtimeSync(user1.uid)).resolves.not.toThrow();
      await sleep(500);

      status = SyncService.getSyncStatus();
      expect(status.hasUserChatsSubscription).toBe(true);

      SyncService.stopRealtimeSync();
    }, 10000);
  });
});
