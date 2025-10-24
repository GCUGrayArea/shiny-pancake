/**
 * Notification Context
 * Manages notification lifecycle, handlers, and deep linking
 * Supports background and killed state notifications via FCM
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Subscription } from 'expo-notifications';
import * as NotificationService from '../services/notification.service';
import type { NotificationData } from '../services/notification.service';
import * as UnreadService from '../services/unread.service';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  currentChatId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
  totalUnreadCount: number;
  getChatUnreadCount: (chatId: string) => number;
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
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [chatUnreadCounts, setChatUnreadCounts] = useState<Map<string, number>>(new Map());

  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();
  const lastNotificationResponse = useRef<Notifications.NotificationResponse | null>(null);

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
      return;
    }
  };

  /**
   * Handle notification tap (user interaction)
   * Navigate to the relevant chat
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;
    

    // Navigate to conversation using navigation handler
    // Pass additional data from notification for better UX
    if (data.chatId && navigationHandler) {
      try {
        navigationHandler(data.chatId, data);
      } catch (error) {
      }
    }
  };

  /**
   * Handle app state changes
   * Clear notifications when app comes to foreground
   * Update badge count based on actual unread messages
   */
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Clear all notifications when app becomes active
      NotificationService.clearAllNotifications();

      // Update badge with actual unread count (don't just clear it)
      if (user?.uid) {
        UnreadService.getTotalUnreadCount(user.uid).then((count) => {
          NotificationService.setBadgeCount(count);
        });
      }
    }
  };

  /**
   * Register push token with Firebase
   */
  const registerPushToken = async (userId: string) => {
    try {
      const token = await NotificationService.getPushToken();
      if (token) {
        await NotificationService.savePushTokenToProfile(userId, token);
        console.log('Push token registered successfully');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  /**
   * Get unread count for a specific chat
   */
  const getChatUnreadCount = (chatId: string): number => {
    return chatUnreadCounts.get(chatId) || 0;
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

      // Register push token if user is logged in
      if (user?.uid && status === 'granted') {
        await registerPushToken(user.uid);
      }

      // Check for notification that opened the app (killed state)
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response && response !== lastNotificationResponse.current) {
        lastNotificationResponse.current = response;
        handleNotificationResponse(response);
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

      // Set badge to actual unread count
      if (user?.uid) {
        const totalUnread = await UnreadService.getTotalUnreadCount(user.uid);
        await NotificationService.setBadgeCount(totalUnread);
      }

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
  }, [enabled, user?.uid]);

  /**
   * Subscribe to unread count changes
   */
  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to total unread count
    const unsubscribeTotalCount = UnreadService.subscribeToTotalUnreadCount(
      user.uid,
      (count) => {
        setTotalUnreadCount(count);
        NotificationService.setBadgeCount(count);
      }
    );

    // Load initial chat unread counts
    UnreadService.getAllChatUnreadCounts(user.uid).then((counts) => {
      setChatUnreadCounts(counts);
    });

    return () => {
      unsubscribeTotalCount();
    };
  }, [user?.uid]);

  const value: NotificationContextValue = {
    hasPermission,
    requestPermission,
    currentChatId,
    setCurrentChatId,
    totalUnreadCount,
    getChatUnreadCount,
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

