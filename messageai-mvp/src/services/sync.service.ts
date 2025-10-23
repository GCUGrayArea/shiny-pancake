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
    }
  } catch (error) {
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
    }
  } catch (error) {
  }
}

/**
 * Helper: Sync a chat with its participants (ensures FK constraints satisfied)
 * CRITICAL: Always syncs participants BEFORE chat to avoid FK violations
 */
async function syncChatWithParticipants(chat: Chat): Promise<void> {
  // Sync all participants first
  for (const participantId of chat.participantIds) {
    try {
      const userResult = await FirebaseUserService.getUserFromFirebase(participantId);
      if (userResult.success && userResult.data) {
        await syncUserToLocal(userResult.data);
      }
    } catch (error) {
    }
  }
  
  // Now sync the chat
  await syncChatToLocal(chat);
}

/**
 * Sync a message from Firebase to local database
 * Firebase is source of truth - overwrites local data
 * CRITICAL: Ensures chat exists before saving message to avoid FK constraint errors
 */
export async function syncMessageToLocal(firebaseMessage: Message): Promise<void> {
  try {
    // CRITICAL FIX: Ensure chat exists before saving message (FK constraint)
    // Check if chat exists in local DB
    const chatResult = await LocalChatService.getChat(firebaseMessage.chatId);
    
    if (!chatResult.success || !chatResult.data) {
      // Chat doesn't exist locally - fetch from Firebase and save with participants
      const fbChatResult = await FirebaseChatService.getChatFromFirebase(firebaseMessage.chatId);
      
      if (fbChatResult.success && fbChatResult.data) {
        // CRITICAL: Use helper that syncs participants FIRST
        await syncChatWithParticipants(fbChatResult.data);
      } else {
        // Don't save message if we can't get the chat (FK will fail)
        return;
      }
    }

    // Also ensure the message sender exists in local DB
    const senderResult = await LocalUserService.getUser(firebaseMessage.senderId);
    if (!senderResult.success || !senderResult.data) {
      const fbSenderResult = await FirebaseUserService.getUserFromFirebase(firebaseMessage.senderId);
      if (fbSenderResult.success && fbSenderResult.data) {
        await syncUserToLocal(fbSenderResult.data);
      }
    }

    const result = await LocalMessageService.saveMessage(firebaseMessage);

    if (!result.success) {
    }
  } catch (error) {
  }
}

/**
 * Sync a user from local database to Firebase
 */
export async function syncUserToFirebase(localUser: User): Promise<void> {
  try {
    const result = await FirebaseUserService.createUserInFirebase(localUser);

    if (!result.success) {
    }
  } catch (error) {
  }
}

/**
 * Sync a chat from local database to Firebase
 */
export async function syncChatToFirebase(localChat: Chat): Promise<void> {
  try {
    const result = await FirebaseChatService.createChatInFirebase(localChat);

    if (!result.success) {
    }
  } catch (error) {
  }
}

/**
 * Sync a message from local database to Firebase
 */
export async function syncMessageToFirebase(localMessage: Message): Promise<void> {
  try {
    const result = await FirebaseMessageService.sendMessageToFirebase(localMessage);

    if (!result.success) {
    }
  } catch (error) {
  }
}

/**
 * Perform initial sync on app launch
 * Downloads user's chats and recent messages from Firebase
 */
export async function initialSync(userId: string): Promise<void> {
  try {

    // 1. Fetch user's chats from Firebase
    const chatsResult = await new Promise<Chat[]>((resolve) => {
      let unsubscribe: (() => void) | null = null;
      unsubscribe = FirebaseChatService.subscribeToUserChats(userId, (chats) => {
        if (unsubscribe) unsubscribe(); // One-time fetch
        resolve(chats);
      });
    });


    // 2. Sync each chat and its recent messages (with error handling)
    for (const chat of chatsResult) {
      // IMPORTANT: Sync participants FIRST to avoid foreign key constraints
      // Fetch participants and sync them (INCLUDING current user!)
      for (const participantId of chat.participantIds) {
        try {
          const userResult = await FirebaseUserService.getUserFromFirebase(participantId);
          if (userResult.success && userResult.data) {
            await syncUserToLocal(userResult.data);
          }
        } catch (error) {
        }
      }

      // Now sync chat to local (after participants are in DB)
      try {
        await syncChatToLocal(chat);
      } catch (error) {
      }

      // Fetch recent messages (last 50) for this chat
      try {
        const messagesResult = await FirebaseMessageService.getMessagesFromFirebase(chat.id, 50);
        if (messagesResult.success && messagesResult.data) {
          for (const message of messagesResult.data) {
            try {
              await syncMessageToLocal(message);
            } catch (error) {
            }
          }
        }
      } catch (error) {
      }
    }

  } catch (error) {
    throw error;
  }
}

/**
 * Start real-time sync for a user
 * Sets up listeners for chats and messages
 */
export async function startRealtimeSync(userId: string): Promise<void> {
  try {

    // Subscribe to user's chats
    activeSubscriptions.userChats = FirebaseChatService.subscribeToUserChats(
      userId,
      async (chats) => {
        // Sync all chats to local (with error handling)
        for (const chat of chats) {
          // IMPORTANT: Sync participants FIRST to avoid foreign key constraints (INCLUDING current user!)
          for (const participantId of chat.participantIds) {
            try {
              const participantResult = await FirebaseUserService.getUserFromFirebase(participantId);
              if (participantResult.success && participantResult.data) {
                await syncUserToLocal(participantResult.data);
              }
            } catch (error) {
            }
          }

          // Now sync chat to local (after participants are in DB)
          try {
            await syncChatToLocal(chat);
          } catch (error) {
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

  } catch (error) {
    throw error;
  }
}

/**
 * Stop all real-time sync subscriptions
 * Cleans up all active listeners
 */
export function stopRealtimeSync(): void {
  try {

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

  } catch (error) {
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
