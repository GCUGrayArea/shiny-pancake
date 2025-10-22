/**
 * Integration tests for Firebase User Service
 * These tests connect to actual Firebase instance
 */

import {
  createUserInFirebase,
  getUserFromFirebase,
  updateUserInFirebase,
  subscribeToUser,
  searchUsers,
  getAllUsersFromFirebase,
} from '../services/firebase-user.service';
import type { User } from '../types';

// Test user data
const testUser1: User = {
  uid: 'test-user-1-integration',
  email: 'testuser1@integration.test',
  displayName: 'Test User One',
  createdAt: Date.now(),
  lastSeen: Date.now(),
  isOnline: false,
  fcmToken: 'test-fcm-token-1',
};

const testUser2: User = {
  uid: 'test-user-2-integration',
  email: 'testuser2@integration.test',
  displayName: 'Test User Two',
  createdAt: Date.now(),
  lastSeen: Date.now(),
  isOnline: true,
};

describe('Firebase User Service - Integration Tests', () => {
  // Cleanup function to remove test data
  afterAll(async () => {
    // Clean up test users
    const { getFirebaseDatabase } = require('../services/firebase');
    const { ref, remove } = require('firebase/database');
    const db = getFirebaseDatabase();

    try {
      await remove(ref(db, `users/${testUser1.uid}`));
      await remove(ref(db, `users/${testUser2.uid}`));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('createUserInFirebase', () => {
    it('should create a new user in Firebase', async () => {
      const result = await createUserInFirebase(testUser1);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should overwrite existing user (Firebase is source of truth)', async () => {
      // Create initial user
      await createUserInFirebase(testUser1);

      // Update with new data
      const updatedUser = {
        ...testUser1,
        displayName: 'Updated Name',
        isOnline: true,
      };

      const result = await createUserInFirebase(updatedUser);

      expect(result.success).toBe(true);

      // Verify the update
      const getResult = await getUserFromFirebase(testUser1.uid);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.displayName).toBe('Updated Name');
      expect(getResult.data?.isOnline).toBe(true);
    });
  });

  describe('getUserFromFirebase', () => {
    beforeAll(async () => {
      await createUserInFirebase(testUser1);
    });

    it('should retrieve an existing user', async () => {
      const result = await getUserFromFirebase(testUser1.uid);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.uid).toBe(testUser1.uid);
      expect(result.data?.email).toBe(testUser1.email);
      expect(result.data?.displayName).toBe(testUser1.displayName);
    });

    it('should return null for non-existent user', async () => {
      const result = await getUserFromFirebase('non-existent-user-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateUserInFirebase', () => {
    beforeAll(async () => {
      await createUserInFirebase(testUser1);
    });

    it('should update specific fields of a user', async () => {
      const updates = {
        displayName: 'Updated Display Name',
        isOnline: true,
        lastSeen: Date.now(),
      };

      const result = await updateUserInFirebase(testUser1.uid, updates);

      expect(result.success).toBe(true);

      // Verify the update
      const getResult = await getUserFromFirebase(testUser1.uid);
      expect(getResult.data?.displayName).toBe('Updated Display Name');
      expect(getResult.data?.isOnline).toBe(true);
      // Original fields should remain unchanged
      expect(getResult.data?.email).toBe(testUser1.email);
    });

    it('should update FCM token', async () => {
      const newToken = 'new-fcm-token-xyz';
      const result = await updateUserInFirebase(testUser1.uid, {
        fcmToken: newToken,
      });

      expect(result.success).toBe(true);

      const getResult = await getUserFromFirebase(testUser1.uid);
      expect(getResult.data?.fcmToken).toBe(newToken);
    });
  });

  describe('subscribeToUser', () => {
    beforeAll(async () => {
      await createUserInFirebase(testUser2);
    });

    it('should receive real-time updates when user changes', (done) => {
      let callCount = 0;

      const unsubscribe = subscribeToUser(testUser2.uid, (user) => {
        callCount++;

        if (callCount === 1) {
          // First call - initial data
          expect(user).toBeDefined();
          expect(user?.uid).toBe(testUser2.uid);
          expect(user?.displayName).toBe('Test User Two');

          // Trigger an update
          updateUserInFirebase(testUser2.uid, {
            displayName: 'Updated via Subscription',
          });
        } else if (callCount === 2) {
          // Second call - after update
          expect(user?.displayName).toBe('Updated via Subscription');
          unsubscribe();
          done();
        }
      });
    }, 10000); // 10 second timeout for real-time update

    it('should return null when subscribed user is deleted', (done) => {
      const tempUid = 'temp-user-for-deletion';
      const tempUser: User = {
        ...testUser1,
        uid: tempUid,
        displayName: 'Temporary User',
      };

      let callCount = 0;

      // Create the user first
      createUserInFirebase(tempUser).then(() => {
        const unsubscribe = subscribeToUser(tempUid, (user) => {
          callCount++;

          if (callCount === 1) {
            // Initial callback with user data
            expect(user).toBeDefined();

            // Delete the user
            const { getFirebaseDatabase } = require('../services/firebase');
            const { ref, remove } = require('firebase/database');
            const db = getFirebaseDatabase();
            remove(ref(db, `users/${tempUid}`));
          } else if (callCount === 2) {
            // Callback after deletion
            expect(user).toBeNull();
            unsubscribe();
            done();
          }
        });
      });
    }, 10000);
  });

  describe('searchUsers', () => {
    beforeAll(async () => {
      // Create multiple users for searching
      await createUserInFirebase(testUser1);
      await createUserInFirebase(testUser2);
      await createUserInFirebase({
        ...testUser1,
        uid: 'test-alice',
        email: 'alice@test.com',
        displayName: 'Alice Anderson',
      });
      await createUserInFirebase({
        ...testUser1,
        uid: 'test-bob',
        email: 'bob@test.com',
        displayName: 'Bob Builder',
      });
    });

    afterAll(async () => {
      // Clean up additional test users
      const { getFirebaseDatabase } = require('../services/firebase');
      const { ref, remove } = require('firebase/database');
      const db = getFirebaseDatabase();

      try {
        await remove(ref(db, 'users/test-alice'));
        await remove(ref(db, 'users/test-bob'));
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });

    it('should find users by display name prefix', async () => {
      const result = await searchUsers('Test');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(2);

      const displayNames = result.data!.map(u => u.displayName);
      expect(displayNames).toContain('Test User One');
      expect(displayNames).toContain('Test User Two');
    });

    it('should return empty array for non-matching query', async () => {
      const result = await searchUsers('NonExistentUser');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchUsers('');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle partial name matches', async () => {
      const result = await searchUsers('Alice');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.some(u => u.displayName === 'Alice Anderson')).toBe(true);
    });
  });

  describe('getAllUsersFromFirebase', () => {
    beforeAll(async () => {
      await createUserInFirebase(testUser1);
      await createUserInFirebase(testUser2);
    });

    it('should retrieve all users from Firebase', async () => {
      const result = await getAllUsersFromFirebase();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(2);

      const uids = result.data!.map(u => u.uid);
      expect(uids).toContain(testUser1.uid);
      expect(uids).toContain(testUser2.uid);
    });
  });

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      // Try to update a non-existent user (Firebase allows this, creates the path)
      const result = await updateUserInFirebase('non-existent-uid', {
        displayName: 'Should Work',
      });

      // Firebase RTDB allows updates to non-existent paths
      expect(result.success).toBe(true);

      // Clean up
      const { getFirebaseDatabase } = require('../services/firebase');
      const { ref, remove } = require('firebase/database');
      const db = getFirebaseDatabase();
      await remove(ref(db, 'users/non-existent-uid'));
    });
  });
});
