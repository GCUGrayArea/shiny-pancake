/**
 * Notification Manager
 * Central coordinator for showing notifications based on incoming messages
 * Works with NotificationContext to determine when to show notifications
 */

import type { Message, Chat, User } from '../types';
import * as NotificationService from './notification.service';
import * as LocalChatService from './local-chat.service';
import * as LocalUserService from './local-user.service';

// Track which chat the user is currently viewing (to suppress notifications)
let currentViewingChatId: string | null = null;
let currentUserId: string | null = null;
let loginTimestamp: number | null = null;

/**
 * Set the chat the user is currently viewing
 * Notifications for this chat will be suppressed
 */
export function setCurrentViewingChat(chatId: string | null): void {
  currentViewingChatId = chatId;
  console.log('📱 Notification Manager: Current viewing chat set to', chatId);
}

/**
 * Set the current logged-in user
 * Needed to filter out notifications for user's own messages
 * Also records login time to prevent notifications for historical messages
 */
export function setCurrentUser(userId: string | null): void {
  currentUserId = userId;
  
  if (userId) {
    // Record when user logged in (with 5 second buffer for clock skew)
    loginTimestamp = Date.now() - 5000;
    console.log('📱 Notification Manager: Current user set to', userId, '| Login time:', new Date(loginTimestamp).toISOString());
  } else {
    loginTimestamp = null;
    console.log('📱 Notification Manager: Current user cleared');
  }
}

/**
 * Handle a new message and potentially show a notification
 * This is called by sync.service when a message is received
 */
export async function handleNewMessage(message: Message): Promise<void> {
  try {
    // Don't notify for own messages
    if (message.senderId === currentUserId) {
      return;
    }

    // Don't notify for historical messages (messages from before login)
    // This prevents notification spam when syncing old messages on login
    if (loginTimestamp && message.timestamp < loginTimestamp) {
      console.log('🔕 Suppressing notification - historical message (before login)');
      return;
    }

    // Don't notify if user is currently viewing this chat
    if (message.chatId === currentViewingChatId) {
      console.log('🔕 Suppressing notification - user is viewing this chat');
      return;
    }

    // Fetch chat and sender info from local database
    const [chatResult, senderResult] = await Promise.all([
      LocalChatService.getChat(message.chatId),
      LocalUserService.getUser(message.senderId),
    ]);

    if (!chatResult.success || !chatResult.data) {
      console.error('Failed to fetch chat for notification:', chatResult.error);
      return;
    }

    if (!senderResult.success || !senderResult.data) {
      console.error('Failed to fetch sender for notification:', senderResult.error);
      return;
    }

    const chat = chatResult.data;
    const sender = senderResult.data;

    // Schedule notification
    console.log('🔔 Showing notification for message:', {
      chatId: message.chatId,
      sender: sender.displayName,
      type: message.type,
    });

    await NotificationService.scheduleMessageNotification(
      message,
      chat,
      sender,
      currentUserId || ''
    );
  } catch (error) {
    console.error('Error handling new message notification:', error);
  }
}

/**
 * Clear all notifications (called when app comes to foreground)
 */
export async function clearNotifications(): Promise<void> {
  await NotificationService.clearAllNotifications();
  await NotificationService.setBadgeCount(0);
}


