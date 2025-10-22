/**
 * Conversation Screen
 * Displays messages in a chat and allows sending new messages
 * 
 * Note: Chat is NOT created until the first message is sent
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Message } from '@/types';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
// import Avatar from '@/components/Avatar'; // Temporarily disabled due to import issues
import { computeMessageStatus } from '@/utils/message-status.utils';

type ConversationScreenRouteProp = RouteProp<MainStackParamList, 'Conversation'>;
type ConversationScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline, triggerQueueProcessing } = useNetwork();
  
  const { chatId: initialChatId, otherUserId, otherUserName, otherUserEmail, isGroup, groupName } = route.params;
  
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
  const flatListRef = useRef<FlatList>(null);

  // Set current viewing chat for notification suppression
  useEffect(() => {
    if (chatId) {
      NotificationManager.setCurrentViewingChat(chatId);
      console.log('📱 ConversationScreen: Set current viewing chat:', chatId);
    }

    return () => {
      NotificationManager.setCurrentViewingChat(null);
      console.log('📱 ConversationScreen: Cleared current viewing chat');
    };
  }, [chatId]);

  // Load other user's info if not provided (when opening from notification)
  useEffect(() => {
    if (!chatId || otherUserName || isGroup || !user) return;

    const loadOtherUser = async () => {
      try {
        console.log('👤 ConversationScreen: Loading other user info for 1:1 chat');
        const chatResult = await getChatFromFirebase(chatId);
        if (!chatResult.success || !chatResult.data) return;

        const chat = chatResult.data;
        const participantIds = Object.keys(chat.participantIds || {});
        const otherUserIdFromChat = participantIds.find(id => id !== user.uid);

        if (otherUserIdFromChat) {
          const userResult = await getUserFromFirebase(otherUserIdFromChat);
          if (userResult.success && userResult.data) {
            console.log('✅ ConversationScreen: Loaded other user:', userResult.data.displayName);
            setLoadedOtherUserName(userResult.data.displayName);
          }
        }
      } catch (error) {
        console.error('❌ ConversationScreen: Error loading other user info:', error);
      }
    };

    loadOtherUser();
  }, [chatId, otherUserName, isGroup, user]);

  // Load user names for group chat participants
  const loadUserNames = useCallback(async () => {
    if (!isGroup || !chatId) return;

    try {
      console.log('👤 ConversationScreen: Loading user names for group chat');
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
        console.log('✅ ConversationScreen: Loaded user names:', nameMap.size);
      }
    } catch (error) {
      console.error('❌ ConversationScreen: Error loading user names:', error);
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
    const title = isGroup ? (groupName || 'Group Chat') : (effectiveOtherUserName || otherUserEmail);

    navigation.setOptions({
      title: !isGroup ? effectiveOtherUserName || otherUserEmail : title,
      headerTitle: isGroup ? title : () => {
        const displayName = effectiveOtherUserName || otherUserEmail || 'Unknown';
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        return (
          <View style={styles.headerTitleContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
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
  }, [navigation, otherUserName, loadedOtherUserName, otherUserEmail, isGroup, groupName, chatId, otherUserId]);

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

    console.log('🔔 ConversationScreen: Subscribing to new messages for chat:', chatId);
    
    const unsubscribe = subscribeToMessages(chatId, async (newMessage) => {
      console.log('📨 ConversationScreen: Received new message');
      console.log('  ID:', newMessage.id);
      console.log('  LocalID:', newMessage.localId);
      console.log('  Content:', newMessage.content.substring(0, 20));
      
      // Save to local database
      await saveMessage(newMessage);
      
      // Update state
      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === newMessage.id);
        
        if (existingIndex >= 0) {
          // Message already exists (shouldn't happen with onChildAdded, but handle it)
          console.log('  → Message already exists, ignoring');
          return prev;
        } else {
          // Check if this replaces an optimistic message by localId
          const localIdMatch = prev.find(m => m.localId === newMessage.localId);
          if (localIdMatch) {
            // Replace the optimistic message with the real one
            console.log('  → Replacing optimistic message by localId:', newMessage.localId);
            return prev.map(m => m.localId === newMessage.localId ? newMessage : m);
          }
          // Completely new message from other user
          console.log('  → Adding new message from other user');
          return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        }
      });
    });

    return () => {
      console.log('🔕 ConversationScreen: Unsubscribing from new messages');
      unsubscribe();
    };
  }, [chatId]);

  // Subscribe to message updates (onChildChanged) - for delivery/read status
  useEffect(() => {
    if (!chatId) return;

    console.log('🔔 ConversationScreen: Subscribing to message updates for chat:', chatId);
    
    const unsubscribe = subscribeToMessageUpdates(chatId, async (updatedMessage) => {
      console.log('🔄 ConversationScreen: Received message update');
      console.log('  ID:', updatedMessage.id);
      console.log('  DeliveredTo:', updatedMessage.deliveredTo);
      console.log('  ReadBy:', updatedMessage.readBy);
      
      // Save to local database
      await saveMessage(updatedMessage);
      
      // Update state - replace the message with the updated version
      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === updatedMessage.id);
        
        if (existingIndex >= 0) {
          console.log('  → Updating existing message at index', existingIndex);
          const updated = [...prev];
          updated[existingIndex] = updatedMessage;
          return updated;
        } else {
          console.log('  → Message not found in state, ignoring update');
          return prev;
        }
      });
    });

    return () => {
      console.log('🔕 ConversationScreen: Unsubscribing from message updates');
      unsubscribe();
    };
  }, [chatId]);

  // Load messages (recent or older)
  const loadMessages = async (loadOlder: boolean = false) => {
    if (!chatId) return;

    try {
      if (loadOlder) {
        setLoadingOlderMessages(true);
      } else {
        setLoadingMessages(true);
      }
      console.log(`📥 ConversationScreen: Loading ${loadOlder ? 'older' : 'recent'} messages for chat:`, chatId);

      let firebaseResult;
      if (loadOlder && oldestTimestamp) {
        // Load older messages using pagination
        console.log('📡 ConversationScreen: Fetching older messages from Firebase');
        firebaseResult = await getMessagesFromFirebase(chatId, 50, oldestTimestamp);
      } else {
        // Always fetch from Firebase to get the latest messages
        console.log('📡 ConversationScreen: Fetching recent messages from Firebase');
        firebaseResult = await getMessagesFromFirebase(chatId);
      }
      
      // Combine messages from different sources
      let allMessages: Message[] = [];

      if (firebaseResult.success && firebaseResult.data && firebaseResult.data.length > 0) {
        console.log(`✅ ConversationScreen: Loaded ${firebaseResult.data.length} messages from Firebase`);
        allMessages = [...firebaseResult.data];
        
        // Save to local DB for offline access
        for (const message of firebaseResult.data) {
          await saveMessage(message);
        }
      } else {
        // Fallback to local database if Firebase fails or returns no messages
        console.log('💾 ConversationScreen: Falling back to local database');
        const localResult = await getMessagesByChat(chatId);
        
        if (localResult.success && localResult.data && localResult.data.length > 0) {
          console.log(`✅ ConversationScreen: Loaded ${localResult.data.length} messages from local DB`);
          allMessages = [...localResult.data];
        }
      }

      // Add any pending messages from the queue (messages truly stuck in 'sending' state)
      const pendingResult = await getPendingMessages();
      if (pendingResult.success && pendingResult.data) {
        const pendingForThisChat = pendingResult.data.filter(m => 
          m.chatId === chatId && m.status === 'sending'  // Only truly pending messages
        );
        if (pendingForThisChat.length > 0) {
          console.log(`📤 ConversationScreen: Found ${pendingForThisChat.length} pending messages in queue`);
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
              console.log(`  ➕ Adding pending message: ${pendingMsg.localId}`);
              allMessages.push(pendingMsg);
            } else {
              console.log(`  ⏭️ Skipping duplicate: ${pendingMsg.localId}`);
            }
          }
        }
      }

      if (allMessages.length > 0) {
        // Sort by timestamp
        const sortedMessages = allMessages.sort((a, b) => a.timestamp - b.timestamp);

        if (loadOlder) {
          // Prepend older messages to existing messages
          setMessages(prev => {
            const combined = [...sortedMessages, ...prev];
            // Remove duplicates based on message ID
            const unique = combined.filter((message, index, self) =>
              index === self.findIndex(m => m.id === message.id)
            );
            return unique.sort((a, b) => a.timestamp - b.timestamp);
          });

          // Update oldest timestamp for next pagination
          if (sortedMessages.length > 0) {
            setOldestTimestamp(sortedMessages[0].timestamp);
          }

          // If we got fewer than requested, no more messages available
          if (sortedMessages.length < 50) {
            setHasMoreMessages(false);
          }
        } else {
          // Replace all messages (initial load or refresh)
          setMessages(sortedMessages);

          // Update oldest timestamp for pagination
          if (sortedMessages.length > 0) {
            setOldestTimestamp(sortedMessages[0].timestamp);
            setHasMoreMessages(sortedMessages.length >= 50); // If we got 50 messages, there might be more
          }
        }

        console.log('📋 ConversationScreen: Messages:', sortedMessages.map(m => ({
          id: m.id || m.localId,
          content: m.content.substring(0, 20),
          status: m.status,
          timestamp: m.timestamp
        })));
      } else {
        if (!loadOlder) {
          console.log('⚠️ ConversationScreen: No messages found');
        }
      }
    } catch (error) {
      console.error('❌ ConversationScreen: Error loading messages:', error);
      // Try local database as last resort
      try {
        console.log('💾 ConversationScreen: Error occurred, trying local database');
        const localResult = await getMessagesByChat(chatId);
        if (localResult.success && localResult.data) {
          console.log(`✅ ConversationScreen: Loaded ${localResult.data.length} messages from local DB after error`);
          const sortedMessages = localResult.data.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(sortedMessages);
        }
      } catch (localError) {
        console.error('❌ ConversationScreen: Error loading from local DB:', localError);
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
    if (hasMoreMessages && !loadingOlderMessages && !loadingMessages) {
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
    if (!user || !chatId) return;

    for (const message of msgs) {
      // Only mark messages we didn't send
      // Must have Firebase ID (message is persisted)
      // Don't mark if we're already in the deliveredTo array
      if (message.senderId !== user.uid && 
          message.id &&
          !message.deliveredTo?.includes(user.uid)) {
        console.log('📬 ConversationScreen: Marking message as delivered:', message.id);
        
        // Update in Firebase (adds user.uid to deliveredTo array)
        // Firebase listener will update local state automatically
        await markMessageDelivered(message.id, chatId, user.uid);
      }
    }
  }, [user, chatId]);

  // Mark messages as read when they become visible
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || !chatId) return;

    for (const messageId of messageIds) {
      const message = messages.find(m => m.id === messageId);
      if (!message) continue;

      // Only mark messages we didn't send
      // Must have Firebase ID (message is persisted)
      // Don't mark if we're already in the readBy array
      if (message.senderId !== user.uid && 
          message.id &&
          !message.readBy?.includes(user.uid)) {
        console.log('👁️ ConversationScreen: Marking message as read:', messageId);
        
        // Update in Firebase (adds user.uid to readBy array)
        // Firebase listener will update local state automatically
        await markMessageRead(messageId, chatId, user.uid);
      }
    }
  }, [user, chatId, messages]);

  // Handle viewable items changed (for read receipts)
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleMessageIds = viewableItems
      .map(item => (item.item as Message).id)
      .filter(Boolean);
    
    if (visibleMessageIds.length > 0) {
      markMessagesAsRead(visibleMessageIds);
    }
  }, [markMessagesAsRead]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Message must be 50% visible
    minimumViewTime: 500, // Must be visible for 500ms
  };

  // Mark messages as delivered when they load
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsDelivered(messages);
    }
  }, [messages.length]); // Only run when message count changes

  const handleSendMessage = async (content: string, type: 'text' | 'image', imageUri?: string) => {
    if (!user || sending) return;
    
    try {
      setSending(true);
      console.log('📤 ConversationScreen: Sending message');
      console.log('🌐 ConversationScreen: Network status:', isOnline ? 'online' : 'offline');

      let activeChatId = chatId;

      // If no chat exists yet, create it now (first message) - only if online
      if (!activeChatId) {
        if (!isOnline) {
          console.error('❌ ConversationScreen: Cannot create new chat while offline');
          // TODO: Show error to user (Snackbar)
          return;
        }

        console.log('➕ ConversationScreen: Creating chat on first message');
        setCreatingChat(true);
        
        const chatResult = await findOrCreateOneOnOneChat(user.uid, otherUserId);
        
        if (!chatResult.success) {
          console.error('❌ ConversationScreen: Failed to create chat:', chatResult.error);
          // TODO: Show error to user (Snackbar or Alert)
          setCreatingChat(false);
          return;
        }

        activeChatId = chatResult.data!;
        console.log('✅ ConversationScreen: Chat created:', activeChatId);
        setChatId(activeChatId);
        setCreatingChat(false);

        // Sync chat and users to local database (required for foreign key constraints)
        // This ensures the chat exists in local DB before we try to enqueue a message
        try {
          console.log('🔄 ConversationScreen: Syncing newly created chat to local');
          await syncChatToLocal(activeChatId);
        } catch (error) {
          console.error('Failed to sync chat to local:', error);
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
      };

      console.log('📨 ConversationScreen: Enqueueing message to chat:', activeChatId);
      console.log('📝 ConversationScreen: Message content:', content.substring(0, 50));

      // Sync chat/users to local DB BEFORE enqueueing (required for foreign key constraints)
      if (!chatSyncedToLocal) {
        try {
          console.log('🔄 ConversationScreen: Syncing chat to local before enqueueing message');
          await syncChatToLocal(activeChatId);
        } catch (error) {
          console.error('❌ ConversationScreen: Failed to sync chat to local:', error);
          // Continue anyway - the sync function already handles individual failures
        }
      }

      // Add message to UI immediately (optimistic UI)
      setMessages(prev => [...prev, message]);

      // ALL messages go through the queue (whether online or offline)
      const enqueueResult = await enqueueMessage(message);
      
      if (!enqueueResult.success) {
        console.error('❌ ConversationScreen: Failed to enqueue message:', enqueueResult.error);
        // Remove the failed message from UI
        setMessages(prev => prev.filter(m => m.localId !== localId));
        // TODO: Show error to user (Snackbar or Alert)
        return;
      }

      console.log('✅ ConversationScreen: Message enqueued successfully');

      // Trigger NetworkProvider to process queue (single source of truth)
      // NetworkProvider will:
      // - Process immediately if online
      // - Wait until reconnection if offline
      // - Prevent concurrent processing
      triggerQueueProcessing();
      
    } catch (error) {
      console.error('❌ ConversationScreen: Error sending message:', error);
      // TODO: Show error to user
    } finally {
      setSending(false);
    }
  };

  // Sync current user to local database (needed for message sending)
  const syncCurrentUserToLocal = async () => {
    try {
      console.log('👤 ConversationScreen: Syncing current user to local database');
      const currentUserData = await getUserFromFirebase(user!.uid);
      if (currentUserData.success && currentUserData.data) {
        await saveUser(currentUserData.data);
        console.log('✅ ConversationScreen: Current user synced to local database');
      } else {
        console.error('❌ ConversationScreen: Failed to get current user data from Firebase');
      }
    } catch (error) {
      console.error('❌ ConversationScreen: Error syncing current user to local:', error);
    }
  };

  // Background sync helper (non-blocking)
  const syncChatToLocal = async (chatId: string) => {
    try {
      console.log('💾 ConversationScreen: Background sync of chat and users');

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
        console.log('✅ ConversationScreen: Background sync complete');
      }
    } catch (error) {
      console.error('❌ ConversationScreen: Background sync failed:', error);
    }
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
            renderItem={({ item, index }) => {
              // For group chats, show sender indicator only when sender changes
              const showSenderIndicator = isGroup && item.senderId !== user?.uid;
              const senderName = showSenderIndicator ? userNames.get(item.senderId) || 'Unknown' : undefined;

              // Check if this is the first message or if sender changed from previous message
              const shouldShowSenderIndicator = showSenderIndicator && (
                index === 0 || // First message always shows sender
                messages[index - 1].senderId !== item.senderId // Sender changed from previous
              );

              return (
                <MessageBubble
                  message={item}
                  isOwnMessage={item.senderId === user?.uid}
                  currentUserId={user?.uid}
                  showSenderIndicator={shouldShowSenderIndicator}
                  senderName={shouldShowSenderIndicator ? senderName : undefined}
                  isGroup={isGroup}
                />
              );
            }}
            keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.1} // Load when 10% from top
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
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

      <MessageInput
        onSendMessage={handleSendMessage}
        chatId={chatId}
        disabled={sending || creatingChat}
        placeholder={`Message ${otherUserName || otherUserEmail}...`}
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

