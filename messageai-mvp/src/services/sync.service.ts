/**
 * Sync Service - Orchestration Layer
 * Manages bidirectional sync between local SQLite and Firebase RTDB
 *
 * CRITICAL: Firebase is ALWAYS the source of truth
 * All conflicts are resolved by accepting Firebase data
 */

import type { User, Chat, Message } from '../types';
import type { Unsubscribe } from 'firebase/database';

// Local services
import * as LocalUserService from './local-user.service';
import * as LocalChatService from './local-chat.service';
import * as LocalMessageService from './local-message.service';

// Firebase services
import * as FirebaseUserService from './firebase-user.service';
import * as FirebaseChatService from './firebase-chat.service';
import * as FirebaseMessageService from './firebase-message.service';

// Notification manager
import * as NotificationManager from './notification-manager.service';

/**
 * Active subscription tracking
 */
interface SyncSubscriptions {
  userChats?: Unsubscribe;
  chatSubscriptions: Map<string, Unsubscribe>;
  messageSubscriptions: Map<string, Unsubscribe>;
  userPresenceSubscriptions: Map<string, Unsubscribe>;
}

const activeSubscriptions: SyncSubscriptions = {
  chatSubscriptions: new Map(),
  messageSubscriptions: new Map(),
  userPresenceSubscriptions: new Map(),
};

/**
 * Sync a user from Firebase to local database
 * Firebase is source of truth - overwrites local data
 */
export async function syncUserToLocal(firebaseUser: User): Promise<void> {
  try {
    const result = await LocalUserService.saveUser(firebaseUser);

    if (!result.success) {
      console.error('Failed to sync user to local:', result.error);
    }
  } catch (error) {
    console.error('Error syncing user to local:', error);
  }
}

/**
 * Sync a chat from Firebase to local database
 * Firebase is source of truth - overwrites local data
 */
export async function syncChatToLocal(firebaseChat: Chat): Promise<void> {
  try {
    const result = await LocalChatService.saveChat(firebaseChat);

    if (!result.success) {
      console.error('Failed to sync chat to local:', result.error);
    }
  } catch (error) {
    console.error('Error syncing chat to local:', error);
  }
}

/**
 * Sync a message from Firebase to local database
 * Firebase is source of truth - overwrites local data
 */
export async function syncMessageToLocal(firebaseMessage: Message): Promise<void> {
  try {
    const result = await LocalMessageService.saveMessage(firebaseMessage);

    if (!result.success) {
      console.error('Failed to sync message to local:', result.error);
    }
  } catch (error) {
    console.error('Error syncing message to local:', error);
  }
}

/**
 * Sync a user from local database to Firebase
 */
export async function syncUserToFirebase(localUser: User): Promise<void> {
  try {
    const result = await FirebaseUserService.createUserInFirebase(localUser);

    if (!result.success) {
      console.error('Failed to sync user to Firebase:', result.error);
    }
  } catch (error) {
    console.error('Error syncing user to Firebase:', error);
  }
}

/**
 * Sync a chat from local database to Firebase
 */
export async function syncChatToFirebase(localChat: Chat): Promise<void> {
  try {
    const result = await FirebaseChatService.createChatInFirebase(localChat);

    if (!result.success) {
      console.error('Failed to sync chat to Firebase:', result.error);
    }
  } catch (error) {
    console.error('Error syncing chat to Firebase:', error);
  }
}

/**
 * Sync a message from local database to Firebase
 */
export async function syncMessageToFirebase(localMessage: Message): Promise<void> {
  try {
    const result = await FirebaseMessageService.sendMessageToFirebase(localMessage);

    if (!result.success) {
      console.error('Failed to sync message to Firebase:', result.error);
    }
  } catch (error) {
    console.error('Error syncing message to Firebase:', error);
  }
}

/**
 * Perform initial sync on app launch
 * Downloads user's chats and recent messages from Firebase
 */
