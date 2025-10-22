/**
 * Unit tests for notification.service.ts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as NotificationService from '../services/notification.service';
import type { Message, Chat, User } from '../types';

// Mock expo-notifications
jest.mock('expo-notifications');

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

describe('NotificationService', () => {
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

  const mockGroupChat: Chat = {
    id: 'chat-789',
    type: 'group',
    name: 'Test Group',
    participantIds: ['user-123', 'user-456', 'user-789'],
    createdAt: Date.now(),
  };

  const mockTextMessage: Message = {
    id: 'msg-123',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'text',
    content: 'Hello, this is a test message!',
    timestamp: Date.now(),
    status: 'sent',
  };

  const mockImageMessage: Message = {
    id: 'msg-456',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'image',
    content: 'https://example.com/image.jpg',
    timestamp: Date.now(),
    status: 'sent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupNotificationChannel', () => {
    it('should set up notification channel on Android', async () => {
      (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.setupNotificationChannel();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    });
  });

  describe('requestNotificationPermissions', () => {
    it('should return true if permissions already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestNotificationPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permissions if not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestNotificationPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if permissions denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await NotificationService.requestNotificationPermissions();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await NotificationService.requestNotificationPermissions();

      expect(result).toBe(false);
    });
  });

  describe('scheduleMessageNotification', () => {
    beforeEach(() => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-123');
    });

    it('should not notify for own messages', async () => {
      const result = await NotificationService.scheduleMessageNotification(
        mockTextMessage,
        mockChat,
        mockUser,
        'user-456' // Same as message sender
      );

      expect(result).toBeNull();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should schedule notification for text message in 1:1 chat', async () => {
      const result = await NotificationService.scheduleMessageNotification(
        mockTextMessage,
        mockChat,
        mockUser,
        'user-123'
      );

      expect(result).toBe('notif-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test User',
          body: 'Hello, this is a test message!',
          data: {
            chatId: 'chat-123',
            messageId: 'msg-123',
            senderId: 'user-456',
            senderName: 'Test User',
            type: 'message',
          },
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    });

    it('should schedule notification for text message in group chat', async () => {
      const result = await NotificationService.scheduleMessageNotification(
        mockTextMessage,
        mockGroupChat,
        mockUser,
        'user-123'
      );

      expect(result).toBe('notif-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Test User in Test Group',
            body: 'Hello, this is a test message!',
          }),
        })
      );
    });

    it('should show "📷 Photo" for image messages', async () => {
      const result = await NotificationService.scheduleMessageNotification(
        mockImageMessage,
        mockChat,
        mockUser,
        'user-123'
      );

      expect(result).toBe('notif-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            body: '📷 Photo',
          }),
        })
      );
    });

    it('should truncate long messages', async () => {
      const longMessage: Message = {
        ...mockTextMessage,
        content: 'a'.repeat(150), // 150 characters
      };

      await NotificationService.scheduleMessageNotification(
        longMessage,
        mockChat,
        mockUser,
        'user-123'
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            body: 'a'.repeat(97) + '...',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Notification error')
      );

      const result = await NotificationService.scheduleMessageNotification(
        mockTextMessage,
        mockChat,
        mockUser,
        'user-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('setBadgeCount', () => {
    it('should set badge count', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.setBadgeCount(5);

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should handle errors gracefully', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockRejectedValue(
        new Error('Badge error')
      );

      await expect(NotificationService.setBadgeCount(5)).resolves.not.toThrow();
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications', async () => {
      (Notifications.dismissAllNotificationsAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.clearAllNotifications();

      expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('cancelNotification', () => {
    it('should cancel a specific notification', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.cancelNotification('notif-123');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-123');
    });
  });

  describe('getPushToken', () => {
    it('should return null (placeholder for FCM)', async () => {
      const result = await NotificationService.getPushToken();

      expect(result).toBeNull();
    });
  });
});


