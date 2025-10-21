/**
 * Unit tests for Presence Service
 */

import { AppState } from 'react-native';
import * as PresenceService from '../services/presence.service';
import * as Firebase from '../services/firebase';
import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  get,
} from 'firebase/database';

// Mock Firebase
jest.mock('firebase/database');
jest.mock('../services/firebase');

// Mock React Native AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

describe('Presence Service', () => {
  const mockDatabase = { _isMockDatabase: true };
  const mockRef = { _isMockRef: true };
  const mockDisconnectRef = { set: jest.fn() };
  const mockUnsubscribe = jest.fn();
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firebase methods
    (Firebase.getFirebaseDatabase as jest.Mock).mockReturnValue(mockDatabase);
    (ref as jest.Mock).mockReturnValue(mockRef);
    (set as jest.Mock).mockResolvedValue(undefined);
    (onDisconnect as jest.Mock).mockReturnValue(mockDisconnectRef);
    (mockDisconnectRef.set as jest.Mock).mockResolvedValue(undefined);
    (onValue as jest.Mock).mockReturnValue(mockUnsubscribe);
    (serverTimestamp as jest.Mock).mockReturnValue(12345);
  });

  afterEach(async () => {
    // Clean up presence system after each test
    await PresenceService.teardownPresenceSystem();
  });

  describe('setUserOnline', () => {
    it('should set user as online in Firebase', async () => {
      await PresenceService.setUserOnline(testUserId);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `presence/${testUserId}`);
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: true,
        lastSeen: 12345,
      });
    });

    it('should set up onDisconnect hook', async () => {
      await PresenceService.setUserOnline(testUserId);

      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockDisconnectRef.set).toHaveBeenCalledWith({
        isOnline: false,
        lastSeen: 12345,
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firebase error');
      (set as jest.Mock).mockRejectedValueOnce(error);

      await expect(PresenceService.setUserOnline(testUserId)).rejects.toThrow(
        'Firebase error'
      );
    });
  });

  describe('setUserOffline', () => {
    it('should set user as offline in Firebase', async () => {
      await PresenceService.setUserOffline(testUserId);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `presence/${testUserId}`);
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: false,
        lastSeen: 12345,
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firebase error');
      (set as jest.Mock).mockRejectedValueOnce(error);

      await expect(PresenceService.setUserOffline(testUserId)).rejects.toThrow(
        'Firebase error'
      );
    });
  });

  describe('subscribeToUserPresence', () => {
    it('should subscribe to user presence updates', () => {
      const callback = jest.fn();

      const unsubscribe = PresenceService.subscribeToUserPresence(
        testUserId,
        callback
      );

      expect(ref).toHaveBeenCalledWith(mockDatabase, `presence/${testUserId}`);
      expect(onValue).toHaveBeenCalledWith(mockRef, expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with presence data when available', () => {
      const callback = jest.fn();
      let capturedCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        capturedCallback = cb;
        return mockUnsubscribe;
      });

      PresenceService.subscribeToUserPresence(testUserId, callback);

      // Simulate Firebase callback with data
      const mockSnapshot = {
        val: () => ({ isOnline: true, lastSeen: 1234567890 }),
      };
      capturedCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith(testUserId, true, 1234567890);
    });

    it('should handle null presence data (user offline)', () => {
      const callback = jest.fn();
      let capturedCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        capturedCallback = cb;
        return mockUnsubscribe;
      });

      PresenceService.subscribeToUserPresence(testUserId, callback);

      // Simulate Firebase callback with null (no presence data)
      const mockSnapshot = {
        val: () => null,
      };
      capturedCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith(testUserId, false, expect.any(Number));
    });

    it('should return unsubscribe function that cleans up listener', () => {
      const callback = jest.fn();

      const unsubscribe = PresenceService.subscribeToUserPresence(
        testUserId,
        callback
      );

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToMultiplePresences', () => {
    it('should subscribe to multiple users', () => {
      const callback = jest.fn();
      const uids = ['user1', 'user2', 'user3'];

      const unsubscribe = PresenceService.subscribeToMultiplePresences(
        uids,
        callback
      );

      expect(onValue).toHaveBeenCalledTimes(3);
      expect(ref).toHaveBeenCalledWith(mockDatabase, 'presence/user1');
      expect(ref).toHaveBeenCalledWith(mockDatabase, 'presence/user2');
      expect(ref).toHaveBeenCalledWith(mockDatabase, 'presence/user3');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe all listeners when unsubscribe called', () => {
      const callback = jest.fn();
      const uids = ['user1', 'user2'];

      const unsubscribe = PresenceService.subscribeToMultiplePresences(
        uids,
        callback
      );

      unsubscribe();

      // Should have called the mock unsubscribe twice
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', () => {
      const callback = jest.fn();

      const unsubscribe = PresenceService.subscribeToMultiplePresences(
        [],
        callback
      );

      expect(onValue).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('getUserPresence', () => {
    it('should fetch current presence status', async () => {
      const mockSnapshot = {
        val: () => ({ isOnline: true, lastSeen: 1234567890 }),
      };
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await PresenceService.getUserPresence(testUserId);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `presence/${testUserId}`);
      expect(get).toHaveBeenCalledWith(mockRef);
      expect(result).toEqual({
        isOnline: true,
        lastSeen: 1234567890,
      });
    });

    it('should return offline status when no data exists', async () => {
      const mockSnapshot = {
        val: () => null,
      };
      (get as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await PresenceService.getUserPresence(testUserId);

      expect(result).toEqual({
        isOnline: false,
        lastSeen: expect.any(Number),
      });
    });

    it('should handle errors and return offline status', async () => {
      (get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await PresenceService.getUserPresence(testUserId);

      expect(result).toEqual({
        isOnline: false,
        lastSeen: expect.any(Number),
      });
    });
  });

  describe('setupPresenceSystem', () => {
    it('should initialize presence system for user', async () => {
      await PresenceService.setupPresenceSystem(testUserId);

      // Should set user online
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: true,
        lastSeen: 12345,
      });

      // Should set up app state listener
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );

      // Should set up connection monitor
      expect(ref).toHaveBeenCalledWith(mockDatabase, '.info/connected');
    });

    it('should tear down existing system before setting up new one', async () => {
      const mockAppStateListener = { remove: jest.fn() };
      (AppState.addEventListener as jest.Mock).mockReturnValue(
        mockAppStateListener
      );

      // Set up first time
      await PresenceService.setupPresenceSystem('user1');

      // Set up second time
      await PresenceService.setupPresenceSystem('user2');

      // Should have removed old listener
      expect(mockAppStateListener.remove).toHaveBeenCalled();

      // Should have set user1 offline and user2 online
      expect(set).toHaveBeenCalledWith(expect.anything(), {
        isOnline: false,
        lastSeen: 12345,
      });
    });

    it('should handle app state changes to active', async () => {
      let appStateHandler: any;
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (event, handler) => {
          appStateHandler = handler;
          return { remove: jest.fn() };
        }
      );

      await PresenceService.setupPresenceSystem(testUserId);

      // Clear previous calls
      jest.clearAllMocks();

      // Simulate app going to active state
      appStateHandler('active');

      // Wait for async call
      await new Promise((resolve) => setImmediate(resolve));

      // Should set user online
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: true,
        lastSeen: 12345,
      });
    });

    it('should handle app state changes to background', async () => {
      let appStateHandler: any;
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (event, handler) => {
          appStateHandler = handler;
          return { remove: jest.fn() };
        }
      );

      await PresenceService.setupPresenceSystem(testUserId);

      // Clear previous calls
      jest.clearAllMocks();

      // Simulate app going to background
      appStateHandler('background');

      // Wait for async call
      await new Promise((resolve) => setImmediate(resolve));

      // Should set user offline
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: false,
        lastSeen: 12345,
      });
    });

    it('should handle connection state changes', async () => {
      let connectionCallback: any;
      (onValue as jest.Mock).mockImplementation((ref, callback) => {
        // Capture the connection callback
        if (ref === mockRef) {
          connectionCallback = callback;
        }
        return mockUnsubscribe;
      });

      await PresenceService.setupPresenceSystem(testUserId);

      // Clear previous calls
      jest.clearAllMocks();

      // Simulate connection established
      const connectedSnapshot = { val: () => true };
      connectionCallback(connectedSnapshot);

      // Wait for async call
      await new Promise((resolve) => setImmediate(resolve));

      // Should set user online
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: true,
        lastSeen: 12345,
      });
    });
  });

  describe('teardownPresenceSystem', () => {
    it('should clean up all listeners and set user offline', async () => {
      const mockAppStateListener = { remove: jest.fn() };
      (AppState.addEventListener as jest.Mock).mockReturnValue(
        mockAppStateListener
      );

      // Set up system
      await PresenceService.setupPresenceSystem(testUserId);

      // Clear mock calls
      jest.clearAllMocks();

      // Tear down
      await PresenceService.teardownPresenceSystem();

      // Should remove app state listener
      expect(mockAppStateListener.remove).toHaveBeenCalled();

      // Should unsubscribe connection listener
      expect(mockUnsubscribe).toHaveBeenCalled();

      // Should set user offline
      expect(set).toHaveBeenCalledWith(mockRef, {
        isOnline: false,
        lastSeen: 12345,
      });
    });

    it('should handle teardown when system not initialized', async () => {
      // Should not throw
      await expect(
        PresenceService.teardownPresenceSystem()
      ).resolves.not.toThrow();
    });
  });
});
