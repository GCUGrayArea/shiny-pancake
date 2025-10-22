/**
 * Unit tests for local-user.service.ts
 */

import { User } from '../types';
import {
  saveUser,
  getUser,
  getUsers,
  updateUserPresence,
  getAllUsers,
  updateUserFcmToken,
  deleteUser,
} from '../services/local-user.service';
import * as dbService from '../services/database.service';

// Mock database service
jest.mock('../services/database.service');

const mockExecuteUpdate = dbService.executeUpdate as jest.MockedFunction<
  typeof dbService.executeUpdate
>;
const mockExecuteQuery = dbService.executeQuery as jest.MockedFunction<
  typeof dbService.executeQuery
>;
const mockExecuteQueryFirst = dbService.executeQueryFirst as jest.MockedFunction<
  typeof dbService.executeQueryFirst
>;

describe('Local User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser: User = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: Date.now(),
    lastSeen: Date.now(),
    isOnline: true,
    fcmToken: 'token123',
  };

  describe('saveUser', () => {
    it('should save user successfully', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 1 } });

      const result = await saveUser(mockUser);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO users'),
        expect.arrayContaining([
          mockUser.uid,
          mockUser.email,
          mockUser.displayName,
          mockUser.createdAt,
        ])
      );
    });

    it('should handle users without optional fields', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 1 } });

      const minimalUser: User = {
        uid: 'user456',
        email: 'minimal@example.com',
        displayName: 'Minimal User',
        createdAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: false,
      };

      const result = await saveUser(minimalUser);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          minimalUser.uid,
          minimalUser.email,
          minimalUser.displayName,
          minimalUser.createdAt,
          minimalUser.lastSeen,
          0, // isOnline
          null, // fcmToken
        ])
      );
    });

    it('should handle save errors', async () => {
      mockExecuteUpdate.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await saveUser(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUser', () => {
    it('should retrieve user by uid', async () => {
      const mockRow = {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        createdAt: mockUser.createdAt,
        lastSeen: mockUser.lastSeen,
        isOnline: 1,
        fcmToken: mockUser.fcmToken,
      };

      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: mockRow,
      });

      const result = await getUser(mockUser.uid);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockExecuteQueryFirst).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE uid = ?',
        [mockUser.uid]
      );
    });

    it('should return null when user not found', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getUser('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle query errors', async () => {
      mockExecuteQueryFirst.mockResolvedValue({
        success: false,
        error: 'Query error',
      });

      const result = await getUser(mockUser.uid);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUsers', () => {
    it('should retrieve multiple users', async () => {
      const mockRows = [
        {
          uid: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: Date.now(),
          lastSeen: null,
          isOnline: 0,
          fcmToken: null,
        },
        {
          uid: 'user2',
          email: 'user2@example.com',
          displayName: 'User 2',
          createdAt: Date.now(),
          lastSeen: Date.now(),
          isOnline: 1,
          fcmToken: 'token',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: mockRows,
      });

      const result = await getUsers(['user1', 'user2']);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].uid).toBe('user1');
      expect(result.data?.[1].uid).toBe('user2');
    });

    it('should return empty array for empty input', async () => {
      const result = await getUsers([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockExecuteQuery).not.toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      mockExecuteQuery.mockResolvedValue({
        success: false,
        error: 'Query error',
      });

      const result = await getUsers(['user1']);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateUserPresence', () => {
    it('should update user presence status', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const timestamp = Date.now();
      const result = await updateUserPresence(mockUser.uid, false, timestamp);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [0, timestamp, mockUser.uid]
      );
    });

    it('should use current time if lastSeen not provided', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await updateUserPresence(mockUser.uid, true);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        expect.any(String),
        [1, expect.any(Number), mockUser.uid]
      );
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users sorted by displayName', async () => {
      const mockRows = [
        {
          uid: 'user1',
          email: 'alice@example.com',
          displayName: 'Alice',
          createdAt: Date.now(),
          isOnline: 1,
        },
        {
          uid: 'user2',
          email: 'bob@example.com',
          displayName: 'Bob',
          createdAt: Date.now(),
          isOnline: 0,
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        success: true,
        data: mockRows,
      });

      const result = await getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY displayName ASC'
      );
    });
  });

  describe('updateUserFcmToken', () => {
    it('should update FCM token', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const newToken = 'new_token_456';
      const result = await updateUserFcmToken(mockUser.uid, newToken);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'UPDATE users SET fcmToken = ? WHERE uid = ?',
        [newToken, mockUser.uid]
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockExecuteUpdate.mockResolvedValue({ success: true, data: { changes: 1, lastInsertRowId: 0 } });

      const result = await deleteUser(mockUser.uid);

      expect(result.success).toBe(true);
      expect(mockExecuteUpdate).toHaveBeenCalledWith(
        'DELETE FROM users WHERE uid = ?',
        [mockUser.uid]
      );
    });

    it('should handle delete errors', async () => {
      mockExecuteUpdate.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      const result = await deleteUser(mockUser.uid);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
