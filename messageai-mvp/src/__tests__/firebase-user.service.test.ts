/**
 * Unit tests for Firebase User Service
 * These tests mock Firebase to verify service logic without requiring live connection
 */

import type { User } from '../types';

// Mock Firebase modules before importing the service
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  startAt: jest.fn(),
  endAt: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseDatabase: jest.fn(() => ({ mock: 'database' })),
}));

import {
  createUserInFirebase,
  getUserFromFirebase,
  updateUserInFirebase,
  searchUsers,
  getAllUsersFromFirebase,
} from '../services/firebase-user.service';

import {
  ref,
  set,
  get,
  update,
  query,
  orderByChild,
  startAt,
  endAt,
} from 'firebase/database';

const testUser: User = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: 1234567890,
  lastSeen: 1234567890,
  isOnline: true,
  fcmToken: 'test-token',
};

describe('Firebase User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserInFirebase', () => {
    it('should create a user successfully', async () => {
      const mockRef = { path: '/users/test-uid-123' };
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const result = await createUserInFirebase(testUser);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(ref).toHaveBeenCalledWith(expect.anything(), `users/${testUser.uid}`);
      expect(set).toHaveBeenCalledWith(mockRef, {
        uid: testUser.uid,
        email: testUser.email,
        displayName: testUser.displayName,
        createdAt: testUser.createdAt,
        lastSeen: testUser.lastSeen,
        isOnline: testUser.isOnline,
        fcmToken: testUser.fcmToken,
      });
    });

    it('should handle errors gracefully', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await createUserInFirebase(testUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should set fcmToken to null if undefined', async () => {
      const mockRef = { path: '/users/test' };
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      const userWithoutToken = { ...testUser, fcmToken: undefined };
      await createUserInFirebase(userWithoutToken);

      expect(set).toHaveBeenCalledWith(mockRef, expect.objectContaining({
        fcmToken: null,
      }));
    });
  });

  describe('getUserFromFirebase', () => {
    it('should retrieve an existing user', async () => {
      const mockSnapshot = {
        exists: () => true,
        val: () => testUser,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getUserFromFirebase(testUser.uid);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testUser);
    });

    it('should return null for non-existent user', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getUserFromFirebase('non-existent-uid');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getUserFromFirebase('test-uid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateUserInFirebase', () => {
    it('should update user fields', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      const updates = {
        displayName: 'Updated Name',
        isOnline: false,
      };

      const result = await updateUserInFirebase(testUser.uid, updates);

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledWith(mockRef, updates);
    });

    it('should not allow updating uid field', async () => {
      const mockRef = {};
      (ref as jest.Mock).mockReturnValue(mockRef);
      (update as jest.Mock).mockResolvedValue(undefined);

      const updates: any = {
        uid: 'different-uid',
        displayName: 'Updated Name',
      };

      await updateUserInFirebase(testUser.uid, updates);

      // uid should be removed from updates
      expect(update).toHaveBeenCalledWith(mockRef, {
        displayName: 'Updated Name',
      });
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const result = await updateUserInFirebase('test-uid', { displayName: 'New' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('searchUsers', () => {
    it('should search users by display name', async () => {
      const users = [testUser, { ...testUser, uid: 'uid-2', displayName: 'Test User 2' }];

      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          users.forEach(user => callback({ val: () => user }));
        },
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderByChild as jest.Mock).mockReturnValue({});
      (startAt as jest.Mock).mockReturnValue({});
      (endAt as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await searchUsers('Test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(users);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchUsers('');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(get).not.toHaveBeenCalled();
    });

    it('should return empty array when no users match', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await searchUsers('NonExistent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockImplementation(() => {
        throw new Error('Query error');
      });

      const result = await searchUsers('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query error');
    });
  });

  describe('getAllUsersFromFirebase', () => {
    it('should retrieve all users', async () => {
      const users = [testUser, { ...testUser, uid: 'uid-2' }];

      const mockSnapshot = {
        exists: () => true,
        forEach: (callback: Function) => {
          users.forEach(user => callback({ val: () => user }));
        },
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getAllUsersFromFirebase();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(users);
    });

    it('should return empty array when no users exist', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getAllUsersFromFirebase();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (get as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const result = await getAllUsersFromFirebase();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch error');
    });
  });
});
