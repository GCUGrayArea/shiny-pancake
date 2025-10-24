/**
 * Unread Message Count Service
 * Manages per-chat and global unread message counts
 */

import { getFirebaseDatabase } from './firebase';
import { ref, get, set, increment, onValue, off } from 'firebase/database';

/**
 * Get unread count for a specific chat
 */
export async function getChatUnreadCount(
  chatId: string,
  userId: string
): Promise<number> {
  try {
    const database = getFirebaseDatabase();
    const unreadRef = ref(database, `/chats/${chatId}/unreadCount/${userId}`);
    const snapshot = await get(unreadRef);
    return snapshot.val() || 0;
  } catch (error) {
    console.error('Error getting chat unread count:', error);
    return 0;
  }
}

/**
 * Get total unread count across all chats for a user
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  try {
    const database = getFirebaseDatabase();
    const chatsRef = ref(database, '/chats');
    const snapshot = await get(chatsRef);

    if (!snapshot.exists()) {
      return 0;
    }

    let total = 0;
    snapshot.forEach((chatSnapshot) => {
      const chat = chatSnapshot.val();
      // Check if user is a participant
      const participantIds = Array.isArray(chat.participantIds)
        ? chat.participantIds
        : Object.keys(chat.participantIds || {});
      if (participantIds.includes(userId)) {
        const unreadCount = chat.unreadCount?.[userId] || 0;
        total += unreadCount;
      }
    });

    return total;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
}

/**
 * Mark chat as read (clear unread count)
 */
export async function markChatAsRead(
  chatId: string,
  userId: string
): Promise<void> {
  try {
    const database = getFirebaseDatabase();
    const unreadRef = ref(database, `/chats/${chatId}/unreadCount/${userId}`);
    await set(unreadRef, 0);
  } catch (error) {
    console.error('Error marking chat as read:', error);
  }
}

/**
 * Increment unread count for a chat
 * This is called by Cloud Functions when a new message arrives
 */
export async function incrementUnreadCount(
  chatId: string,
  userId: string
): Promise<void> {
  try {
    const database = getFirebaseDatabase();
    const unreadRef = ref(database, `/chats/${chatId}/unreadCount/${userId}`);
    await set(unreadRef, increment(1));
  } catch (error) {
    console.error('Error incrementing unread count:', error);
  }
}

/**
 * Subscribe to unread count changes for a specific chat
 * Returns an unsubscribe function
 */
export function subscribeToChatUnreadCount(
  chatId: string,
  userId: string,
  callback: (count: number) => void
): () => void {
  const database = getFirebaseDatabase();
  const unreadRef = ref(database, `/chats/${chatId}/unreadCount/${userId}`);

  const listener = onValue(unreadRef, (snapshot) => {
    const count = snapshot.val() || 0;
    callback(count);
  });

  // Return unsubscribe function
  return () => {
    off(unreadRef, 'value', listener);
  };
}

/**
 * Subscribe to total unread count changes across all chats
 * Returns an unsubscribe function
 */
export function subscribeToTotalUnreadCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const database = getFirebaseDatabase();
  const chatsRef = ref(database, '/chats');

  const listener = onValue(chatsRef, (snapshot) => {
    let total = 0;

    if (snapshot.exists()) {
      snapshot.forEach((chatSnapshot) => {
        const chat = chatSnapshot.val();
        const participantIds = Array.isArray(chat.participantIds)
          ? chat.participantIds
          : Object.keys(chat.participantIds || {});
        if (participantIds.includes(userId)) {
          const unreadCount = chat.unreadCount?.[userId] || 0;
          total += unreadCount;
        }
      });
    }

    callback(total);
  });

  // Return unsubscribe function
  return () => {
    off(chatsRef, 'value', listener);
  };
}

/**
 * Get unread counts for all chats for a user
 * Returns a map of chatId -> unread count
 */
export async function getAllChatUnreadCounts(
  userId: string
): Promise<Map<string, number>> {
  try {
    const database = getFirebaseDatabase();
    const chatsRef = ref(database, '/chats');
    const snapshot = await get(chatsRef);

    const counts = new Map<string, number>();

    if (snapshot.exists()) {
      snapshot.forEach((chatSnapshot) => {
        const chatId = chatSnapshot.key;
        const chat = chatSnapshot.val();

        const participantIds = Array.isArray(chat.participantIds)
          ? chat.participantIds
          : Object.keys(chat.participantIds || {});
        if (participantIds.includes(userId) && chatId) {
          const unreadCount = chat.unreadCount?.[userId] || 0;
          counts.set(chatId, unreadCount);
        }
      });
    }

    return counts;
  } catch (error) {
    console.error('Error getting all chat unread counts:', error);
    return new Map();
  }
}