export async function initialSync(userId: string): Promise<void> {
  try {
    console.log('Starting initial sync for user:', userId);

    // 1. Fetch user's chats from Firebase
    const chatsResult = await new Promise<Chat[]>((resolve) => {
      let unsubscribe: (() => void) | null = null;
      unsubscribe = FirebaseChatService.subscribeToUserChats(userId, (chats) => {
        if (unsubscribe) unsubscribe(); // One-time fetch
        resolve(chats);
      });
    });

    console.log(`Found ${chatsResult.length} chats to sync`);

    // 2. Sync each chat and its recent messages (with error handling)
    for (const chat of chatsResult) {
      try {
        // Sync chat to local
        await syncChatToLocal(chat);
      } catch (error) {
        console.error('Failed to sync chat to local:', error);
      }

      // Fetch participants and sync them
      for (const participantId of chat.participantIds) {
        if (participantId !== userId) {
          try {
            const userResult = await FirebaseUserService.getUserFromFirebase(participantId);
            if (userResult.success && userResult.data) {
              await syncUserToLocal(userResult.data);
            }
          } catch (error) {
            console.error('Failed to sync user to local:', error);
          }
        }
      }

      // Fetch recent messages (last 50) for this chat
      try {
        const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 50);
        if (messagesResult.success && messagesResult.data) {
          for (const message of messagesResult.data) {
            try {
              await syncMessageToLocal(message);
            } catch (error) {
              console.error('Failed to sync message to local:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages for chat:', error);
      }
    }

    console.log('Initial sync completed');
  } catch (error) {
    console.error('Error during initial sync:', error);
    throw error;
  }
}

/**
 * Start real-time sync for a user
 * Sets up listeners for chats and messages
 */
export async function startRealtimeSync(userId: string): Promise<void> {
  try {
    console.log('Starting real-time sync for user:', userId);

    // Subscribe to user's chats
    activeSubscriptions.userChats = FirebaseChatService.subscribeToUserChats(
      userId,
      async (chats) => {
        // Sync all chats to local (with error handling)
        for (const chat of chats) {
          try {
            await syncChatToLocal(chat);
          } catch (error) {
            console.error('Failed to sync chat to local:', error);
          }

          // Set up message subscription for this chat if not already subscribed
          if (!activeSubscriptions.messageSubscriptions.has(chat.id)) {
            const messageUnsub = FirebaseMessageService.subscribeToMessages(
              chat.id,
              async (message) => {
                try {
                  await syncMessageToLocal(message);

                  // Also sync the sender if we don't have them locally
                  const localSender = await LocalUserService.getUser(message.senderId);
                  if (!localSender.success || !localSender.data) {
                    const fbSender = await FirebaseUserService.getUserFromFirebase(
                      message.senderId
                    );
                    if (fbSender.success && fbSender.data) {
                      await syncUserToLocal(fbSender.data);
                    }
                  }

                  // Trigger notification for new message
                  await NotificationManager.handleNewMessage(message);
                } catch (error) {
                  console.error('Failed to sync message to local:', error);
                }
              }
            );

            activeSubscriptions.messageSubscriptions.set(chat.id, messageUnsub);
          }

          // Subscribe to participant presence
          for (const participantId of chat.participantIds) {
            if (participantId !== userId && !activeSubscriptions.userPresenceSubscriptions.has(participantId)) {
              const presenceUnsub = FirebaseUserService.subscribeToUser(
                participantId,
                async (user) => {
                  if (user) {
                    await syncUserToLocal(user);
                  }
                }
              );

              activeSubscriptions.userPresenceSubscriptions.set(participantId, presenceUnsub);
            }
          }
        }
      }
    );

    console.log('Real-time sync started');
  } catch (error) {
    console.error('Error starting real-time sync:', error);
    throw error;
  }
}

/**
 * Stop all real-time sync subscriptions
 * Cleans up all active listeners
 */
export function stopRealtimeSync(): void {
  try {
    console.log('Stopping real-time sync');

    // Unsubscribe from user chats
    if (activeSubscriptions.userChats) {
      activeSubscriptions.userChats();
      activeSubscriptions.userChats = undefined;
    }

    // Unsubscribe from all chat subscriptions
    activeSubscriptions.chatSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    activeSubscriptions.chatSubscriptions.clear();

    // Unsubscribe from all message subscriptions
    activeSubscriptions.messageSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    activeSubscriptions.messageSubscriptions.clear();

    // Unsubscribe from all presence subscriptions
    activeSubscriptions.userPresenceSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    activeSubscriptions.userPresenceSubscriptions.clear();

    console.log('Real-time sync stopped');
  } catch (error) {
    console.error('Error stopping real-time sync:', error);
  }
}

/**
 * Get the current sync status
 */
export function getSyncStatus(): {
  hasUserChatsSubscription: boolean;
  activeChatSubscriptions: number;
  activeMessageSubscriptions: number;
  activePresenceSubscriptions: number;
} {
  return {
    hasUserChatsSubscription: !!activeSubscriptions.userChats,
    activeChatSubscriptions: activeSubscriptions.chatSubscriptions.size,
    activeMessageSubscriptions: activeSubscriptions.messageSubscriptions.size,
    activePresenceSubscriptions: activeSubscriptions.userPresenceSubscriptions.size,
  };
}
