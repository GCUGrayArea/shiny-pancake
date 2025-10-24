/**
 * Notification Service
 * Handles local notification scheduling, permissions, and display
 * 
 * This is a client-side implementation that works with Expo Go.
 * For true background/killed state support, this will need to be
 * upgraded to FCM with Cloud Functions (see POST_MVP_NOTIFICATIONS_UPGRADE.md)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Message, Chat, User } from '../types';

/**
 * Notification data payload for deep linking
 */
export interface NotificationData extends Record<string, unknown> {
  chatId: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  type: 'message';
}

/**
 * Configure how notifications are displayed when app is in foreground
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Configure notification channel for Android
 * Required for Android 8.0+ to show notifications
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });
  }
}

/**
 * Request notification permissions from the user
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Get the current notification permissions status
 */
export async function getNotificationPermissionsStatus(): Promise<string> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    return 'undetermined';
  }
}

/**
 * Schedule a local notification for a new message
 * This works reliably in foreground and recently-backgrounded app states
 */
export async function scheduleMessageNotification(
  message: Message,
  chat: Chat,
  sender: User,
  currentUserId: string
): Promise<string | null> {
  try {
    // Don't notify for own messages
    if (message.senderId === currentUserId) {
      return null;
    }

    // Format notification content based on message type and chat type
    const title = chat.type === 'group' 
      ? `${sender.displayName} in ${chat.name || 'Group Chat'}`
      : sender.displayName;

    const body = message.type === 'text'
      ? message.content.length > 100 
        ? `${message.content.substring(0, 97)}...`
        : message.content
      : '📷 Photo';

    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          chatId: message.chatId,
          messageId: message.id,
          senderId: message.senderId,
          senderName: sender.displayName,
          type: 'message',
        } as NotificationData,
        sound: 'default',
        badge: 1,
      },
      trigger: null, // Show immediately
    });

    return notificationId;
  } catch (error) {
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
  }
}

/**
 * Set the app badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
  }
}

/**
 * Clear all delivered notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
  }
}

/**
 * Get push notification token from Expo
 * Returns the device's push token for FCM/APNS
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Check if we have permission first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // TODO: Replace with actual Expo project ID
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to user profile in Firebase
 */
export async function savePushTokenToProfile(
  userId: string,
  token: string
): Promise<void> {
  try {
    // This will be implemented by the auth service
    // For now, just log it
    console.log(`Would save push token for user ${userId}: ${token}`);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

