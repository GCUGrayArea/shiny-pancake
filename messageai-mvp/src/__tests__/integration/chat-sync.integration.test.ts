/**
 * Integration Tests: Chat Sync
 * Tests bidirectional sync between Firebase and SQLite for chats
 *
 * NO MOCKS - Uses real Firebase RTDB and SQLite
 */

import {
  FirebaseTestHelper,
  SQLiteTestHelper,
  createTestChat,
  createTestUser,
  waitFor,
  sleep,
} from './setup';

import type { Chat } from '../../types';

// Import services - NO MOCKS
import * as FirebaseChatService from '../../services/firebase-chat.service';
import * as FirebaseUserService from '../../services/firebase-user.service';
import * as LocalChatService from '../../services/local-chat.service';
import * as LocalUserService from '../../services/local-user.service';
import * as SyncService from '../../services/sync.service';

describe('Chat Sync Integration Tests', () => {
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
    it('should sync chat from Firebase to local database', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const testChat = createTestChat({
        participantIds: [user1.uid, user2.uid],
      });

      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${testChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${testChat.id}`);

      // 1. Create chat in Firebase
      const createResult = await FirebaseChatService.createChatInFirebase(testChat);
      expect(createResult.success).toBe(true);

      // 2. Verify it's in Firebase
      const firebaseExists = await firebaseHelper.verifyExists(`chats/${testChat.id}`);
      expect(firebaseExists).toBe(true);

      // 3. Sync to local
      await SyncService.syncChatToLocal(testChat);

      // 4. Verify it's in local database
      const localExists = await sqliteHelper.verifyChatExists(testChat.id);
      expect(localExists).toBe(true);

      // 5. Verify data integrity
      const localChat = await sqliteHelper.getChat(testChat.id);
      expect(localChat).toMatchObject({
        id: testChat.id,
        type: testChat.type,
        participantIds: testChat.participantIds,
      });
    });

    it('should update local chat when Firebase chat changes', async () => {
      const testChat = createTestChat({ type: '1:1' });
      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      testChat.participantIds.forEach(pid => {
        firebaseHelper.trackForCleanup(`users/${pid}/chats/${testChat.id}`);
      });

      // 1. Create and sync initial chat
      await FirebaseChatService.createChatInFirebase(testChat);
      await SyncService.syncChatToLocal(testChat);

      // 2. Update chat in Firebase with last message
      const lastMessage = {
        content: 'Hello!',
        senderId: testChat.participantIds[0],
        timestamp: Date.now(),
        type: 'text' as const,
      };

      const updatedChat = {
        ...testChat,
        lastMessage,
      };

      const updateResult = await FirebaseChatService.updateChatInFirebase(
        testChat.id,
        { lastMessage }
      );
      expect(updateResult.success).toBe(true);

      // 3. Get updated chat from Firebase
      const getResult = await FirebaseChatService.getChatFromFirebase(testChat.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBeTruthy();

      // 4. Sync updated chat to local
      await SyncService.syncChatToLocal(getResult.data!);

      // 5. Verify local was updated
      const localChat = await sqliteHelper.getChat(testChat.id);
      expect(localChat?.lastMessage).toBeTruthy();
      expect(localChat?.lastMessage?.content).toBe('Hello!');
    });

    it('should handle real-time chat updates', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const testChat = createTestChat({ participantIds: [user1.uid, user2.uid] });

      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${testChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${testChat.id}`);

      // 1. Create users in Firebase
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);

      // 2. Create chat in Firebase
      await FirebaseChatService.createChatInFirebase(testChat);

      // 3. Subscribe to user's chats
      let receivedChats: Chat[] = [];
      const unsubscribe = FirebaseChatService.subscribeToUserChats(user1.uid, async (chats) => {
        receivedChats = chats;
        // Sync all chats to local
        for (const chat of chats) {
          await SyncService.syncChatToLocal(chat);
        }
      });

      // 4. Wait for initial callback
      await waitFor(() => receivedChats.length > 0, 3000);
      expect(receivedChats.length).toBeGreaterThanOrEqual(1);

      // 5. Verify chat was synced to local
      const localChat = await sqliteHelper.getChat(testChat.id);
      expect(localChat).toBeTruthy();
      expect(localChat?.id).toBe(testChat.id);

      // Cleanup
      unsubscribe();
      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
    }, 10000);
  });

  describe('Local → Firebase Sync', () => {
    it('should sync chat from local database to Firebase', async () => {
      const testChat = createTestChat();
      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      testChat.participantIds.forEach(pid => {
        firebaseHelper.trackForCleanup(`users/${pid}/chats/${testChat.id}`);
      });

      // 1. Save chat to local database
      const localResult = await LocalChatService.saveChat(testChat);
      expect(localResult.success).toBe(true);

      // 2. Verify it's in local
      const localExists = await sqliteHelper.verifyChatExists(testChat.id);
      expect(localExists).toBe(true);

      // 3. Sync to Firebase
      await SyncService.syncChatToFirebase(testChat);
      await sleep(500);

      // 4. Verify it's in Firebase
      const firebaseResult = await FirebaseChatService.getChatFromFirebase(testChat.id);
      expect(firebaseResult.success).toBe(true);
      expect(firebaseResult.data).toBeTruthy();
      expect(firebaseResult.data?.id).toBe(testChat.id);
    });

    it('should create new chat and sync to both databases', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);

      // 1. Create users in both places
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await LocalUserService.saveUser(user1);
      await LocalUserService.saveUser(user2);

      // 2. Create a new chat
      const chatResult = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      expect(chatResult.success).toBe(true);
      expect(chatResult.data).toBeTruthy();

      const chatId = chatResult.data!;
      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);

      // 3. Get the created chat
      const getResult = await FirebaseChatService.getChatFromFirebase(chatId);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBeTruthy();

      // 4. Sync to local
      await SyncService.syncChatToLocal(getResult.data!);

      // 5. Verify in local
      const localChat = await sqliteHelper.getChat(chatId);
      expect(localChat).toBeTruthy();
      expect(localChat?.participantIds).toContain(user1.uid);
      expect(localChat?.participantIds).toContain(user2.uid);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should maintain data consistency across Firebase and local', async () => {
      const testChat = createTestChat();
      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      testChat.participantIds.forEach(pid => {
        firebaseHelper.trackForCleanup(`users/${pid}/chats/${testChat.id}`);
      });

      // 1. Create in Firebase, sync to local
      await FirebaseChatService.createChatInFirebase(testChat);
      await SyncService.syncChatToLocal(testChat);

      // 2. Verify both have the same data
      const firebaseData = await firebaseHelper.getData<any>(`chats/${testChat.id}`);
      const localData = await sqliteHelper.getChat(testChat.id);

      expect(firebaseData.id).toBe(localData?.id);
      expect(firebaseData.type).toBe(localData?.type);
      expect(JSON.parse(firebaseData.participantIds)).toEqual(localData?.participantIds);
    });

    it('should sync last message updates bidirectionally', async () => {
      const testChat = createTestChat();
      firebaseHelper.trackForCleanup(`chats/${testChat.id}`);
      testChat.participantIds.forEach(pid => {
        firebaseHelper.trackForCleanup(`users/${pid}/chats/${testChat.id}`);
      });

      // 1. Create chat
      await FirebaseChatService.createChatInFirebase(testChat);
      await SyncService.syncChatToLocal(testChat);

      // 2. Add last message in Firebase
      const lastMessage = {
        content: 'Test message',
        senderId: testChat.participantIds[0],
        timestamp: Date.now(),
        type: 'text' as const,
      };

      await FirebaseChatService.updateChatInFirebase(
        testChat.id,
        { lastMessage }
      );
      await sleep(300);

      // 3. Get and sync to local
      const updatedChat = await FirebaseChatService.getChatFromFirebase(testChat.id);
      await SyncService.syncChatToLocal(updatedChat.data!);

      // 4. Verify local has last message
      const localChat = await sqliteHelper.getChat(testChat.id);
      expect(localChat?.lastMessage).toBeTruthy();
      expect(localChat?.lastMessage?.content).toBe('Test message');
    });
  });

  describe('Group Chats', () => {
    it('should handle group chat creation and sync', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();
      const groupChat = createTestChat({
        type: 'group',
        name: 'Test Group',
        participantIds: [user1.uid, user2.uid, user3.uid],
      });

      firebaseHelper.trackForCleanup(`chats/${groupChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${groupChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${groupChat.id}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}/chats/${groupChat.id}`);

      // 1. Create group chat
      const createResult = await FirebaseChatService.createChatInFirebase(groupChat);
      expect(createResult.success).toBe(true);

      // 2. Sync to local
      await SyncService.syncChatToLocal(groupChat);

      // 3. Verify in local
      const localChat = await sqliteHelper.getChat(groupChat.id);
      expect(localChat).toBeTruthy();
      expect(localChat?.type).toBe('group');
      expect(localChat?.name).toBe('Test Group');
      expect(localChat?.participantIds).toHaveLength(3);
      expect(localChat?.participantIds).toContain(user1.uid);
      expect(localChat?.participantIds).toContain(user2.uid);
      expect(localChat?.participantIds).toContain(user3.uid);
    });

    it('should sync group chat to all participants', async () => {
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

      // 2. Create group chat
      const chatResult = await FirebaseChatService.createChat(
        [user1.uid, user2.uid, user3.uid],
        'Test Group'
      );
      expect(chatResult.success).toBe(true);

      const chatId = chatResult.data!;
      firebaseHelper.trackForCleanup(`chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chatId}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}/chats/${chatId}`);

      // 3. Verify all participants have the chat reference
      const user1HasChat = await firebaseHelper.verifyExists(`users/${user1.uid}/chats/${chatId}`);
      const user2HasChat = await firebaseHelper.verifyExists(`users/${user2.uid}/chats/${chatId}`);
      const user3HasChat = await firebaseHelper.verifyExists(`users/${user3.uid}/chats/${chatId}`);

      expect(user1HasChat).toBe(true);
      expect(user2HasChat).toBe(true);
      expect(user3HasChat).toBe(true);
    });
  });

  describe('Get User Chats', () => {
    it('should retrieve all chats for a user', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}`);

      // Create users
      await FirebaseUserService.createUserInFirebase(user1);
      await FirebaseUserService.createUserInFirebase(user2);
      await FirebaseUserService.createUserInFirebase(user3);

      // Create multiple chats for user1
      const chat1Result = await FirebaseChatService.createChat([user1.uid, user2.uid]);
      const chat2Result = await FirebaseChatService.createChat([user1.uid, user3.uid]);

      expect(chat1Result.success).toBe(true);
      expect(chat2Result.success).toBe(true);

      const chat1Id = chat1Result.data!;
      const chat2Id = chat2Result.data!;

      firebaseHelper.trackForCleanup(`chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`chats/${chat2Id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`users/${user1.uid}/chats/${chat2Id}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}/chats/${chat1Id}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}/chats/${chat2Id}`);

      // Get all chats for user1
      const chatsResult = await FirebaseChatService.getUserChatsFromFirebase(user1.uid);
      expect(chatsResult.success).toBe(true);
      expect(chatsResult.data).toBeTruthy();
      expect(chatsResult.data!.length).toBeGreaterThanOrEqual(2);

      const chatIds = chatsResult.data!.map(c => c.id);
      expect(chatIds).toContain(chat1Id);
      expect(chatIds).toContain(chat2Id);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chats gracefully', async () => {
      const nonExistentChatId = 'non-existent-chat-id';

      // Try to get non-existent chat
      const result = await FirebaseChatService.getChatFromFirebase(nonExistentChatId);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle sync errors without crashing', async () => {
      const testChat = createTestChat();

      // Try to sync to local without issues
      await expect(
        SyncService.syncChatToLocal(testChat)
      ).resolves.not.toThrow();
    });
  });
});
