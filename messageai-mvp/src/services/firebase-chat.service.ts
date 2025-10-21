/**
 * Firebase RTDB Service - Chats
 * Handles chat data operations in Firebase Realtime Database
 *
 * NOTE: Firebase is ALWAYS the source of truth.
 */

import {
  ref,
  set,
  get,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
  push,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { Chat } from '../types';

export interface FirebaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a new chat in Firebase
 * Returns the generated chat ID
 */
export async function createChatInFirebase(chat: Chat): Promise<FirebaseResult<string>> {
  try {
    const db = getFirebaseDatabase();
    let chatId = chat.id;

    // If no ID provided, generate one
    if (!chatId) {
      const chatsRef = ref(db, 'chats');
      const newChatRef = push(chatsRef);
      chatId = newChatRef.key!;
    }

    const chatRef = ref(db, `chats/${chatId}`);

    // Convert participantIds array to object for Firebase security rules
    const participantIdsObject: { [key: string]: boolean } = {};
    chat.participantIds.forEach(uid => {
      participantIdsObject[uid] = true;
    });

    // Convert unreadCounts to proper format
    const unreadCountsObject: { [key: string]: number } = {};
    if (chat.unreadCounts) {
      Object.keys(chat.unreadCounts).forEach(uid => {
        unreadCountsObject[uid] = chat.unreadCounts![uid];
      });
    }

    await set(chatRef, {
      id: chatId,
      type: chat.type,
      participantIds: participantIdsObject,
      name: chat.name || null,
      createdAt: chat.createdAt,
      lastMessage: chat.lastMessage || null,
      unreadCounts: unreadCountsObject,
    });

    return { success: true, data: chatId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chat in Firebase',
    };
  }
}

/**
 * Retrieve a chat from Firebase
 */
export async function getChatFromFirebase(chatId: string): Promise<FirebaseResult<Chat | null>> {
  try {
    const db = getFirebaseDatabase();
    const chatRef = ref(db, `chats/${chatId}`);

    const snapshot = await get(chatRef);

    if (!snapshot.exists()) {
      return { success: true, data: null };
    }

    const chatData = snapshot.val();

    // Convert participantIds object back to array
    const participantIds = chatData.participantIds
      ? Object.keys(chatData.participantIds)
      : [];

    const chat: Chat = {
      id: chatData.id,
      type: chatData.type,
      participantIds,
      name: chatData.name,
      createdAt: chatData.createdAt,
      lastMessage: chatData.lastMessage,
      unreadCounts: chatData.unreadCounts || {},
    };

    return { success: true, data: chat };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chat from Firebase',
    };
  }
}

/**
 * Update specific fields of a chat in Firebase
 */
export async function updateChatInFirebase(
  chatId: string,
  updates: Partial<Omit<Chat, 'id'>>
): Promise<FirebaseResult<void>> {
  try {
    const db = getFirebaseDatabase();
    const chatRef = ref(db, `chats/${chatId}`);

    const sanitizedUpdates: any = { ...updates };

    // Convert participantIds array to object if present
    if (sanitizedUpdates.participantIds) {
      const participantIdsObject: { [key: string]: boolean } = {};
      sanitizedUpdates.participantIds.forEach((uid: string) => {
        participantIdsObject[uid] = true;
      });
      sanitizedUpdates.participantIds = participantIdsObject;
    }

    // Don't allow updating the id field
    delete sanitizedUpdates.id;

    await update(chatRef, sanitizedUpdates);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update chat in Firebase',
    };
  }
}

/**
 * Subscribe to all chats for a specific user
 * Listens to the entire chats tree and filters client-side
 *
 * NOTE: This is not optimal for large datasets. Consider restructuring
 * to user-specific chat lists for production.
 */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void
): Unsubscribe {
  const db = getFirebaseDatabase();
  const chatsRef = ref(db, 'chats');

  return onValue(chatsRef, (snapshot) => {
    const chats: Chat[] = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const chatData = childSnapshot.val();

        // Check if user is a participant
        if (chatData.participantIds && chatData.participantIds[userId]) {
          const participantIds = Object.keys(chatData.participantIds);

          chats.push({
            id: chatData.id,
            type: chatData.type,
            participantIds,
            name: chatData.name,
            createdAt: chatData.createdAt,
            lastMessage: chatData.lastMessage,
            unreadCounts: chatData.unreadCounts || {},
          });
        }
      });
    }

    callback(chats);
  }, (error) => {
    console.error('Error in user chats subscription:', error);
    callback([]);
  });
}

/**
 * Subscribe to a specific chat
 */
export function subscribeToChat(
  chatId: string,
  callback: (chat: Chat | null) => void
): Unsubscribe {
  const db = getFirebaseDatabase();
  const chatRef = ref(db, `chats/${chatId}`);

  return onValue(chatRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const chatData = snapshot.val();
    const participantIds = chatData.participantIds
      ? Object.keys(chatData.participantIds)
      : [];

    const chat: Chat = {
      id: chatData.id,
      type: chatData.type,
      participantIds,
      name: chatData.name,
      createdAt: chatData.createdAt,
      lastMessage: chatData.lastMessage,
      unreadCounts: chatData.unreadCounts || {},
    };

    callback(chat);
  }, (error) => {
    console.error('Error in chat subscription:', error);
    callback(null);
  });
}

/**
 * Find existing 1:1 chat between two users, or create a new one
 * This prevents duplicate 1:1 chats
 *
 * Returns the chat ID
 */
export async function findOrCreateOneOnOneChat(
  userId1: string,
  userId2: string
): Promise<FirebaseResult<string>> {
  try {
    const db = getFirebaseDatabase();
    const chatsRef = ref(db, 'chats');

    // Get all chats
    const snapshot = await get(chatsRef);

    if (snapshot.exists()) {
      // Look for existing 1:1 chat with these two users
      let existingChatId: string | null = null;

      snapshot.forEach((childSnapshot) => {
        const chatData = childSnapshot.val();

        // Check if it's a 1:1 chat
        if (chatData.type === '1:1' && chatData.participantIds) {
          const participants = Object.keys(chatData.participantIds);

          // Check if both users are participants and no one else
          if (
            participants.length === 2 &&
            participants.includes(userId1) &&
            participants.includes(userId2)
          ) {
            existingChatId = chatData.id;
            return true; // Stop iteration
          }
        }
      });

      if (existingChatId) {
        return { success: true, data: existingChatId };
      }
    }

    // No existing chat found, create a new one
    const newChat: Chat = {
      id: '', // Will be generated
      type: '1:1',
      participantIds: [userId1, userId2],
      createdAt: Date.now(),
      unreadCounts: {
        [userId1]: 0,
        [userId2]: 0,
      },
    };

    return await createChatInFirebase(newChat);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find or create chat',
    };
  }
}
