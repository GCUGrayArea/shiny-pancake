/**
 * Notification Context
 * Manages notification lifecycle, handlers, and deep linking
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Subscription } from 'expo-notifications';
import * as NotificationService from '../services/notification.service';
import type { NotificationData } from '../services/notification.service';

interface NotificationContextValue {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  currentChatId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Module-level navigation handler - set by AppNavigator
let navigationHandler: ((chatId: string, data?: any) => void) | null = null;

export function setNotificationNavigationHandler(handler: (chatId: string, data?: any) => void): void {
  navigationHandler = handler;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  enabled?: boolean; // Allow disabling in tests
}

export function NotificationProvider({ children, enabled = true }: NotificationProviderProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  /**
   * Request notification permissions
   */
  const requestPermission = async (): Promise<boolean> => {
    const granted = await NotificationService.requestNotificationPermissions();
    setHasPermission(granted);
    return granted;
  };

  /**
   * Handle notification received while app is in foreground
   */
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as NotificationData;
    
    // Don't show notification if user is already viewing this chat
    if (data.chatId && data.chatId === currentChatId) {
      console.log('Suppressing notification - user is viewing this chat');
      return;
    }

    console.log('Notification received:', {
      chatId: data.chatId,
      title: notification.request.content.title,
    });
  };

  /**
   * Handle notification tap (user interaction)
   * Navigate to the relevant chat
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;
    
    console.log('Notification tapped:', data);

    // Navigate to conversation using navigation handler
    // Pass additional data from notification for better UX
    if (data.chatId && navigationHandler) {
      try {
        navigationHandler(data.chatId, data);
      } catch (error) {
        console.error('Error navigating from notification:', error);
      }
    }
  };

  /**
   * Handle app state changes
   * Clear notifications when app comes to foreground
   */
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Clear all notifications when app becomes active
      NotificationService.clearAllNotifications();
      NotificationService.setBadgeCount(0);
    }
  };

  /**
   * Initialize notification system
   */
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      // Configure notification handler
      NotificationService.configureNotificationHandler();

      // Setup Android notification channel
      await NotificationService.setupNotificationChannel();

      // Check existing permissions
      const status = await NotificationService.getNotificationPermissionsStatus();
      setHasPermission(status === 'granted');

      // Request permissions if not already granted
      if (status !== 'granted') {
        await requestPermission();
      }

      // Setup listeners
      notificationListener.current = Notifications.addNotificationReceivedListener(
        handleNotificationReceived
      );

      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

      // Setup app state listener
      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

      // Clear any existing notifications on startup
      await NotificationService.clearAllNotifications();
      await NotificationService.setBadgeCount(0);

      console.log('Notification system initialized');

      return () => {
        appStateSubscription.remove();
      };
    };

    const cleanup = init();

    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
      
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [enabled]);

  const value: NotificationContextValue = {
    hasPermission,
    requestPermission,
    currentChatId,
    setCurrentChatId,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

