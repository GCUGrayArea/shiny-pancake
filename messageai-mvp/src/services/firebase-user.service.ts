/**
 * Firebase RTDB Service - Users
 * Handles user data operations in Firebase Realtime Database
 *
 * NOTE: Firebase is ALWAYS the source of truth. All conflict resolution
 * should defer to Firebase data over local data.
 */

import {
  ref,
  set,
  get,
  update,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { getFirebaseDatabase } from './firebase';
import type { User } from '../types';

/**
 * Result type for Firebase operations
 * Maintains consistency with DbResult pattern from local services
 *
 * NOTE: May need to alter this pattern later for better error propagation
 */
export interface FirebaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create or update a user in Firebase
 * Uses set() to overwrite existing data (Firebase is source of truth)
 */
export async function createUserInFirebase(user: User): Promise<FirebaseResult<void>> {
  try {
    const db = getFirebaseDatabase();
    const userRef = ref(db, `users/${user.uid}`);

    await set(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      fcmToken: user.fcmToken || null,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user in Firebase',
    };
  }
}

/**
 * Retrieve a user from Firebase
 */
export async function getUserFromFirebase(uid: string): Promise<FirebaseResult<User | null>> {
  try {
    const db = getFirebaseDatabase();
    const userRef = ref(db, `users/${uid}`);

    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return { success: true, data: null };
    }

    const userData = snapshot.val();
    return {
      success: true,
      data: userData as User,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user from Firebase',
    };
  }
}

/**
 * Update specific fields of a user in Firebase
 * Uses update() for partial updates with debouncing support
 */
export async function updateUserInFirebase(
  uid: string,
  updates: Partial<Omit<User, 'uid'>>
): Promise<FirebaseResult<void>> {
  try {
    const db = getFirebaseDatabase();
    const userRef = ref(db, `users/${uid}`);

    // Ensure we don't try to update the uid field
    const sanitizedUpdates = { ...updates };
    delete (sanitizedUpdates as any).uid;

    await update(userRef, sanitizedUpdates);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user in Firebase',
    };
  }
}

/**
 * Subscribe to real-time updates for a specific user
 * Returns an unsubscribe function to clean up the listener
 */
export function subscribeToUser(
  uid: string,
  callback: (user: User | null) => void
): Unsubscribe {
  const db = getFirebaseDatabase();
  const userRef = ref(db, `users/${uid}`);

  return onValue(userRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const userData = snapshot.val() as User;
    callback(userData);
  }, (error) => {
    callback(null);
  });
}

/**
 * Search for users by display name or email
 * Returns users whose displayName starts with the query string
 *
 * Note: Firebase RTDB has limited query capabilities. For better search,
 * consider using Algolia or similar in production.
 */
export async function searchUsers(searchQuery: string): Promise<FirebaseResult<User[]>> {
  try {
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return { success: true, data: [] };
    }

    const db = getFirebaseDatabase();
    const usersRef = ref(db, 'users');

    const queryString = searchQuery.trim();
    const users: User[] = [];

    // Get all users and filter client-side for better search capabilities
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val() as User;

        // Search by display name (case-insensitive partial match)
        if (user.displayName && user.displayName.toLowerCase().includes(queryString.toLowerCase())) {
          users.push(user);
          return;
        }

        // Search by email (case-insensitive partial match)
        if (user.email && user.email.toLowerCase().includes(queryString.toLowerCase())) {
          users.push(user);
          return;
        }

        // If query looks like an email, try exact email match
        if (queryString.includes('@') && user.email && user.email.toLowerCase() === queryString.toLowerCase()) {
          users.push(user);
        }
      });
    } else {
    }

    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search users',
    };
  }
}

/**
 * Get all users from Firebase (for contact list)
 * Use with caution - should implement pagination for large user bases
 */
export async function getAllUsersFromFirebase(): Promise<FirebaseResult<User[]>> {
  try {
    const db = getFirebaseDatabase();
    const usersRef = ref(db, 'users');

    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      return { success: true, data: [] };
    }

    const users: User[] = [];
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val() as User;
      users.push(user);
    });

    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get all users',
    };
  }
}
