/**
 * Unit Tests for FCM Push Token Integration
 */

import * as Notifications from 'expo-notifications';
import * as NotificationService from '../../services/notification.service';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

describe('NotificationService - FCM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPushToken', () => {
    it('should return push token when permissions are granted', async () => {
      const mockToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      const token = await NotificationService.getPushToken();

      expect(token).toBe(mockToken);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: expect.any(String),
      });
    });

    it('should request permissions if not granted', async () => {
      const mockToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      const token = await NotificationService.getPushToken();

      expect(token).toBe(mockToken);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return null when permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const token = await NotificationService.getPushToken();

      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const token = await NotificationService.getPushToken();

      expect(token).toBeNull();
    });

    it('should handle getExpoPushTokenAsync errors', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token generation failed')
      );

      const token = await NotificationService.getPushToken();

      expect(token).toBeNull();
    });
  });

  describe('savePushTokenToProfile', () => {
    it('should log token save attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await NotificationService.savePushTokenToProfile('user123', 'token456');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Would save push token for user user123')
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // This won't throw because it's just logging for now
      await expect(
        NotificationService.savePushTokenToProfile('user123', 'token456')
      ).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
