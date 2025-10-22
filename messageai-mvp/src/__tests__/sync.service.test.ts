/**
 * Unit tests for Sync Service
 */

// Mock all service dependencies BEFORE imports
jest.mock('../services/database.service', () => ({}));
jest.mock('../services/local-user.service', () => ({
  saveUser: jest.fn(),
  getUser: jest.fn(),
}));
jest.mock('../services/local-chat.service', () => ({
  saveChat: jest.fn(),
}));
jest.mock('../services/local-message.service', () => ({
  saveMessage: jest.fn(),
}));
jest.mock('../services/firebase-user.service', () => ({
  createUserInFirebase: jest.fn(),
  getUserFromFirebase: jest.fn(),
  subscribeToUser: jest.fn(),
}));
jest.mock('../services/firebase-chat.service', () => ({
  createChatInFirebase: jest.fn(),
  subscribeToUserChats: jest.fn(),
}));
jest.mock('../services/firebase-message.service', () => ({
  sendMessageToFirebase: jest.fn(),
  getMessagesFromFirebase: jest.fn(),
  subscribeToMessages: jest.fn(),
}));

import type { User, Chat, Message } from '../types';
import * as SyncService from '../services/sync.service';
import * as LocalUserService from '../services/local-user.service';
import * as LocalChatService from '../services/local-chat.service';
import * as LocalMessageService from '../services/local-message.service';
import * as FirebaseUserService from '../services/firebase-user.service';
import * as FirebaseChatService from '../services/firebase-chat.service';
import * as FirebaseMessageService from '../services/firebase-message.service';

const testUser: User = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: 1234567890,
  lastSeen: 1234567890,
  isOnline: true,
};

const testChat: Chat = {
  id: 'chat-1',
  type: '1:1',
  participantIds: ['user-1', 'user-2'],
  createdAt: 1234567890,
};

const testMessage: Message = {
  id: 'msg-1',
  chatId: 'chat-1',
  senderId: 'user-1',
  type: 'text',
  content: 'Hello',
  timestamp: 1234567890,
  status: 'sent',
};

