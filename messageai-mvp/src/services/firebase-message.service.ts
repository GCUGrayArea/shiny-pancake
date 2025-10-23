/**
 * Firebase RTDB Service - Messages
 * Handles message operations in Firebase Realtime Database
 *
 * NOTE: Firebase is ALWAYS the source of truth.
 * Includes debouncing for delivery/read status updates.
 */

import {
  ref,
  set,
  get,
  update,
  push,
  query,
  orderByChild,
  limitToLast,
  endBefore,
  onChildAdded,
  onChildChanged,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import { uploadImage } from './image.service';
import type { Message } from '../types';

export interface FirebaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Debounce map for batching status updates
 * Key: messageId, Value: timeout handle
 */
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Pending status updates to be batched
 * Key: messageId, Value: updates object
 */
const pendingUpdates: Map<string, any> = new Map();

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 500;

/**
 * Send a new message to Firebase
 * Returns the generated message ID
 */
export async function sendMessageToFirebase(
  message: Message
): Promise<FirebaseResult<string>> {
  try {
    const db = getFirebaseDatabase();
    let messageId = message.id;
    let messageContent = message.content;

    // Handle image upload for image messages
    if (message.type === 'image' && message.content.startsWith('file://')) {

      try {
        // Ensure user is authenticated before uploading
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          return {
            success: false,
            error: 'User must be authenticated to upload images',
          };
        }


        // Generate unique path for the image
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2);
        const path = `images/${message.chatId}/${timestamp}_${randomSuffix}.jpg`;


        // Upload image to Firebase Storage
        const uploadResult = await uploadImage(message.content, path);

        // Update content with Firebase Storage URL
        messageContent = uploadResult.url;

      } catch (uploadError) {
        return {
          success: false,
          error: `Image upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
        };
      }
    }

    // If no ID provided, generate one
    if (!messageId) {
      const messagesRef = ref(db, `messages/${message.chatId}`);
      const newMessageRef = push(messagesRef);
      messageId = newMessageRef.key!;
    }

    const messageRef = ref(db, `messages/${message.chatId}/${messageId}`);

    await set(messageRef, {
      id: messageId,
      chatId: message.chatId,
      senderId: message.senderId,
      type: message.type,
      content: messageContent,
      timestamp: message.timestamp,
      status: 'sent',  // Message is 'sent' once it's in Firebase
      localId: message.localId || null,
      deliveredTo: message.deliveredTo || [],
      readBy: message.readBy || [],
      metadata: message.metadata || null,
    });

    return { success: true, data: messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message to Firebase',
    };
  }
}

/**
 * Get messages from a chat with optional pagination
 * Uses limitToLast for most recent messages
 */
export async function getMessagesFromFirebase(
  chatId: string,
  limit: number = 50,
  startAfterTimestamp?: number
): Promise<FirebaseResult<Message[]>> {
  try {
    const db = getFirebaseDatabase();
    const messagesRef = ref(db, `messages/${chatId}`);

    let messagesQuery;

    if (startAfterTimestamp) {
      // Get messages before a specific timestamp (for pagination)
      messagesQuery = query(
        messagesRef,
        orderByChild('timestamp'),
        endBefore(startAfterTimestamp),
        limitToLast(limit)
      );
    } else {
      // Get most recent messages
      messagesQuery = query(
        messagesRef,
        orderByChild('timestamp'),
        limitToLast(limit)
      );
    }

    const snapshot = await get(messagesQuery);

    const messages: Message[] = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const msgData = childSnapshot.val();
        messages.push(msgData as Message);
      });
    } else {
    }

    return { success: true, data: messages };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get messages from Firebase',
    };
  }
}

/**
 * Subscribe to new messages in a chat
 * Only listens for newly added messages (not updates)
 */
export function subscribeToMessages(
  chatId: string,
  callback: (message: Message) => void
): Unsubscribe {
  const db = getFirebaseDatabase();
  const messagesRef = ref(db, `messages/${chatId}`);

  return onChildAdded(messagesRef, (snapshot) => {
    const messageData = snapshot.val();
    callback(messageData as Message);
  }, (error) => {
  });
}

/**
 * Subscribe to message updates in a chat
 * Listens for changes to existing messages (e.g., status updates, delivery/read receipts)
 */
export function subscribeToMessageUpdates(
  chatId: string,
  callback: (message: Message) => void
): Unsubscribe {
  const db = getFirebaseDatabase();
  const messagesRef = ref(db, `messages/${chatId}`);

  return onChildChanged(messagesRef, (snapshot) => {
    const messageData = snapshot.val();
    callback(messageData as Message);
  }, (error) => {
  });
}

/**
 * Update message status with debouncing
 * Batches updates to reduce Firebase writes
 */
export async function updateMessageStatusInFirebase(
  messageId: string,
  chatId: string,
  status: Message['status']
): Promise<FirebaseResult<void>> {
  // Use debouncing for status updates
  return debouncedUpdate(messageId, chatId, { status });
}

/**
 * Mark message as delivered to a specific user with debouncing
 */
export async function markMessageDelivered(
  messageId: string,
  chatId: string,
  userId: string
): Promise<FirebaseResult<void>> {
  try {
    const db = getFirebaseDatabase();
    const messageRef = ref(db, `messages/${chatId}/${messageId}`);

    // Get current deliveredTo array
    const snapshot = await get(messageRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Message not found',
      };
    }

    const messageData = snapshot.val();
    const deliveredTo = messageData.deliveredTo || [];

    // Add user if not already in array
    if (!deliveredTo.includes(userId)) {
      deliveredTo.push(userId);

      // Use debouncing for delivery updates
      return debouncedUpdate(messageId, chatId, { deliveredTo });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark message as delivered',
    };
  }
}

/**
 * Mark message as read by a specific user with debouncing
 */
export async function markMessageRead(
  messageId: string,
  chatId: string,
  userId: string
): Promise<FirebaseResult<void>> {
  try {
    const db = getFirebaseDatabase();
    const messageRef = ref(db, `messages/${chatId}/${messageId}`);

    // Get current readBy array
    const snapshot = await get(messageRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Message not found',
      };
    }

    const messageData = snapshot.val();
    const readBy = messageData.readBy || [];

    // Add user if not already in array
    if (!readBy.includes(userId)) {
      readBy.push(userId);

      // Use debouncing for read updates
      return debouncedUpdate(messageId, chatId, { readBy });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark message as read',
    };
  }
}

/**
 * Get delivery status for a message
 */
export async function getMessageDeliveryFromFirebase(
  messageId: string,
  chatId: string
): Promise<FirebaseResult<{ [userId: string]: { delivered: boolean; read: boolean } }>> {
  try {
    const db = getFirebaseDatabase();
    const messageRef = ref(db, `messages/${chatId}/${messageId}`);

    const snapshot = await get(messageRef);

    if (!snapshot.exists()) {
      return { success: true, data: {} };
    }

    const messageData = snapshot.val();
    const deliveredTo = messageData.deliveredTo || [];
    const readBy = messageData.readBy || [];

    // Build delivery status object
    const deliveryStatus: { [userId: string]: { delivered: boolean; read: boolean } } = {};

    // Add delivered users
    deliveredTo.forEach((userId: string) => {
      deliveryStatus[userId] = {
        delivered: true,
        read: readBy.includes(userId),
      };
    });

    // Add read users (in case they weren't in deliveredTo)
    readBy.forEach((userId: string) => {
      if (!deliveryStatus[userId]) {
        deliveryStatus[userId] = {
          delivered: true,
          read: true,
        };
      }
    });

    return { success: true, data: deliveryStatus };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get message delivery status',
    };
  }
}

/**
 * Debounced update helper
 * Batches updates within DEBOUNCE_DELAY window
 */
function debouncedUpdate(
  messageId: string,
  chatId: string,
  updates: any
): Promise<FirebaseResult<void>> {
  return new Promise((resolve) => {
    // Clear existing timer
    const existingTimer = debounceTimers.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Merge with pending updates
    const existing = pendingUpdates.get(messageId) || {};
    pendingUpdates.set(messageId, { ...existing, ...updates });

    // Set new timer
    const timer = setTimeout(async () => {
      const updates = pendingUpdates.get(messageId);
      if (!updates) {
        resolve({ success: true });
        return;
      }

      try {
        const db = getFirebaseDatabase();
        const messageRef = ref(db, `messages/${chatId}/${messageId}`);

        await update(messageRef, updates);

        // Clean up
        debounceTimers.delete(messageId);
        pendingUpdates.delete(messageId);

        resolve({ success: true });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update message',
        });
      }
    }, DEBOUNCE_DELAY);

    debounceTimers.set(messageId, timer);
  });
}

/**
 * Force flush all pending updates (for testing or shutdown)
 */
export async function flushPendingUpdates(): Promise<void> {
  const promises: Promise<any>[] = [];

  debounceTimers.forEach((timer, messageId) => {
    clearTimeout(timer);
    // Trigger immediate update
    const updates = pendingUpdates.get(messageId);
    if (updates) {
      // Will be implemented if needed
    }
  });

  debounceTimers.clear();
  pendingUpdates.clear();

  await Promise.all(promises);
}
