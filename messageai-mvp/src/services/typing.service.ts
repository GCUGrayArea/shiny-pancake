/**
 * Typing Service
 * Manages typing indicators using Firebase Realtime Database
 *
 * Uses Firebase onDisconnect() for automatic cleanup when users disconnect.
 * Implements throttling to reduce Firebase writes and debouncing for better UX.
 */

import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  remove,
  type Unsubscribe,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebase';

/**
 * Typing data structure stored in Firebase
 */
interface TypingData {
  isTyping: boolean;
  timestamp: number;
}

/**
 * Typing state for a user in a chat
 */
export interface TypingUser {
  uid: string;
  isTyping: boolean;
  timestamp: number;
}

/**
 * Callback for typing updates
 */
type TypingCallback = (typingUsers: TypingUser[]) => void;

/**
 * Active typing listeners by chatId
 */
const activeListeners: Map<string, Unsubscribe> = new Map();

/**
 * Last typing update timestamps to implement throttling
 * Key: `${chatId}_${userId}`
 */
const lastUpdateTimes: Map<string, number> = new Map();

/**
 * Throttle duration in milliseconds (max one update per 2 seconds)
 */
const THROTTLE_MS = 2000;

/**
 * Auto-clear timeout handles
 * Key: `${chatId}_${userId}`
 */
const autoClearTimeouts: Map<string, NodeJS.Timeout> = new Map();

/**
 * Auto-clear duration in milliseconds (5 seconds of inactivity)
 */
const AUTO_CLEAR_MS = 5000;

/**
 * Set user typing state in a chat
 * Implements throttling to reduce Firebase writes
 * Sets up onDisconnect to clear state automatically
 */
export async function setTyping(
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const db = getFirebaseDatabase();
    const typingRef = ref(db, `typing/${chatId}/${userId}`);
    const throttleKey = `${chatId}_${userId}`;

    // Check throttling (only for setting to true, always allow clearing)
    if (isTyping) {
      const lastUpdate = lastUpdateTimes.get(throttleKey) || 0;
      const now = Date.now();

      if (now - lastUpdate < THROTTLE_MS) {
        // Skip this update due to throttling
        return;
      }

      lastUpdateTimes.set(throttleKey, now);
    } else {
      // Clear throttle tracking when setting to false
      lastUpdateTimes.delete(throttleKey);
    }

    if (isTyping) {
      // Set user as typing
      await set(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp(),
      });

      // Set up automatic clear on disconnect
      const disconnectRef = onDisconnect(typingRef);
      await disconnectRef.remove();

      // Set up auto-clear timeout
      setupAutoClear(chatId, userId);
    } else {
      // Clear typing state
      await remove(typingRef);
      clearAutoClear(chatId, userId);
    }
  } catch (error) {
    console.error('Error setting typing state:', error);
    throw error;
  }
}

/**
 * Clear typing state for a user in a chat
 */
export async function clearTyping(
  chatId: string,
  userId: string
): Promise<void> {
  await setTyping(chatId, userId, false);
}

/**
 * Set up auto-clear timeout
 * Automatically clears typing state after AUTO_CLEAR_MS of inactivity
 */
function setupAutoClear(chatId: string, userId: string): void {
  const key = `${chatId}_${userId}`;

  // Clear any existing timeout
  clearAutoClear(chatId, userId);

  // Set new timeout
  const timeout = setTimeout(() => {
    clearTyping(chatId, userId).catch(console.error);
  }, AUTO_CLEAR_MS);

  autoClearTimeouts.set(key, timeout);
}

/**
 * Clear auto-clear timeout
 */
function clearAutoClear(chatId: string, userId: string): void {
  const key = `${chatId}_${userId}`;
  const timeout = autoClearTimeouts.get(key);

  if (timeout) {
    clearTimeout(timeout);
    autoClearTimeouts.delete(key);
  }
}

/**
 * Subscribe to typing indicators for a chat
 * Returns unsubscribe function
 * Filters out the current user from typing updates
 */
export function subscribeToTyping(
  chatId: string,
  currentUserId: string,
  callback: TypingCallback
): Unsubscribe {
  const db = getFirebaseDatabase();
  const typingRef = ref(db, `typing/${chatId}`);

  const unsubscribe = onValue(typingRef, (snapshot) => {
    const data = snapshot.val() as Record<string, TypingData> | null;
    const typingUsers: TypingUser[] = [];

    if (data) {
      // Convert object to array and filter out current user
      Object.entries(data).forEach(([uid, typingData]) => {
        // Only include users who are currently typing and not the current user
        if (typingData.isTyping && uid !== currentUserId) {
          typingUsers.push({
            uid,
            isTyping: typingData.isTyping,
            timestamp: typingData.timestamp,
          });
        }
      });
    }

    callback(typingUsers);
  });

  // Track listener for cleanup
  activeListeners.set(chatId, unsubscribe);

  // Return wrapped unsubscribe that also removes from tracking
  return () => {
    unsubscribe();
    activeListeners.delete(chatId);
  };
}

/**
 * Clean up all typing listeners and timeouts
 */
export function cleanupTypingService(): void {
  // Unsubscribe from all listeners
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners.clear();

  // Clear all auto-clear timeouts
  autoClearTimeouts.forEach((timeout) => clearTimeout(timeout));
  autoClearTimeouts.clear();

  // Clear throttle tracking
  lastUpdateTimes.clear();
}
