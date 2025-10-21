/**
 * Network Service Unit Tests
 */

import {
  isOnline,
  subscribeToNetworkState,
  waitForOnline,
  getNetworkState,
} from '../services/network.service';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

describe('Network Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isOnline', () => {
    it('should return true when connected and internet reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await isOnline();

      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const result = await isOnline();

      expect(result).toBe(false);
    });

    it('should return true when connected but internet reachable is null', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: null,
      });

      const result = await isOnline();

      expect(result).toBe(true);
    });

    it('should return false when internet is explicitly not reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
      });

      const result = await isOnline();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully and assume online', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('Network check failed'));

      const result = await isOnline();

      expect(result).toBe(true);
    });
  });

  describe('subscribeToNetworkState', () => {
    it('should call callback when network state changes', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        // Simulate state change
        handler({
          isConnected: true,
          isInternetReachable: true,
        });
        return unsubscribe;
      });

      const unsub = subscribeToNetworkState(callback);

      expect(callback).toHaveBeenCalledWith(true);
      expect(typeof unsub).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

      const unsub = subscribeToNetworkState(callback);

      unsub();

      expect(unsub).toBe(unsubscribe);
    });

    it('should handle offline state', () => {
      const callback = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        handler({
          isConnected: false,
          isInternetReachable: false,
        });
        return jest.fn();
      });

      subscribeToNetworkState(callback);

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should handle null internet reachable as online when connected', () => {
      const callback = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        handler({
          isConnected: true,
          isInternetReachable: null,
        });
        return jest.fn();
      });

      subscribeToNetworkState(callback);

      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe('waitForOnline', () => {
    it('should resolve immediately if already online', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const startTime = Date.now();
      await waitForOnline();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should wait for connection to be restored', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      let mockHandler: ((state: any) => void) | null = null;

      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        mockHandler = handler;
        return jest.fn();
      });

      const promise = waitForOnline();

      // Simulate connection restoration after delay
      setTimeout(() => {
        if (mockHandler) {
          mockHandler({
            isConnected: true,
            isInternetReachable: true,
          });
        }
      }, 50);

      const startTime = Date.now();
      await promise;
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it('should unsubscribe after going online', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const unsubscribe = jest.fn();
      let mockHandler: ((state: any) => void) | null = null;

      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        mockHandler = handler;
        return unsubscribe;
      });

      const promise = waitForOnline();

      setTimeout(() => {
        if (mockHandler) {
          mockHandler({
            isConnected: true,
            isInternetReachable: true,
          });
        }
      }, 10);

      await promise;

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('getNetworkState', () => {
    it('should return detailed network state', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };

      (NetInfo.fetch as jest.Mock).mockResolvedValue(mockState);

      const result = await getNetworkState();

      expect(result).toEqual({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    it('should handle missing properties', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
        type: null,
      });

      const result = await getNetworkState();

      expect(result).toEqual({
        isConnected: false,
        isInternetReachable: null,
        type: null,
      });
    });

    it('should handle errors gracefully', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      const result = await getNetworkState();

      expect(result).toEqual({
        isConnected: false,
        isInternetReachable: null,
        type: null,
      });
    });

    it('should return cellular type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      });

      const result = await getNetworkState();

      expect(result.type).toBe('cellular');
    });
  });
});