describe('Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUserToLocal', () => {
    it('should sync user from Firebase to local database', async () => {
      (LocalUserService.saveUser as jest.Mock).mockResolvedValue({ success: true });

      await SyncService.syncUserToLocal(testUser);

      expect(LocalUserService.saveUser).toHaveBeenCalledWith(testUser);
    });

    it('should handle errors gracefully', async () => {
      (LocalUserService.saveUser as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncUserToLocal(testUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync user to local:',
        'Database error'
      );

      consoleSpy.mockRestore();
    });

    it('should catch exceptions', async () => {
      (LocalUserService.saveUser as jest.Mock).mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncUserToLocal(testUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error syncing user to local:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('syncChatToLocal', () => {
    it('should sync chat from Firebase to local database', async () => {
      (LocalChatService.saveChat as jest.Mock).mockResolvedValue({ success: true });

      await SyncService.syncChatToLocal(testChat);

      expect(LocalChatService.saveChat).toHaveBeenCalledWith(testChat);
    });

    it('should handle errors gracefully', async () => {
      (LocalChatService.saveChat as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncChatToLocal(testChat);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync chat to local:',
        'Database error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('syncMessageToLocal', () => {
    it('should sync message from Firebase to local database', async () => {
      (LocalMessageService.saveMessage as jest.Mock).mockResolvedValue({ success: true });

      await SyncService.syncMessageToLocal(testMessage);

      expect(LocalMessageService.saveMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle errors gracefully', async () => {
      (LocalMessageService.saveMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncMessageToLocal(testMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync message to local:',
        'Database error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('syncUserToFirebase', () => {
    it('should sync user from local to Firebase', async () => {
      (FirebaseUserService.createUserInFirebase as jest.Mock).mockResolvedValue({
        success: true,
      });

      await SyncService.syncUserToFirebase(testUser);

      expect(FirebaseUserService.createUserInFirebase).toHaveBeenCalledWith(testUser);
    });

    it('should handle errors gracefully', async () => {
      (FirebaseUserService.createUserInFirebase as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncUserToFirebase(testUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync user to Firebase:',
        'Network error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('syncChatToFirebase', () => {
    it('should sync chat from local to Firebase', async () => {
      (FirebaseChatService.createChatInFirebase as jest.Mock).mockResolvedValue({
        success: true,
        data: 'chat-1',
      });

      await SyncService.syncChatToFirebase(testChat);

      expect(FirebaseChatService.createChatInFirebase).toHaveBeenCalledWith(testChat);
    });

    it('should handle errors gracefully', async () => {
      (FirebaseChatService.createChatInFirebase as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncChatToFirebase(testChat);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync chat to Firebase:',
        'Network error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('syncMessageToFirebase', () => {
    it('should sync message from local to Firebase', async () => {
      (FirebaseMessageService.sendMessageToFirebase as jest.Mock).mockResolvedValue({
        success: true,
        data: 'msg-1',
      });

      await SyncService.syncMessageToFirebase(testMessage);

      expect(FirebaseMessageService.sendMessageToFirebase).toHaveBeenCalledWith(testMessage);
    });

    it('should handle errors gracefully', async () => {
      (FirebaseMessageService.sendMessageToFirebase as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await SyncService.syncMessageToFirebase(testMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync message to Firebase:',
        'Network error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('initialSync', () => {
    it('should perform initial sync for a user', async () => {
      const chats = [testChat];
      const messages = [testMessage];
      const user2: User = { ...testUser, uid: 'user-2' };

      // Mock Firebase subscriptions
      (FirebaseChatService.subscribeToUserChats as jest.Mock).mockImplementation(
        (userId, callback) => {
          callback(chats);
          return jest.fn(); // unsubscribe function
        }
      );

      (FirebaseUserService.getUserFromFirebase as jest.Mock).mockResolvedValue({
        success: true,
        data: user2,
      });

      (FirebaseMessageService.getMessagesFromFirebase as jest.Mock).mockResolvedValue({
        success: true,
        data: messages,
      });

      (LocalChatService.saveChat as jest.Mock).mockResolvedValue({ success: true });
      (LocalUserService.saveUser as jest.Mock).mockResolvedValue({ success: true });
      (LocalMessageService.saveMessage as jest.Mock).mockResolvedValue({ success: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SyncService.initialSync('user-1');

      expect(FirebaseChatService.subscribeToUserChats).toHaveBeenCalled();
      expect(LocalChatService.saveChat).toHaveBeenCalledWith(testChat);
      expect(FirebaseUserService.getUserFromFirebase).toHaveBeenCalledWith('user-2');
      expect(LocalUserService.saveUser).toHaveBeenCalledWith(user2);
      expect(FirebaseMessageService.getMessagesFromFirebase).toHaveBeenCalledWith('chat-1', 50);
      expect(LocalMessageService.saveMessage).toHaveBeenCalledWith(testMessage);

      expect(consoleSpy).toHaveBeenCalledWith('Starting initial sync for user:', 'user-1');
      expect(consoleSpy).toHaveBeenCalledWith('Initial sync completed');

      consoleSpy.mockRestore();
    });

    it('should handle errors during initial sync', async () => {
      (FirebaseChatService.subscribeToUserChats as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(SyncService.initialSync('user-1')).rejects.toThrow('Network error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during initial sync:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('startRealtimeSync', () => {
    it('should start real-time sync subscriptions', async () => {
      const mockUnsubscribe = jest.fn();

      (FirebaseChatService.subscribeToUserChats as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      (FirebaseMessageService.subscribeToMessages as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      (FirebaseUserService.subscribeToUser as jest.Mock).mockReturnValue(mockUnsubscribe);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SyncService.startRealtimeSync('user-1');

      expect(FirebaseChatService.subscribeToUserChats).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Starting real-time sync for user:', 'user-1');
      expect(consoleSpy).toHaveBeenCalledWith('Real-time sync started');

      consoleSpy.mockRestore();
    });

    it('should handle errors when starting sync', async () => {
      (FirebaseChatService.subscribeToUserChats as jest.Mock).mockImplementation(() => {
        throw new Error('Connection error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(SyncService.startRealtimeSync('user-1')).rejects.toThrow(
        'Connection error'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting real-time sync:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('stopRealtimeSync', () => {
    it('should stop all real-time sync subscriptions', () => {
      const mockUnsubscribe = jest.fn();

      // Set up some mock subscriptions
      (FirebaseChatService.subscribeToUserChats as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First start sync to create subscriptions
      SyncService.startRealtimeSync('user-1');

      // Then stop it
      SyncService.stopRealtimeSync();

      expect(consoleSpy).toHaveBeenCalledWith('Stopping real-time sync');
      expect(consoleSpy).toHaveBeenCalledWith('Real-time sync stopped');

      consoleSpy.mockRestore();
    });

    it('should handle errors when stopping sync', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Call stop without starting (should handle gracefully)
      SyncService.stopRealtimeSync();

      // Should not throw error
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getSyncStatus', () => {
    it('should return current sync status', () => {
      const status = SyncService.getSyncStatus();

      expect(status).toHaveProperty('hasUserChatsSubscription');
      expect(status).toHaveProperty('activeChatSubscriptions');
      expect(status).toHaveProperty('activeMessageSubscriptions');
      expect(status).toHaveProperty('activePresenceSubscriptions');

      expect(typeof status.hasUserChatsSubscription).toBe('boolean');
      expect(typeof status.activeChatSubscriptions).toBe('number');
      expect(typeof status.activeMessageSubscriptions).toBe('number');
      expect(typeof status.activePresenceSubscriptions).toBe('number');
    });
  });
});
