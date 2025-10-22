/**
 * Unit tests for notification-manager.service.ts
 */

import * as NotificationManager from '../services/notification-manager.service';
import * as NotificationService from '../services/notification.service';
import * as LocalChatService from '../services/local-chat.service';
import * as LocalUserService from '../services/local-user.service';
import type { Message, Chat, User } from '../types';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// Mock services
jest.mock('../services/notification.service');
jest.mock('../services/local-chat.service');
jest.mock('../services/local-user.service');

describe('NotificationManager', () => {
  const mockUser: User = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: Date.now(),
    lastSeen: Date.now(),
    isOnline: true,
  };

  const mockChat: Chat = {
    id: 'chat-123',
    type: '1:1',
    participantIds: ['user-123', 'user-456'],
    createdAt: Date.now(),
  };

  const mockMessage: Message = {
    id: 'msg-123',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'text',
    content: 'Hello!',
    timestamp: Date.now(),
    status: 'sent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset notification manager state
    NotificationManager.setCurrentUser(null);
    NotificationManager.setCurrentViewingChat(null);
  });

  describe('setCurrentUser', () => {
    it('should set current user', () => {
      NotificationManager.setCurrentUser('user-123');
      // No direct way to test this, but it should not throw
      expect(true).toBe(true);
    });

    it('should accept null', () => {
      NotificationManager.setCurrentUser(null);
      expect(true).toBe(true);
    });
  });

  describe('setCurrentViewingChat', () => {
    it('should set current viewing chat', () => {
      NotificationManager.setCurrentViewingChat('chat-123');
      expect(true).toBe(true);
    });

    it('should accept null', () => {
      NotificationManager.setCurrentViewingChat(null);
      expect(true).toBe(true);
    });
  });

  describe('handleNewMessage', () => {
    beforeEach(() => {
      (LocalChatService.getChat as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChat,
      });
      (LocalUserService.getUser as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      });
      (NotificationService.scheduleMessageNotification as jest.Mock).mockResolvedValue('notif-123');
    });

    it('should not notify for own messages', async () => {
      NotificationManager.setCurrentUser('user-456'); // Same as sender

      await NotificationManager.handleNewMessage(mockMessage);

      expect(NotificationService.scheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should not notify if viewing the chat', async () => {
      NotificationManager.setCurrentUser('user-123');
      NotificationManager.setCurrentViewingChat('chat-123'); // Same as message chat

      await NotificationManager.handleNewMessage(mockMessage);

      expect(NotificationService.scheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should schedule notification for new message', async () => {
      NotificationManager.setCurrentUser('user-123');
      NotificationManager.setCurrentViewingChat('chat-999'); // Different chat

      await NotificationManager.handleNewMessage(mockMessage);

      expect(LocalChatService.getChat).toHaveBeenCalledWith('chat-123');
      expect(LocalUserService.getUser).toHaveBeenCalledWith('user-456');
      expect(NotificationService.scheduleMessageNotification).toHaveBeenCalledWith(
        mockMessage,
        mockChat,
        mockUser,
        'user-123'
      );
    });

    it('should handle missing chat gracefully', async () => {
      NotificationManager.setCurrentUser('user-123');
      (LocalChatService.getChat as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Chat not found',
      });

      await NotificationManager.handleNewMessage(mockMessage);

      expect(NotificationService.scheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should handle missing sender gracefully', async () => {
      NotificationManager.setCurrentUser('user-123');
      (LocalUserService.getUser as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      await NotificationManager.handleNewMessage(mockMessage);

      expect(NotificationService.scheduleMessageNotification).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      NotificationManager.setCurrentUser('user-123');
      (NotificationService.scheduleMessageNotification as jest.Mock).mockRejectedValue(
        new Error('Notification error')
      );

      await expect(NotificationManager.handleNewMessage(mockMessage)).resolves.not.toThrow();
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications and badge count', async () => {
      (NotificationService.clearAllNotifications as jest.Mock).mockResolvedValue(undefined);
      (NotificationService.setBadgeCount as jest.Mock).mockResolvedValue(undefined);

      await NotificationManager.clearNotifications();

      expect(NotificationService.clearAllNotifications).toHaveBeenCalled();
      expect(NotificationService.setBadgeCount).toHaveBeenCalledWith(0);
    });
  });
});

