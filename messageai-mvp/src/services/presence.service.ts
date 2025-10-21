/**
 * Presence Service
 * Manages user online/offline status using Firebase Realtime Database
 *
 * Uses Firebase .info/connected for connection detection and onDisconnect()
 * for automatic cleanup when users go offline.
 * Integrates with React Native AppState for foreground/background detection.
 */

import { AppState, type AppStateStatus } from 'react-native';
import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  get,
  type Unsubscribe,
  type DatabaseReference,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebase';

/**
 * Presence data structure stored in Firebase
 */
interface PresenceData {
  isOnline: boolean;
  lastSeen: number;
}

/**
 * Callback for presence updates
 */
type PresenceCallback = (uid: string, isOnline: boolean, lastSeen: number) => void;

/**
 * Active presence listeners
 */
const activeListeners: Map<string, Unsubscribe> = new Map();

/**
 * Current app state subscription
 */
let appStateSubscription: any = null;

/**
 * Current user ID being tracked
 */
let currentUserId: string | null = null;

/**
 * Connection state listener
 */
let connectionListener: Unsubscribe | null = null;

/**
 * Set user as online in Firebase
 * Sets up onDisconnect hook to automatically mark offline when connection lost
 */
export async function setUserOnline(uid: string): Promise<void> {
  try {
    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${uid}`);

    // Set user as online
    await set(presenceRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
    });

    // Set up automatic offline on disconnect
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      isOnline: false,
      lastSeen: serverTimestamp(),
    });

    console.log(`User ${uid} marked as online`);
  } catch (error) {
    console.error('Error setting user online:', error);
    throw error;
  }
}

/**
 * Set user as offline in Firebase
 * Updates lastSeen timestamp
 */
export async function setUserOffline(uid: string): Promise<void> {
  try {
    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${uid}`);

    await set(presenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp(),
    });

    console.log(`User ${uid} marked as offline`);
  } catch (error) {
    console.error('Error setting user offline:', error);
    throw error;
  }
}

/**
 * Subscribe to a single user's presence updates
 * Returns unsubscribe function
 */
export function subscribeToUserPresence(
  uid: string,
  callback: PresenceCallback
): Unsubscribe {
  const db = getFirebaseDatabase();
  const presenceRef = ref(db, `presence/${uid}`);

  const unsubscribe = onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() as PresenceData | null;

    if (data) {
      callback(uid, data.isOnline, data.lastSeen);
    } else {
      // User has no presence data, assume offline
      callback(uid, false, Date.now());
    }
  });

  // Track listener for cleanup
  const listenerKey = `single_${uid}`;
  activeListeners.set(listenerKey, unsubscribe);

  // Return wrapped unsubscribe that also removes from tracking
  return () => {
    unsubscribe();
    activeListeners.delete(listenerKey);
  };
}

/**
 * Subscribe to multiple users' presence updates
 * More efficient than creating individual subscriptions
 */
export function subscribeToMultiplePresences(
  uids: string[],
  callback: PresenceCallback
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];

  // Create subscription for each user
  uids.forEach((uid) => {
    const unsubscribe = subscribeToUserPresence(uid, callback);
    unsubscribers.push(unsubscribe);
  });

  // Return function that unsubscribes all
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Handle app state changes (foreground/background)
 */
function handleAppStateChange(nextAppState: AppStateStatus): void {
  if (!currentUserId) {
    return;
  }

  if (nextAppState === 'active') {
    // App came to foreground - mark online
    setUserOnline(currentUserId).catch((error) => {
      console.error('Failed to set online on foreground:', error);
    });
  } else if (nextAppState === 'background' || nextAppState === 'inactive') {
    // App went to background - mark offline
    setUserOffline(currentUserId).catch((error) => {
      console.error('Failed to set offline on background:', error);
    });
  }
}

/**
 * Monitor Firebase connection state
 * Automatically sets user online when connection restored
 */
function setupConnectionMonitor(uid: string): void {
  const db = getFirebaseDatabase();
  const connectedRef = ref(db, '.info/connected');

  connectionListener = onValue(connectedRef, (snapshot) => {
    const isConnected = snapshot.val() === true;

    if (isConnected) {
      console.log('Firebase connection established');
      // Set user online (this also sets up onDisconnect)
      setUserOnline(uid).catch((error) => {
        console.error('Failed to set online on reconnection:', error);
      });
    } else {
      console.log('Firebase connection lost');
      // Firebase will automatically trigger onDisconnect
      // No need to manually set offline
    }
  });
}

/**
 * Initialize the presence system for a user
 * Sets up app state monitoring and connection monitoring
 */
export async function setupPresenceSystem(uid: string): Promise<void> {
  // Clean up any existing system
  teardownPresenceSystem();

  currentUserId = uid;

  // Set initial online state
  await setUserOnline(uid);

  // Set up app state monitoring
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Set up connection monitoring
  setupConnectionMonitor(uid);

  console.log(`Presence system initialized for user ${uid}`);
}

/**
 * Tear down the presence system
 * Cleans up all listeners and sets user offline
 */
export async function teardownPresenceSystem(): Promise<void> {
  // Remove app state listener
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  // Remove connection listener
  if (connectionListener) {
    connectionListener();
    connectionListener = null;
  }

  // Clean up all presence listeners
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners.clear();

  // Set user offline
  if (currentUserId) {
    await setUserOffline(currentUserId);
    currentUserId = null;
  }

  console.log('Presence system torn down');
}

/**
 * Get current presence status for a user
 * One-time read, does not set up a listener
 */
export async function getUserPresence(
  uid: string
): Promise<{ isOnline: boolean; lastSeen: number }> {
  try {
    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${uid}`);
    const snapshot = await get(presenceRef);

    const data = snapshot.val() as PresenceData | null;

    if (data) {
      return {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
      };
    }

    // No presence data - assume offline
    return {
      isOnline: false,
      lastSeen: Date.now(),
    };
  } catch (error) {
    console.error('Error getting user presence:', error);
    // Return offline status on error
    return {
      isOnline: false,
      lastSeen: Date.now(),
    };
  }
}
