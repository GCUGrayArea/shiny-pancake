/**
 * Network Context
 * Provides network state to the entire app
 * SINGLE SOURCE OF TRUTH for message queue processing
 * Processes queue when:
 * 1. Network comes back online
 * 2. New messages added while online
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Text } from 'react-native-paper';
import { isOnline, subscribeToNetworkState } from '../services/network.service';
import { processQueue } from '../services/message-queue.service';

/**
 * Network context value
 */
interface NetworkContextValue {
  isOnline: boolean;
  isChecking: boolean;
  triggerQueueProcessing: () => void;  // Trigger processing when new message added
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Single queue processor - prevents concurrent processing
  const processQueueSafely = useCallback(async (reason: string) => {
    if (isProcessing) {
      return;
    }

    if (!online) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await processQueue();
      if (result.success && result.data) {
        const { sent, failed } = result.data;
        // Only log if something actually happened
        if (sent > 0 || failed > 0) {
        }
      }
    } catch (error) {
    } finally {
      setIsProcessing(false);
    }
  }, [online, isProcessing]);

  // Expose trigger for components to call when they enqueue messages
  const triggerQueueProcessing = useCallback(() => {
    processQueueSafely('new message enqueued');
  }, [processQueueSafely]);

  useEffect(() => {
    // Check initial network state
    const checkInitialState = async (): Promise<void> => {
      try {
        const state = await isOnline();
        setOnline(state);
        
        // If online initially, process any queued messages from previous session
        if (state) {
          await processQueueSafely('initial load');
        }
      } catch (error) {
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
        await processQueueSafely('reconnection');
      }
    });

    return (): void => {
      unsubscribe();
    };
  }, [online, processQueueSafely]);

  const value: NetworkContextValue = {
    isOnline: online,
    isChecking: checking,
    triggerQueueProcessing,
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
