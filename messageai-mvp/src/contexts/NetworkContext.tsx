/**
 * Network Context
 * Provides network state to the entire app
 * Triggers message queue processing when connection is restored
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Text } from 'react-native-paper';
import { isOnline, subscribeToNetworkState } from '../services/network.service';
import { processQueue } from '../services/message-queue.service';

/**
 * Network context value
 */
interface NetworkContextValue {
  isOnline: boolean;
  isChecking: boolean;
}

/**
 * Network context
 */
const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

/**
 * Network provider props
 */
interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Network provider component
 */
export function NetworkProvider({ children }: NetworkProviderProps): React.ReactElement {
  const [online, setOnline] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // Check initial network state
    const checkInitialState = async (): Promise<void> => {
      try {
        const state = await isOnline();
        setOnline(state);
      } catch (error) {
        console.error('Failed to check initial network state:', error);
      } finally {
        setChecking(false);
      }
    };

    checkInitialState();

    // Subscribe to network state changes
    const unsubscribe = subscribeToNetworkState(async (isOnlineNow) => {
      const wasOffline = !online;
      setOnline(isOnlineNow);

      // If coming back online, process message queue
      if (wasOffline && isOnlineNow) {
        try {
          await processQueue();
        } catch (error) {
          console.error('Failed to process queue on reconnection:', error);
        }
      }
    });

    return (): void => {
      unsubscribe();
    };
  }, [online]);

  const value: NetworkContextValue = {
    isOnline: online,
    isChecking: checking,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Hook to use network context
 */
export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);

  if (context === undefined) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }

  return context;
}
