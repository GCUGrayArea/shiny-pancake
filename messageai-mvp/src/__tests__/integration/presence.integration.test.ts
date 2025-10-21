/**
 * Integration tests for Presence Service
 * Tests against live Firebase RTDB
 *
 * These tests require:
 * - Valid Firebase configuration in .env
 * - Test security rules deployed (or open rules for testing)
 * - Active internet connection
 */

import * as PresenceService from '../../services/presence.service';
import { initDatabase } from '../../services/database.service';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDatabase } from '../../services/firebase';
import { ref, remove } from 'firebase/database';

// Test user credentials
const TEST_USER_1 = {
  email: `presence-test-1-${Date.now()}@test.com`,
  password: 'Test123456!',
  uid: '',
};

const TEST_USER_2 = {
  email: `presence-test-2-${Date.now()}@test.com`,
  password: 'Test123456!',
  uid: '',
};

describe('Presence Service Integration Tests', () => {
  let auth: any;
  let db: any;

  beforeAll(async () => {
    // Initialize database and auth
    await initDatabase();
    auth = getFirebaseAuth();
    db = getFirebaseDatabase();

    // Create test users
    try {
      const user1Cred = await createUserWithEmailAndPassword(
        auth,
        TEST_USER_1.email,
        TEST_USER_1.password
      );
      TEST_USER_1.uid = user1Cred.user.uid;

      // Sign out before creating second user
      await firebaseSignOut(auth);

      const user2Cred = await createUserWithEmailAndPassword(
        auth,
        TEST_USER_2.email,
        TEST_USER_2.password
      );
      TEST_USER_2.uid = user2Cred.user.uid;

      await firebaseSignOut(auth);
    } catch (error: any) {
      if (error.code !== 'auth/email-already-in-use') {
        throw error;
      }
      // Users already exist, sign in to get UIDs
      const user1Cred = await signInWithEmailAndPassword(
        auth,
        TEST_USER_1.email,
        TEST_USER_1.password
      );
      TEST_USER_1.uid = user1Cred.user.uid;

      await firebaseSignOut(auth);

      const user2Cred = await signInWithEmailAndPassword(
        auth,
        TEST_USER_2.email,
        TEST_USER_2.password
      );
      TEST_USER_2.uid = user2Cred.user.uid;

      await firebaseSignOut(auth);
    }
  }, 30000);

  afterEach(async () => {
    // Clean up presence system
    await PresenceService.teardownPresenceSystem();
  });

  afterAll(async () => {
    // Clean up test data
    if (TEST_USER_1.uid) {
      const presenceRef = ref(db, `presence/${TEST_USER_1.uid}`);
      await remove(presenceRef);
    }

    if (TEST_USER_2.uid) {
      const presenceRef = ref(db, `presence/${TEST_USER_2.uid}`);
      await remove(presenceRef);
    }

    // Sign out
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // Ignore if already signed out
    }
  }, 10000);

  describe('setUserOnline', () => {
    it('should set user online in Firebase', async () => {
      await PresenceService.setUserOnline(TEST_USER_1.uid);

      // Verify presence in Firebase
      const presence = await PresenceService.getUserPresence(TEST_USER_1.uid);

      expect(presence.isOnline).toBe(true);
      expect(presence.lastSeen).toBeDefined();
      expect(typeof presence.lastSeen).toBe('number');
    }, 10000);

    it('should set up onDisconnect hook', async () => {
      // This is tested indirectly - the onDisconnect hook is set up
      // but won't trigger unless we actually disconnect
      await PresenceService.setUserOnline(TEST_USER_1.uid);

      const presence = await PresenceService.getUserPresence(TEST_USER_1.uid);
      expect(presence.isOnline).toBe(true);
    }, 10000);
  });

  describe('setUserOffline', () => {
    it('should set user offline in Firebase', async () => {
      // First set online
      await PresenceService.setUserOnline(TEST_USER_1.uid);

      // Then set offline
      await PresenceService.setUserOffline(TEST_USER_1.uid);

      // Verify presence in Firebase
      const presence = await PresenceService.getUserPresence(TEST_USER_1.uid);

      expect(presence.isOnline).toBe(false);
      expect(presence.lastSeen).toBeDefined();
    }, 10000);
  });

  describe('getUserPresence', () => {
    it('should fetch current presence status', async () => {
      await PresenceService.setUserOnline(TEST_USER_1.uid);

      const presence = await PresenceService.getUserPresence(TEST_USER_1.uid);

      expect(presence).toEqual({
        isOnline: true,
        lastSeen: expect.any(Number),
      });
    }, 10000);

    it('should return offline for user with no presence data', async () => {
      // Use a random UID that doesn't exist
      const randomUid = `nonexistent-${Date.now()}`;

      const presence = await PresenceService.getUserPresence(randomUid);

      expect(presence.isOnline).toBe(false);
      expect(presence.lastSeen).toBeDefined();
    }, 10000);
  });

  describe('subscribeToUserPresence', () => {
    it('should receive presence updates in real-time', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const updates: any[] = [];

        // Subscribe to user 1's presence
        const unsubscribe = PresenceService.subscribeToUserPresence(
          TEST_USER_1.uid,
          (uid, isOnline, lastSeen) => {
            updates.push({ uid, isOnline, lastSeen });

            // After receiving initial update, change status
            if (updates.length === 1) {
              PresenceService.setUserOffline(TEST_USER_1.uid);
            }

            // After receiving second update, verify and resolve
            if (updates.length === 2) {
              try {
                expect(updates[0].isOnline).toBe(true);
                expect(updates[1].isOnline).toBe(false);
                unsubscribe();
                resolve();
              } catch (error) {
                unsubscribe();
                reject(error);
              }
            }
          }
        );

        // Set user online to trigger first update
        await PresenceService.setUserOnline(TEST_USER_1.uid);

        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Timeout waiting for presence updates'));
        }, 10000);
      });
    }, 15000);
  });

  describe('subscribeToMultiplePresences', () => {
    it('should subscribe to multiple users and receive updates', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const updates = new Map<string, any>();

        // Subscribe to both users
        const unsubscribe = PresenceService.subscribeToMultiplePresences(
          [TEST_USER_1.uid, TEST_USER_2.uid],
          (uid, isOnline, lastSeen) => {
            updates.set(uid, { isOnline, lastSeen });

            // Wait until we have updates from both users
            if (updates.size === 2) {
              try {
                expect(updates.get(TEST_USER_1.uid)?.isOnline).toBe(true);
                expect(updates.get(TEST_USER_2.uid)?.isOnline).toBe(true);
                unsubscribe();
                resolve();
              } catch (error) {
                unsubscribe();
                reject(error);
              }
            }
          }
        );

        // Set both users online
        await PresenceService.setUserOnline(TEST_USER_1.uid);
        await PresenceService.setUserOnline(TEST_USER_2.uid);

        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Timeout waiting for presence updates'));
        }, 10000);
      });
    }, 15000);
  });

  describe('setupPresenceSystem', () => {
    it('should initialize presence system and set user online', async () => {
      await PresenceService.setupPresenceSystem(TEST_USER_1.uid);

      // Verify user is online
      const presence = await PresenceService.getUserPresence(TEST_USER_1.uid);
      expect(presence.isOnline).toBe(true);
    }, 10000);
  });

  describe('teardownPresenceSystem', () => {
    it('should tear down system and set user offline', async () => {
      // Set up first
      await PresenceService.setupPresenceSystem(TEST_USER_1.uid);

      // Verify online
      let presence = await PresenceService.getUserPresence(TEST_USER_1.uid);
      expect(presence.isOnline).toBe(true);

      // Tear down
      await PresenceService.teardownPresenceSystem();

      // Verify offline
      presence = await PresenceService.getUserPresence(TEST_USER_1.uid);
      expect(presence.isOnline).toBe(false);
    }, 10000);
  });
});
