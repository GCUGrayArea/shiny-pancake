/**
 * Conversation Screen
 * Displays messages in a chat and allows sending new messages
 * 
 * Note: Chat is NOT created until the first message is sent
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, FlatList, RefreshControl, ViewToken } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { findOrCreateOneOnOneChat, getChatFromFirebase } from '@/services/firebase-chat.service';
import { getMessagesFromFirebase, markMessageDelivered, markMessageRead, subscribeToMessages, subscribeToMessageUpdates } from '@/services/firebase-message.service';
import { getUserFromFirebase, getAllUsersFromFirebase } from '@/services/firebase-user.service';
import { saveMessage, getMessagesByChat, updateMessageStatus, getPendingMessages } from '@/services/local-message.service';
import { enqueueMessage } from '@/services/message-queue.service';
import { useNetwork } from '@/contexts/NetworkContext';
import { saveChat } from '@/services/local-chat.service';
import { saveUser } from '@/services/local-user.service';
import * as NotificationManager from '@/services/notification-manager.service';
import * as UnreadService from '@/services/unread.service';
import { Message, User } from '@/types';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import TypingIndicator from '@/components/TypingIndicator';
import SmartReplyBar from '@/components/SmartReplyBar';
import Avatar from '@/components/Avatar';
import { computeMessageStatus } from '@/utils/message-status.utils';
import { getInitials } from '@/utils/chat.utils';
import { subscribeToTyping, type TypingUser } from '@/services/typing.service';
import type { LanguageCode, Reply } from '@/services/ai/types';
import { buildUserProfile } from '@/services/user-style.service';
import { generateSmartReplies, invalidateReplyCache, getCachedReplies, cacheReplies } from '@/services/ai/agents/smart-reply-agent';

type ConversationScreenRouteProp = RouteProp<MainStackParamList, 'Conversation'>;
type ConversationScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline, triggerQueueProcessing } = useNetwork();
  
  const { chatId: initialChatId, otherUserId, otherUserName, otherUserEmail, profilePictureUrl, isGroup, groupName } = route.params;
  
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [sending, setSending] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatSyncedToLocal, setChatSyncedToLocal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | undefined>(undefined);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loadedOtherUserName, setLoadedOtherUserName] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Smart reply state
  const [smartReplies, setSmartReplies] = useState<Reply[]>([]);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const insertTextFnRef = useRef<((text: string) => void) | null>(null);
  const smartReplyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Track which messages are currently being marked as read to prevent duplicates
  const markingAsReadRef = useRef<Set<string>>(new Set());
  const markingAsDeliveredRef = useRef<Set<string>>(new Set());

  // Store messages in ref to avoid recreating callbacks
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Track previously visible message IDs to prevent duplicate viewability calls
  const previouslyVisibleRef = useRef<Set<string>>(new Set());

  // Track last loadOlderMessages call to prevent spurious onEndReached fires
  const lastLoadOlderTimeRef = useRef<number>(0);
  const LOAD_OLDER_DEBOUNCE_MS = 2000; // Prevent rapid-fire calls

  // Extract stable user properties for dependencies
  const userId = user?.uid;
  const smartRepliesEnabled = user?.smartRepliesEnabled;
  const preferredLanguage = user?.preferredLanguage;

  // Set current viewing chat for notification suppression and mark as read
  useEffect(() => {
    if (chatId && user?.uid) {
      NotificationManager.setCurrentViewingChat(chatId);
      // Mark chat as read when user opens it
      UnreadService.markChatAsRead(chatId, user.uid);
    }

    return () => {
      NotificationManager.setCurrentViewingChat(null);
    };
  }, [chatId, user?.uid]);

  // Load other user's info if not provided (when opening from notification)
  useEffect(() => {
    if (!chatId || otherUserName || isGroup || !user) return;

    const loadOtherUser = async () => {
      try {
        const chatResult = await getChatFromFirebase(chatId);
        if (!chatResult.success || !chatResult.data) return;

        const chat = chatResult.data;
        const participantIds = Object.keys(chat.participantIds || {});
        const otherUserIdFromChat = participantIds.find(id => id !== user.uid);

        if (otherUserIdFromChat) {
          const userResult = await getUserFromFirebase(otherUserIdFromChat);
          if (userResult.success && userResult.data) {
            setLoadedOtherUserName(userResult.data.displayName);
          }
        }
      } catch (error) {
      }
    };

    loadOtherUser();
  }, [chatId, otherUserName, isGroup, user]);

  // Load user names for group chat participants
  const loadUserNames = useCallback(async () => {
    if (!isGroup || !chatId) return;

    try {
      const chatResult = await getChatFromFirebase(chatId);
      if (!chatResult.success) return;

      const chatData = chatResult.data!;
      const participantIds = Object.keys(chatData.participantIds || {});

      // Load all users and cache their names
      const usersResult = await getAllUsersFromFirebase();
      if (usersResult.success) {
        const users = usersResult.data || [];
        const nameMap = new Map<string, string>();

        participantIds.forEach(participantId => {
          const user = users.find(u => u.uid === participantId);
          if (user) {
            nameMap.set(participantId, user.displayName);
          }
        });

        setUserNames(nameMap);
      }
    } catch (error) {
    }
  }, [isGroup, chatId]);

  // Load user names when chat is available
  useEffect(() => {
    if (chatId && isGroup) {
      loadUserNames();
    }
  }, [chatId, isGroup, loadUserNames]);

  // Set the header title and right button based on chat type
  useEffect(() => {
    const effectiveOtherUserName = otherUserName || loadedOtherUserName;

    // For 1:1 chats: show other user's name, for group chats: show group name
    const displayName = isGroup
      ? (groupName || 'Group Chat')
      : (effectiveOtherUserName || otherUserEmail || 'Unknown');

    navigation.setOptions({
      title: displayName,
      headerTitle: isGroup ? displayName : () => {
        return (
          <View style={styles.headerTitleContainer}>
            <Avatar
              displayName={displayName}
              userId={otherUserId || 'unknown'}
              profilePictureUrl={profilePictureUrl}
              size="small"
            />
            <Text style={styles.headerTitleText}>
              {displayName}
            </Text>
          </View>
        );
      },
      headerRight: isGroup ? () => (
        <IconButton
          icon="information-outline"
          onPress={() => {
            if (chatId) {
              navigation.navigate('GroupInfo', {
                chatId,
                chatName: groupName || 'Group Chat'
              });
            }
          }}
        />
      ) : undefined,
    });
  }, [navigation, otherUserId, otherUserName, loadedOtherUserName, otherUserEmail, profilePictureUrl, isGroup, groupName, chatId]);

  // Load messages when chat ID is available
  useEffect(() => {
    if (chatId) {
      loadMessages().then(() => {
        // Auto-scroll to bottom after loading messages (when opening from notification)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      });
      // Ensure current user is synced to local database
      syncCurrentUserToLocal();
    }
  }, [chatId]);

  // Subscribe to new messages (onChildAdded)
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, async (newMessage) => {

      // The sync service handles saving messages with translations
      // Wait briefly for sync to complete, then get the updated message from local DB
      setTimeout(async () => {
        try {
          // Get the single message from local DB (it has translations)
          const localResult = await getMessagesByChat(chatId);
          if (localResult.success && localResult.data) {
            const messagesFromDb = localResult.data;
            const updatedMessage = messagesFromDb.find(m => m.id === newMessage.id);
            if (!updatedMessage) return;

            setMessages(prevMessages => {
              // Check if message already exists (by ID, localId, or content+timestamp match)
              const existingIndex = prevMessages.findIndex(m => {
                // Match by Firebase ID
                if (updatedMessage.id && m.id === updatedMessage.id) return true;
                // Match by localId (for optimistic updates)
                if (updatedMessage.localId && m.localId === updatedMessage.localId) return true;
                // Match by sender, content, and similar timestamp (within 2 seconds)
                // This catches the optimistic message when Firebase message comes back
                if (m.senderId === updatedMessage.senderId &&
                    m.content === updatedMessage.content &&
                    Math.abs(m.timestamp - updatedMessage.timestamp) < 2000) {
                  return true;
                }
                return false;
              });

              if (existingIndex >= 0) {
                // Replace optimistic message with synced message (has Firebase ID and delivery status)
                const newMessages = [...prevMessages];
                newMessages[existingIndex] = updatedMessage;
                return newMessages;
              }

              // New message - prepend it (messages are sorted DESC)
              return [updatedMessage, ...prevMessages];
            });
          }
        } catch (error) {
          console.error('Failed to add new message:', error);
        }
      }, 300); // Small delay to let sync service process translations
    });

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  // Subscribe to message updates (onChildChanged) - for delivery/read status
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessageUpdates(chatId, async (updatedMessage) => {
      // Update only the specific message that changed (avoid reloading all)
      try {
        setMessages(prevMessages => {
          const messageIndex = prevMessages.findIndex(m => m.id === updatedMessage.id);
          if (messageIndex === -1) return prevMessages;

          const existingMessage = prevMessages[messageIndex];

          // Check if message actually changed (deep equality for key fields)
          const hasChanged =
            existingMessage.status !== updatedMessage.status ||
            existingMessage.content !== updatedMessage.content ||
            JSON.stringify(existingMessage.readBy) !== JSON.stringify(updatedMessage.readBy) ||
            JSON.stringify(existingMessage.deliveredTo) !== JSON.stringify(updatedMessage.deliveredTo) ||
            existingMessage.translatedText !== updatedMessage.translatedText;

          if (!hasChanged) return prevMessages;

          // Create new array with updated message
          const newMessages = [...prevMessages];
          newMessages[messageIndex] = updatedMessage;
          return newMessages;
        });
      } catch (error) {
        console.error('Failed to update message:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!chatId || !user) return;

    const unsubscribe = subscribeToTyping(chatId, user.uid, async (typingUsersList: TypingUser[]) => {
      // Fetch full user objects for typing users
      const fullUsers: User[] = [];

      for (const typingUser of typingUsersList) {
        try {
          const userResult = await getUserFromFirebase(typingUser.uid);
          if (userResult.success && userResult.data) {
            fullUsers.push(userResult.data);
          }
        } catch (error) {
          // Silently ignore errors fetching user data
        }
      }

      setTypingUsers(fullUsers);
    });

    return () => {
      unsubscribe();
    };
  }, [chatId, user]);

  // Load messages (recent or older)
  const loadMessages = async (loadOlder: boolean = false) => {
    if (!chatId) return;

    try {
      if (loadOlder) {
        setLoadingOlderMessages(true);
      } else {
        setLoadingMessages(true);
      }

      let firebaseResult;
      if (loadOlder && oldestTimestamp) {
        // Load older messages using pagination
        firebaseResult = await getMessagesFromFirebase(chatId, 50, oldestTimestamp);
      } else {
        // Always fetch from Firebase to get the latest messages
        firebaseResult = await getMessagesFromFirebase(chatId);
      }
      
      // Combine messages from different sources
      let allMessages: Message[] = [];

      // Always try to load from local DB first (has translations from sync service)
      const localResult = await getMessagesByChat(chatId);

      if (localResult.success && localResult.data && localResult.data.length > 0) {
        allMessages = [...localResult.data];
      } else if (firebaseResult.success && firebaseResult.data && firebaseResult.data.length > 0) {
        // Fallback to Firebase if local DB is empty (shouldn't happen if sync ran)
        allMessages = [...firebaseResult.data];
      }

      // Add any pending messages from the queue (messages truly stuck in 'sending' state)
      const pendingResult = await getPendingMessages();
      if (pendingResult.success && pendingResult.data) {
        const pendingForThisChat = pendingResult.data.filter(m =>
          m.chatId === chatId && m.status === 'sending'  // Only truly pending messages
        );
        if (pendingForThisChat.length > 0) {
          // Add pending messages that aren't already in allMessages
          for (const pendingMsg of pendingForThisChat) {
            // More robust deduplication: check ID, localId, AND content+timestamp
            const alreadyExists = allMessages.some(m => {
              // Match by Firebase ID (if pending message has one)
              if (pendingMsg.id && m.id && pendingMsg.id === m.id) return true;
              // Match by localId (if Firebase message preserved it)
              if (pendingMsg.localId && m.localId && pendingMsg.localId === m.localId) return true;
              // Match by content and similar timestamp (within 5 seconds - allowing for clock skew)
              if (m.content === pendingMsg.content && 
                  Math.abs(m.timestamp - pendingMsg.timestamp) < 5000) return true;
              return false;
            });
            
            if (!alreadyExists) {
              allMessages.push(pendingMsg);
            } else {
            }
          }
        }
      }

      if (allMessages.length > 0) {
        // Sort by timestamp DESC (newest first) - FlatList inverted will show newest at bottom
        const sortedMessages = allMessages.sort((a, b) => b.timestamp - a.timestamp);

        if (loadOlder) {
          // Append older messages to end of existing messages
          setMessages(prev => {
            const combined = [...prev, ...sortedMessages];
            // Remove duplicates based on message ID
            const unique = combined.filter((message, index, self) =>
              index === self.findIndex(m => m.id === message.id)
            );
            return unique.sort((a, b) => b.timestamp - a.timestamp);
          });

          // Update oldest timestamp for next pagination (last in DESC array)
          if (sortedMessages.length > 0) {
            setOldestTimestamp(sortedMessages[sortedMessages.length - 1].timestamp);
          }

          // If we got fewer than requested, no more messages available
          if (sortedMessages.length < 50) {
            setHasMoreMessages(false);
          }
        } else {
          // Replace all messages (initial load or refresh)
          // BUT preserve any optimistic messages (status='sending' with localId but no Firebase ID)
          setMessages(prev => {
            const optimisticMessages = prev.filter(m => m.status === 'sending' && !m.id && m.localId);
            if (optimisticMessages.length > 0) {
              // Merge optimistic messages with loaded messages, remove duplicates
              const combined = [...optimisticMessages, ...sortedMessages];
              const unique = combined.filter((message, index, self) => {
                // For messages with Firebase ID, dedupe by ID
                if (message.id) {
                  return index === self.findIndex(m => m.id === message.id);
                }
                // For optimistic messages, dedupe by localId
                if (message.localId) {
                  return index === self.findIndex(m => m.localId === message.localId);
                }
                return true;
              });
              return unique.sort((a, b) => b.timestamp - a.timestamp);
            }
            return sortedMessages;
          });

          // Update oldest timestamp for pagination (last in DESC array)
          if (sortedMessages.length > 0) {
            setOldestTimestamp(sortedMessages[sortedMessages.length - 1].timestamp);
            setHasMoreMessages(sortedMessages.length >= 50); // If we got 50 messages, there might be more
          }
        }
      } else {
        if (!loadOlder) {
        }
      }
    } catch (error) {
      // Try local database as last resort
      try {
        const localResult = await getMessagesByChat(chatId);
        if (localResult.success && localResult.data) {
          const sortedMessages = localResult.data.sort((a, b) => b.timestamp - a.timestamp); // DESC for consistency
          // Preserve optimistic messages here too
          setMessages(prev => {
            const optimisticMessages = prev.filter(m => m.status === 'sending' && !m.id && m.localId);
            if (optimisticMessages.length > 0) {
              const combined = [...optimisticMessages, ...sortedMessages];
              return combined.sort((a, b) => b.timestamp - a.timestamp);
            }
            return sortedMessages;
          });
        }
      } catch (localError) {
      }
    } finally {
      if (loadOlder) {
        setLoadingOlderMessages(false);
      } else {
        setLoadingMessages(false);
      }
    }
  };

  // Load older messages when scrolling to top
  const loadOlderMessages = useCallback(() => {
    // CRITICAL: FlatList onEndReached fires spuriously on layout recalculations
    // Debounce to prevent infinite loop
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadOlderTimeRef.current;

    if (timeSinceLastLoad < LOAD_OLDER_DEBOUNCE_MS) {
      return; // Ignore spurious onEndReached fires (FlatList bug)
    }

    if (hasMoreMessages && !loadingOlderMessages && !loadingMessages) {
      lastLoadOlderTimeRef.current = now;
      loadMessages(true);
    }
  }, [hasMoreMessages, loadingOlderMessages, loadingMessages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  // Mark messages as delivered when they arrive on recipient's device
  const markMessagesAsDelivered = useCallback(async (msgs: Message[]) => {
    if (!userId || !chatId) return;

    for (const message of msgs) {
      // Only mark messages we didn't send
      // Must have Firebase ID (message is persisted)
      // Don't mark if we're already in the deliveredTo array
      // Don't mark if we're currently marking it
      if (message.senderId !== userId &&
          message.id &&
          !message.deliveredTo?.includes(userId) &&
          !markingAsDeliveredRef.current.has(message.id)) {

        // Add to tracking set
        markingAsDeliveredRef.current.add(message.id);

        try {
          // Update in Firebase (adds userId to deliveredTo array)
          // Firebase listener will update local state automatically
          await markMessageDelivered(message.id, chatId, userId);
        } finally {
          // Remove from tracking set after a delay (prevent immediate re-marking)
          setTimeout(() => {
            markingAsDeliveredRef.current.delete(message.id);
          }, 1000);
        }
      }
    }
  }, [userId, chatId]);

  // Mark messages as read when they become visible
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!userId || !chatId) return;

    for (const messageId of messageIds) {
      // Use ref to avoid recreating callback on every messages change
      const message = messagesRef.current.find(m => m.id === messageId);
      if (!message) continue;

      // Only mark messages we didn't send
      // Must have Firebase ID (message is persisted)
      // Don't mark if we're already in the readBy array
      // Don't mark if we're currently marking it (prevent duplicate calls)
      if (message.senderId !== userId &&
          message.id &&
          !message.readBy?.includes(userId) &&
          !markingAsReadRef.current.has(message.id)) {

        // Add to tracking set
        markingAsReadRef.current.add(message.id);

        try {
          // Update in Firebase (adds userId to readBy array)
          // Firebase listener will update local state automatically
          await markMessageRead(messageId, chatId, userId);
        } finally {
          // Remove from tracking set after a delay (prevent immediate re-marking)
          setTimeout(() => {
            markingAsReadRef.current.delete(message.id);
          }, 1000);
        }
      }
    }
  }, [userId, chatId]);

  // Handle viewable items changed (for read receipts)
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleMessageIds = viewableItems
      .map(item => (item.item as Message).id)
      .filter(Boolean);

    // CRITICAL: Ignore empty arrays - FlatList fires these spuriously during layout
    if (visibleMessageIds.length === 0) {
      return;
    }

    // Create a Set of current visible IDs for comparison
    const currentVisibleSet = new Set(visibleMessageIds);

    // Check if visible items actually changed
    const hasChanged =
      currentVisibleSet.size !== previouslyVisibleRef.current.size ||
      !Array.from(currentVisibleSet).every(id => previouslyVisibleRef.current.has(id));

    if (!hasChanged) {
      return;
    }

    // Update the tracking ref
    previouslyVisibleRef.current = currentVisibleSet;

    markMessagesAsRead(visibleMessageIds);
  }, [markMessagesAsRead]);

  // Memoize viewabilityConfig to prevent unnecessary re-renders
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Message must be 50% visible
    minimumViewTime: 500, // Must be visible for 500ms
  });

  // Memoize keyExtractor to prevent unnecessary re-renders
  // CRITICAL: Use localId first to maintain stable keys during optimistic → synced transition
  const keyExtractor = useCallback((item: Message) => {
    return item.localId || item.id || String(item.timestamp);
  }, []);

  // Memoize renderItem to prevent unnecessary FlatList re-renders
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    // For group chats, show sender indicator only when sender changes
    const showSenderIndicator = isGroup && item.senderId !== userId;
    const senderName = showSenderIndicator ? userNames.get(item.senderId) || 'Unknown' : undefined;

    // Check if this is the first message or if sender changed from previous message
    const shouldShowSenderIndicator = showSenderIndicator && (
      index === 0 || // First message always shows sender
      messagesRef.current[index - 1]?.senderId !== item.senderId // Sender changed from previous
    );

    return (
      <MessageBubble
        message={item}
        isOwnMessage={item.senderId === userId}
        currentUserId={userId}
        showSenderIndicator={shouldShowSenderIndicator}
        senderName={shouldShowSenderIndicator ? senderName : undefined}
        isGroup={isGroup}
        preferredLanguage={(preferredLanguage as LanguageCode) || 'en'}
        languageHelpEnabled={user?.culturalHintsEnabled || user?.slangExplanationsEnabled || false}
      />
    );
  }, [isGroup, userId, userNames, preferredLanguage, user?.culturalHintsEnabled, user?.slangExplanationsEnabled]);

  // Mark messages as delivered when they load
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsDelivered(messages);
    }
  }, [messages.length]); // Only run when message count changes

  const handleSendMessage = async (content: string, type: 'text' | 'image', imageUri?: string, caption?: string) => {
    if (!user || sending) return;

    try {
      setSending(true);

      let activeChatId = chatId;

      // If no chat exists yet, create it now (first message) - only if online
      if (!activeChatId) {
        if (!isOnline) {
          // TODO: Show error to user (Snackbar)
          return;
        }

        setCreatingChat(true);

        const chatResult = await findOrCreateOneOnOneChat(user.uid!, otherUserId!);

        if (!chatResult.success) {
          // TODO: Show error to user (Snackbar or Alert)
          setCreatingChat(false);
          return;
        }

        activeChatId = chatResult.data!;
        setChatId(activeChatId);
        setCreatingChat(false);

        // Sync chat and users to local database (required for foreign key constraints)
        // This ensures the chat exists in local DB before we try to enqueue a message
        try {
          await syncChatToLocal(activeChatId);
        } catch (error) {
          // Continue anyway - the check at line 506 will retry if needed
        }
      }

      // Create the message object
      const localId = `local_${Date.now()}_${Math.random()}`;
      const message: Message = {
        id: '', // Will be generated by Firebase
        chatId: activeChatId,
        senderId: user.uid,
        type,
        content,
        timestamp: Date.now(),
        status: 'sending',
        localId, // Temporary local ID for tracking
        ...(caption && { caption }), // Add caption if provided
      };


      // Sync chat/users to local DB BEFORE enqueueing (required for foreign key constraints)
      if (!chatSyncedToLocal) {
        try {
          await syncChatToLocal(activeChatId);
        } catch (error) {
          // Continue anyway - the sync function already handles individual failures
        }
      }

      // Add message to UI immediately (optimistic UI)
      // Prepend to array since messages are sorted DESC (newest first)
      setMessages(prev => [message, ...prev]);

      // ALL messages go through the queue (whether online or offline)
      const enqueueResult = await enqueueMessage(message);

      if (!enqueueResult.success) {
        // Remove the failed message from UI (check both localId and id)
        setMessages(prev => prev.filter(m => m.localId !== localId && m.id !== message.id));
        // TODO: Show error to user (Snackbar or Alert)
        return;
      }


      // Trigger NetworkProvider to process queue (single source of truth)
      // NetworkProvider will:
      // - Process immediately if online
      // - Wait until reconnection if offline
      // - Prevent concurrent processing
      triggerQueueProcessing();
      
    } catch (error) {
      // TODO: Show error to user
    } finally {
      setSending(false);
    }
  };

  // Sync current user to local database (needed for message sending)
  const syncCurrentUserToLocal = async () => {
    try {
      const currentUserData = await getUserFromFirebase(user!.uid);
      if (currentUserData.success && currentUserData.data) {
        await saveUser(currentUserData.data);
      } else {
      }
    } catch (error) {
    }
  };

  // Background sync helper (non-blocking)
  const syncChatToLocal = async (chatId: string) => {
    try {

      // Sync current user (needed for message sending)
      await syncCurrentUserToLocal();

      // Sync other user (for 1:1 chats)
      if (otherUserId) {
        const otherUserData = await getUserFromFirebase(otherUserId);
        if (otherUserData.success && otherUserData.data) {
          await saveUser(otherUserData.data);
        }
      }

      // Sync chat
      const chatData = await getChatFromFirebase(chatId);
      if (chatData.success && chatData.data) {
        await saveChat(chatData.data);
        setChatSyncedToLocal(true);
      }
    } catch (error) {
    }
  };

  // Smart reply generation function
  const generateReplies = useCallback(async (currentMessages: Message[]) => {
    if (!chatId || !userId || smartRepliesEnabled === false || currentMessages.length === 0) {
      return;
    }

    // Check cache first
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage.senderId === userId) {
      // Don't generate replies for own messages
      setShowSmartReplies(false);
      return;
    }

    // Use user's preferred language for replies
    const targetLanguage = (preferredLanguage as LanguageCode) || 'en';

    const cached = getCachedReplies(chatId, lastMessage.id, targetLanguage);
    if (cached) {
      setSmartReplies(cached);
      setShowSmartReplies(true);
      return;
    }

    setLoadingSmartReplies(true);
    try {
      // Build user style profile
      const profile = await buildUserProfile(userId, chatId);

      // Generate smart replies
      const replies = await generateSmartReplies(currentMessages, profile, {
        count: 3,
        targetLanguage
      });

      // Cache and display
      cacheReplies(chatId, lastMessage.id, replies, targetLanguage);
      setSmartReplies(replies);
      setShowSmartReplies(true);
    } catch (error) {
      console.error('Failed to generate smart replies:', error);
      setSmartReplies([]);
    } finally {
      setLoadingSmartReplies(false);
    }
  }, [chatId, userId, smartRepliesEnabled, preferredLanguage]);

  // Trigger smart reply generation when new messages arrive (debounced)
  // Use lastMessageId as dependency to avoid re-triggering on every messages array change
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const lastMessageSenderId = messages.length > 0 ? messages[messages.length - 1].senderId : null;

  useEffect(() => {
    if (!chatId || !userId || !lastMessageId) {
      return;
    }

    if (lastMessageSenderId === userId) {
      // Hide smart replies when user sends a message
      setShowSmartReplies(false);
      invalidateReplyCache(chatId);
      return;
    }

    // Clear previous debounce timer
    if (smartReplyDebounceRef.current) {
      clearTimeout(smartReplyDebounceRef.current);
    }

    // Debounce: wait 2 seconds after last message
    smartReplyDebounceRef.current = setTimeout(() => {
      generateReplies(messages);
    }, 2000);

    return () => {
      if (smartReplyDebounceRef.current) {
        clearTimeout(smartReplyDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId, lastMessageSenderId, chatId, userId]);

  // Handle smart reply selection
  const handleReplySelect = (reply: Reply) => {
    if (insertTextFnRef.current) {
      insertTextFnRef.current(reply.text);
      setShowSmartReplies(false);
    }
  };

  // Handle smart reply refresh
  const handleRefreshReplies = () => {
    if (chatId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        invalidateReplyCache(chatId);
      }
    }
    generateReplies(messages);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.messagesContainer}>
        {creatingChat ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator animating size="large" />
            <Text style={styles.loadingText}>Creating chat...</Text>
          </View>
        ) : loadingMessages ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator animating size="large" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {chatId 
                ? 'No messages yet. Start the conversation!'
                : `Send a message to start chatting with ${otherUserName}`
              }
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messagesList}
            inverted={true} // Show newest messages at bottom
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.1} // Load when scrolling up (inverted list)
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            // Performance optimizations
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            ListHeaderComponent={
              loadingOlderMessages ? (
                <View style={styles.loadingOlderContainer}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.loadingOlderText}>Loading older messages...</Text>
                </View>
              ) : hasMoreMessages ? (
                <View style={styles.loadMoreContainer}>
                  <Text style={styles.loadMoreText}>Scroll up to load older messages</Text>
                </View>
              ) : messages.length > 50 ? (
                <View style={styles.noMoreContainer}>
                  <Text style={styles.noMoreText}>No older messages</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Typing indicator above message input */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Smart reply suggestions */}
      <SmartReplyBar
        replies={smartReplies}
        loading={loadingSmartReplies}
        visible={showSmartReplies}
        onReplySelect={handleReplySelect}
        onRefresh={handleRefreshReplies}
      />

      <MessageInput
        onSendMessage={handleSendMessage}
        chatId={chatId}
        currentUserId={user?.uid}
        disabled={sending || creatingChat}
        placeholder={`Message ${otherUserName || otherUserEmail}...`}
        onTextInserted={(fn) => { insertTextFnRef.current = fn; }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 0, // Will be overridden by safe area insets
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    paddingVertical: 8,
  },
  loadingOlderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
  },
  loadingOlderText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadMoreContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  loadMoreText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  noMoreContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  noMoreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

