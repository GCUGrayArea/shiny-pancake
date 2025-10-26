/**
 * Unit tests for Typing Service
 */

import * as TypingService from '../services/typing.service';
import * as Firebase from '../services/firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp, remove } from 'firebase/database';

// Mock Firebase
jest.mock('firebase/database');
jest.mock('../services/firebase');

// Mock timers for throttling and auto-clear tests
jest.useFakeTimers();

describe('Typing Service', () => {
  const mockDatabase = { _isMockDatabase: true };
  const mockRef = { _isMockRef: true };
  const mockDisconnectRef = { remove: jest.fn() };
  const mockUnsubscribe = jest.fn();
  const testChatId = 'test-chat-123';
  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Mock Firebase methods
    (Firebase.getFirebaseDatabase as jest.Mock).mockReturnValue(mockDatabase);
    (ref as jest.Mock).mockReturnValue(mockRef);
    (set as jest.Mock).mockResolvedValue(undefined);
    (remove as jest.Mock).mockResolvedValue(undefined);
    (onDisconnect as jest.Mock).mockReturnValue(mockDisconnectRef);
    (mockDisconnectRef.remove as jest.Mock).mockResolvedValue(undefined);
    (onValue as jest.Mock).mockReturnValue(mockUnsubscribe);
    (serverTimestamp as jest.Mock).mockReturnValue(12345);
  });

  afterEach(() => {
    // Clean up typing service after each test
    TypingService.cleanupTypingService();
  });

  describe('setTyping', () => {
    it('should set user as typing in Firebase', async () => {
      await TypingService.setTyping(testChatId, testUserId, true);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `typing/${testChatId}/${testUserId}`);
      expect(set).toHaveBeenCalledWith(mockRef, {
        isTyping: true,
        timestamp: 12345,
      });
    });

    it('should set up onDisconnect hook when typing', async () => {
      await TypingService.setTyping(testChatId, testUserId, true);

      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockDisconnectRef.remove).toHaveBeenCalled();
    });

    it('should remove typing state when set to false', async () => {
      await TypingService.setTyping(testChatId, testUserId, false);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `typing/${testChatId}/${testUserId}`);
      expect(remove).toHaveBeenCalledWith(mockRef);
    });

    it('should throttle rapid typing updates', async () => {
      // First call should go through
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1);

      // Second call within throttle window should be skipped
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1); // Still 1

      // Advance time past throttle window (2000ms)
      jest.advanceTimersByTime(2100);

      // Third call should go through
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(2);
    });

    it('should not throttle when setting to false', async () => {
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1);

      // Immediately setting to false should work
      await TypingService.setTyping(testChatId, testUserId, false);
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('should set up auto-clear timeout when typing', async () => {
      await TypingService.setTyping(testChatId, testUserId, true);

      // Advance time to trigger auto-clear (5000ms)
      jest.advanceTimersByTime(5100);

      // Auto-clear should have called remove
      expect(remove).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firebase error');
      (set as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        TypingService.setTyping(testChatId, testUserId, true)
      ).rejects.toThrow('Firebase error');
    });
  });

  describe('clearTyping', () => {
    it('should clear typing state', async () => {
      await TypingService.clearTyping(testChatId, testUserId);

      expect(ref).toHaveBeenCalledWith(mockDatabase, `typing/${testChatId}/${testUserId}`);
      expect(remove).toHaveBeenCalledWith(mockRef);
    });
  });

  describe('subscribeToTyping', () => {
    it('should subscribe to typing updates for a chat', () => {
      const callback = jest.fn();

      const unsubscribe = TypingService.subscribeToTyping(
        testChatId,
        testUserId,
        callback
      );

      expect(ref).toHaveBeenCalledWith(mockDatabase, `typing/${testChatId}`);
      expect(onValue).toHaveBeenCalledWith(mockRef, expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with typing users', () => {
      const callback = jest.fn();
      let valueCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        valueCallback = cb;
        return mockUnsubscribe;
      });

      TypingService.subscribeToTyping(testChatId, testUserId, callback);

      // Simulate Firebase data update with typing users
      const mockSnapshot = {
        val: () => ({
          [testUserId2]: {
            isTyping: true,
            timestamp: 12345,
          },
        }),
      };

      valueCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([
        {
          uid: testUserId2,
          isTyping: true,
          timestamp: 12345,
        },
      ]);
    });

    it('should filter out current user from typing users', () => {
      const callback = jest.fn();
      let valueCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        valueCallback = cb;
        return mockUnsubscribe;
      });

      TypingService.subscribeToTyping(testChatId, testUserId, callback);

      // Simulate Firebase data with current user typing
      const mockSnapshot = {
        val: () => ({
          [testUserId]: {
            isTyping: true,
            timestamp: 12345,
          },
          [testUserId2]: {
            isTyping: true,
            timestamp: 12345,
          },
        }),
      };

      valueCallback(mockSnapshot);

      // Should only include testUserId2, not current user
      expect(callback).toHaveBeenCalledWith([
        {
          uid: testUserId2,
          isTyping: true,
          timestamp: 12345,
        },
      ]);
    });

    it('should filter out users not currently typing', () => {
      const callback = jest.fn();
      let valueCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        valueCallback = cb;
        return mockUnsubscribe;
      });

      TypingService.subscribeToTyping(testChatId, testUserId, callback);

      const mockSnapshot = {
        val: () => ({
          [testUserId2]: {
            isTyping: false, // Not typing
            timestamp: 12345,
          },
        }),
      };

      valueCallback(mockSnapshot);

      // Should return empty array
      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should handle null/empty data', () => {
      const callback = jest.fn();
      let valueCallback: any;

      (onValue as jest.Mock).mockImplementation((ref, cb) => {
        valueCallback = cb;
        return mockUnsubscribe;
      });

      TypingService.subscribeToTyping(testChatId, testUserId, callback);

      const mockSnapshot = {
        val: () => null,
      };

      valueCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should unsubscribe properly', () => {
      const callback = jest.fn();

      const unsubscribe = TypingService.subscribeToTyping(
        testChatId,
        testUserId,
        callback
      );

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('cleanupTypingService', () => {
    it('should clean up all listeners and timeouts', async () => {
      const callback = jest.fn();

      // Create some subscriptions
      const unsubscribe1 = TypingService.subscribeToTyping(
        testChatId,
        testUserId,
        callback
      );
      const unsubscribe2 = TypingService.subscribeToTyping(
        'chat-2',
        testUserId,
        callback
      );

      // Set some typing states
      await TypingService.setTyping(testChatId, testUserId, true);

      // Cleanup
      TypingService.cleanupTypingService();

      // Verify listeners were called
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('throttling behavior', () => {
    it('should allow updates from different users', async () => {
      // User 1 sets typing
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1);

      // User 2 sets typing immediately (should not be throttled)
      await TypingService.setTyping(testChatId, testUserId2, true);
      expect(set).toHaveBeenCalledTimes(2);
    });

    it('should allow updates in different chats', async () => {
      const chatId2 = 'chat-2';

      // Set typing in chat 1
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1);

      // Set typing in chat 2 immediately (should not be throttled)
      await TypingService.setTyping(chatId2, testUserId, true);
      expect(set).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto-clear behavior', () => {
    it('should reset auto-clear timer on new typing event', async () => {
      // First typing event
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(1);

      // Advance time past throttle window but not past auto-clear
      jest.advanceTimersByTime(2100);

      // Second typing event (should go through since past throttle)
      await TypingService.setTyping(testChatId, testUserId, true);
      expect(set).toHaveBeenCalledTimes(2);

      // Advance time almost to auto-clear (not quite)
      jest.advanceTimersByTime(4900); // 4900ms from second event

      // Should not have been cleared yet
      expect(remove).toHaveBeenCalledTimes(0);

      // Advance just a bit more to trigger the auto-clear from second event
      jest.advanceTimersByTime(200); // Now 5100ms from second event
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout when manually clearing typing', async () => {
      await TypingService.setTyping(testChatId, testUserId, true);

      // Manually clear
      await TypingService.clearTyping(testChatId, testUserId);
      expect(remove).toHaveBeenCalledTimes(1);

      // Advance past auto-clear time
      jest.advanceTimersByTime(6000);

      // Should still be only 1 remove call (auto-clear was cancelled)
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
