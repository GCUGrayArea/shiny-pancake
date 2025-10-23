/**
 * Network State Manager
 * Handles network connectivity detection and state changes
 * Max 75 lines per function as per PRD requirements
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Callback for network state changes
 */
export type NetworkStateCallback = (isOnline: boolean) => void;

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    // Assume online if check fails
    return true;
  }
}

/**
 * Subscribe to network state changes
 * Returns an unsubscribe function
 */
export function subscribeToNetworkState(
  callback: NetworkStateCallback
): () => void {
  const handleStateChange = (state: NetInfoState): void => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    callback(online);
  };

  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener(handleStateChange);

  // Return unsubscribe function
  return unsubscribe;
}

/**
 * Wait for device to come online
 * Resolves when connection is restored
 */
export async function waitForOnline(): Promise<void> {
  const currentState = await isOnline();

  if (currentState) {
    return; // Already online
  }

  return new Promise<void>((resolve) => {
    const unsubscribe = subscribeToNetworkState((online) => {
      if (online) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Get detailed network state
 */
export async function getNetworkState(): Promise<{
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}> {
  try {
    const state = await NetInfo.fetch();

    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type ?? null,
    };
  } catch (error) {
    return {
      isConnected: false,
      isInternetReachable: null,
      type: null,
    };
  }
}
