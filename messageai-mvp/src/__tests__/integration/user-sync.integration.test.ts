/**
 * Integration Tests: User Sync
 * Tests bidirectional sync between Firebase and SQLite for users
 *
 * NO MOCKS - Uses real Firebase RTDB and SQLite
 */

import {
  FirebaseTestHelper,
  SQLiteTestHelper,
  createTestUser,
  waitFor,
  sleep,
} from './setup';

// Import services - NO MOCKS
import * as FirebaseUserService from '../../services/firebase-user.service';
import * as LocalUserService from '../../services/local-user.service';
import * as SyncService from '../../services/sync.service';

describe('User Sync Integration Tests', () => {
  let firebaseHelper: FirebaseTestHelper;
  let sqliteHelper: SQLiteTestHelper;

  beforeAll(async () => {
    // Initialize test helpers
    firebaseHelper = new FirebaseTestHelper();
    sqliteHelper = new SQLiteTestHelper();
    await sqliteHelper.init();

    // Database override is now handled automatically by SQLiteTestHelper
    // No need to manually override service database instances
  });

  afterAll(async () => {
    // Clean up all test data
    await firebaseHelper.cleanup();
    await sqliteHelper.cleanup();
  });

  describe('Firebase → Local Sync', () => {
    it('should sync user from Firebase to local database', async () => {
      const testUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create user in Firebase
      const createResult = await FirebaseUserService.createUserInFirebase(testUser);
      expect(createResult.success).toBe(true);

      // 2. Verify it's in Firebase
      const firebaseExists = await firebaseHelper.verifyExists(`users/${testUser.uid}`);
      expect(firebaseExists).toBe(true);

      // 3. Sync to local
      await SyncService.syncUserToLocal(testUser);

      // 4. Verify it's in local database
      const localExists = await sqliteHelper.verifyUserExists(testUser.uid);
      expect(localExists).toBe(true);

      // 5. Verify data integrity
      const localUser = await sqliteHelper.getUser(testUser.uid);
      expect(localUser).toMatchObject({
        uid: testUser.uid,
        email: testUser.email,
        displayName: testUser.displayName,
        isOnline: testUser.isOnline,
      });
    });

    it('should update local user when Firebase user changes', async () => {
      const testUser = createTestUser({ displayName: 'Original Name' });
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create and sync initial user
      await FirebaseUserService.createUserInFirebase(testUser);
      await SyncService.syncUserToLocal(testUser);

      // 2. Verify initial state
      let localUser = await sqliteHelper.getUser(testUser.uid);
      expect(localUser?.displayName).toBe('Original Name');

      // 3. Update in Firebase
      const updateResult = await FirebaseUserService.updateUserInFirebase(testUser.uid, {
        displayName: 'Updated Name',
        isOnline: true,
      });
      expect(updateResult.success).toBe(true);

      // 4. Get updated user from Firebase
      const getResult = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBeTruthy();

      // 5. Sync updated user to local
      await SyncService.syncUserToLocal(getResult.data!);

      // 6. Verify local was updated
      localUser = await sqliteHelper.getUser(testUser.uid);
      expect(localUser?.displayName).toBe('Updated Name');
      expect(localUser?.isOnline).toBe(true);
    });

    it('should handle real-time updates from Firebase', async () => {
      const testUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create user in Firebase
      await FirebaseUserService.createUserInFirebase(testUser);

      // 2. Subscribe to real-time updates
      let updateCount = 0;
      const unsubscribe = FirebaseUserService.subscribeToUser(testUser.uid, async (user) => {
        updateCount++;
        if (user) {
          await SyncService.syncUserToLocal(user);
        }
      });

      // 3. Wait for initial callback
      await waitFor(() => updateCount >= 1, 3000);
      expect(updateCount).toBeGreaterThanOrEqual(1);

      // 4. Update user in Firebase
      await FirebaseUserService.updateUserInFirebase(testUser.uid, {
        displayName: 'Real-time Update',
      });

      // 5. Wait for update callback
      await waitFor(() => updateCount >= 2, 3000);
      expect(updateCount).toBeGreaterThanOrEqual(2);

      // 6. Verify local database was updated
      const localUser = await sqliteHelper.getUser(testUser.uid);
      expect(localUser?.displayName).toBe('Real-time Update');

      // Cleanup
      unsubscribe();
    }, 10000);
  });

  describe('Local → Firebase Sync', () => {
    it('should sync user from local database to Firebase', async () => {
      const testUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Save user to local database
      const localResult = await LocalUserService.saveUser(testUser);
      expect(localResult.success).toBe(true);

      // 2. Verify it's in local
      const localExists = await sqliteHelper.verifyUserExists(testUser.uid);
      expect(localExists).toBe(true);

      // 3. Sync to Firebase
      await SyncService.syncUserToFirebase(testUser);

      // 4. Wait a bit for Firebase to process
      await sleep(500);

      // 5. Verify it's in Firebase
      const firebaseResult = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      expect(firebaseResult.success).toBe(true);
      expect(firebaseResult.data).toBeTruthy();
      expect(firebaseResult.data).toMatchObject({
        uid: testUser.uid,
        email: testUser.email,
        displayName: testUser.displayName,
      });
    });

    it('should handle local updates that need to be pushed to Firebase', async () => {
      const testUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create user locally and sync to Firebase
      await LocalUserService.saveUser(testUser);
      await SyncService.syncUserToFirebase(testUser);
      await sleep(500);

      // 2. Update user locally
      const updatedUser = {
        ...testUser,
        displayName: 'Locally Updated',
        isOnline: true,
      };
      await LocalUserService.saveUser(updatedUser);

      // 3. Sync update to Firebase
      await SyncService.syncUserToFirebase(updatedUser);
      await sleep(500);

      // 4. Verify Firebase has the update
      const firebaseResult = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      expect(firebaseResult.success).toBe(true);
      expect(firebaseResult.data?.displayName).toBe('Locally Updated');
      expect(firebaseResult.data?.isOnline).toBe(true);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should maintain data consistency across Firebase and local', async () => {
      const testUser = createTestUser();
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create in Firebase, sync to local
      await FirebaseUserService.createUserInFirebase(testUser);
      await SyncService.syncUserToLocal(testUser);

      // 2. Verify both have the same data
      const firebaseData = await firebaseHelper.getData<any>(`users/${testUser.uid}`);
      const localData = await sqliteHelper.getUser(testUser.uid);

      expect(firebaseData.uid).toBe(localData?.uid);
      expect(firebaseData.email).toBe(localData?.email);
      expect(firebaseData.displayName).toBe(localData?.displayName);

      // 3. Update in Firebase
      await FirebaseUserService.updateUserInFirebase(testUser.uid, {
        displayName: 'Updated in Firebase',
      });
      await sleep(300);

      const updatedFirebaseUser = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      await SyncService.syncUserToLocal(updatedFirebaseUser.data!);

      // 4. Verify local has Firebase changes
      const localAfterFbUpdate = await sqliteHelper.getUser(testUser.uid);
      expect(localAfterFbUpdate?.displayName).toBe('Updated in Firebase');

      // 5. Update local and push to Firebase
      const localUpdateUser = {
        ...testUser,
        displayName: 'Updated Locally',
        lastSeen: Date.now(),
      };
      await LocalUserService.saveUser(localUpdateUser);
      await SyncService.syncUserToFirebase(localUpdateUser);
      await sleep(300);

      // 6. Verify Firebase has local changes
      const firebaseAfterLocalUpdate = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      expect(firebaseAfterLocalUpdate.data?.displayName).toBe('Updated Locally');
    });

    it('should handle concurrent updates (Firebase wins)', async () => {
      const testUser = createTestUser({ displayName: 'Initial' });
      firebaseHelper.trackForCleanup(`users/${testUser.uid}`);

      // 1. Create user in both places
      await FirebaseUserService.createUserInFirebase(testUser);
      await SyncService.syncUserToLocal(testUser);

      // 2. Simulate concurrent updates
      // - Update in Firebase
      await FirebaseUserService.updateUserInFirebase(testUser.uid, {
        displayName: 'Firebase Update',
      });

      // - Update in local (slightly later, but hasn't synced yet)
      const localUpdate = { ...testUser, displayName: 'Local Update' };
      await LocalUserService.saveUser(localUpdate);

      // 3. Sync from Firebase (Firebase is source of truth)
      const firebaseUser = await FirebaseUserService.getUserFromFirebase(testUser.uid);
      await SyncService.syncUserToLocal(firebaseUser.data!);

      // 4. Local should now have Firebase version (Firebase wins)
      const finalLocal = await sqliteHelper.getUser(testUser.uid);
      expect(finalLocal?.displayName).toBe('Firebase Update');
    });
  });

  describe('Multiple Users', () => {
    it('should handle syncing multiple users independently', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const user3 = createTestUser();

      firebaseHelper.trackForCleanup(`users/${user1.uid}`);
      firebaseHelper.trackForCleanup(`users/${user2.uid}`);
      firebaseHelper.trackForCleanup(`users/${user3.uid}`);

      // 1. Create all users in Firebase
      await Promise.all([
        FirebaseUserService.createUserInFirebase(user1),
        FirebaseUserService.createUserInFirebase(user2),
        FirebaseUserService.createUserInFirebase(user3),
      ]);

      // 2. Sync all to local
      await Promise.all([
        SyncService.syncUserToLocal(user1),
        SyncService.syncUserToLocal(user2),
        SyncService.syncUserToLocal(user3),
      ]);

      // 3. Verify all are in local database
      const local1 = await sqliteHelper.getUser(user1.uid);
      const local2 = await sqliteHelper.getUser(user2.uid);
      const local3 = await sqliteHelper.getUser(user3.uid);

      expect(local1?.uid).toBe(user1.uid);
      expect(local2?.uid).toBe(user2.uid);
      expect(local3?.uid).toBe(user3.uid);

      // 4. Update one user
      await FirebaseUserService.updateUserInFirebase(user2.uid, {
        displayName: 'User 2 Updated',
      });

      const updatedUser2 = await FirebaseUserService.getUserFromFirebase(user2.uid);
      await SyncService.syncUserToLocal(updatedUser2.data!);

      // 5. Verify only user2 was updated
      const finalLocal2 = await sqliteHelper.getUser(user2.uid);
      expect(finalLocal2?.displayName).toBe('User 2 Updated');

      const unchangedLocal1 = await sqliteHelper.getUser(user1.uid);
      expect(unchangedLocal1?.displayName).toBe(user1.displayName);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing users gracefully', async () => {
      const nonExistentUid = 'non-existent-user-id';

      // Try to get non-existent user
      const result = await FirebaseUserService.getUserFromFirebase(nonExistentUid);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();

      // Try to get from local
      const localResult = await LocalUserService.getUser(nonExistentUid);
      expect(localResult.success).toBe(true);
      expect(localResult.data).toBeNull();
    });

    it('should handle sync errors without crashing', async () => {
      const testUser = createTestUser();

      // Try to sync to local without initializing Firebase
      // This should handle errors gracefully
      await expect(
        SyncService.syncUserToLocal(testUser)
      ).resolves.not.toThrow();
    });
  });
});
