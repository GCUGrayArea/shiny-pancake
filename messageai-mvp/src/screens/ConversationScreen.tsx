/**
 * Conversation Screen
 * Displays messages in a chat and allows sending new messages
 * 
 * Note: Chat is NOT created until the first message is sent
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, FlatList, RefreshControl, ViewToken } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { findOrCreateOneOnOneChat, getChatFromFirebase } from '@/services/firebase-chat.service';
import { getMessagesFromFirebase, markMessageDelivered, markMessageRead, subscribeToMessages, subscribeToMessageUpdates } from '@/services/firebase-message.service';
import { getUserFromFirebase } from '@/services/firebase-user.service';
import { saveMessage, getMessagesByChat, updateMessageStatus, getPendingMessages } from '@/services/local-message.service';
import { enqueueMessage } from '@/services/message-queue.service';
import { useNetwork } from '@/contexts/NetworkContext';
import { saveChat } from '@/services/local-chat.service';
import { saveUser } from '@/services/local-user.service';
import { Message } from '@/types';
import MessageBubble from '@/components/MessageBubble';
import { computeMessageStatus } from '@/utils/message-status.utils';

type ConversationScreenRouteProp = RouteProp<MainStackParamList, 'Conversation'>;
type ConversationScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const { user } = useAuth();
  const { isOnline, triggerQueueProcessing } = useNetwork();
  
  const { chatId: initialChatId, otherUserId, otherUserName, otherUserEmail } = route.params;
  
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatSyncedToLocal, setChatSyncedToLocal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Set the header title to the other user's name
  useEffect(() => {
    navigation.setOptions({
      title: otherUserName || otherUserEmail,
    });
  }, [navigation, otherUserName, otherUserEmail]);

  // Load messages when chat ID is available
  useEffect(() => {
    if (chatId) {
      loadMessages();
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

  const loadMessages = async () => {
    if (!chatId) return;

    try {
      setLoadingMessages(true);
      console.log('📥 ConversationScreen: Loading messages for chat:', chatId);

      // Always fetch from Firebase to get the latest messages
      console.log('📡 ConversationScreen: Fetching messages from Firebase');
      const firebaseResult = await getMessagesFromFirebase(chatId);
      
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

      // Sort by timestamp
      const sortedMessages = allMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedMessages.length > 0) {
        console.log('📋 ConversationScreen: Messages:', sortedMessages.map(m => ({ 
          id: m.id || m.localId, 
          content: m.content.substring(0, 20), 
          status: m.status,
          timestamp: m.timestamp 
        })));
      } else {
        console.log('⚠️ ConversationScreen: No messages found');
      }
      
      setMessages(sortedMessages);
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
      setLoadingMessages(false);
    }
  };

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

  const handleSendMessage = async () => {
    if (!user || !messageText.trim() || sending) return;

    const messageContent = messageText.trim();
    
    // Clear the input immediately (before async operations)
    setMessageText('');
    
    try {
      setSending(true);
      console.log('📤 ConversationScreen: Sending message');
      console.log('🌐 ConversationScreen: Network status:', isOnline ? 'online' : 'offline');

      let activeChatId = chatId;

      // If no chat exists yet, create it now (first message) - only if online
      if (!activeChatId) {
        if (!isOnline) {
          console.error('❌ ConversationScreen: Cannot create new chat while offline');
          // Restore message text
          setMessageText(messageContent);
          // TODO: Show error to user (Snackbar)
          return;
        }

        console.log('➕ ConversationScreen: Creating chat on first message');
        setCreatingChat(true);
        
        const chatResult = await findOrCreateOneOnOneChat(user.uid, otherUserId);
        
        if (!chatResult.success) {
          console.error('❌ ConversationScreen: Failed to create chat:', chatResult.error);
          // Restore message text
          setMessageText(messageContent);
          // TODO: Show error to user (Snackbar or Alert)
          setCreatingChat(false);
          return;
        }

        activeChatId = chatResult.data!;
        console.log('✅ ConversationScreen: Chat created:', activeChatId);
        setChatId(activeChatId);
        setCreatingChat(false);
      }

      // Create the message object
      const localId = `local_${Date.now()}_${Math.random()}`;
      const message: Message = {
        id: '', // Will be generated by Firebase
        chatId: activeChatId,
        senderId: user.uid,
        type: 'text',
        content: messageContent,
        timestamp: Date.now(),
        status: 'sending',
        localId, // Temporary local ID for tracking
      };

      console.log('📨 ConversationScreen: Enqueueing message to chat:', activeChatId);
      console.log('📝 ConversationScreen: Message content:', messageContent);

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

      // Sync chat/users to local DB in background (non-blocking, can fail)
      if (!chatSyncedToLocal && isOnline) {
        syncChatToLocal(activeChatId).catch(err => 
          console.error('Background chat sync failed:', err)
        );
      }
      
    } catch (error) {
      console.error('❌ ConversationScreen: Error sending message:', error);
      // TODO: Show error to user
    } finally {
      setSending(false);
    }
  };

  // Background sync helper (non-blocking)
  const syncChatToLocal = async (chatId: string) => {
    try {
      console.log('💾 ConversationScreen: Background sync of chat and users');
      
      // Sync current user
      const currentUserData = await getUserFromFirebase(user!.uid);
      if (currentUserData.success && currentUserData.data) {
        await saveUser(currentUserData.data);
      }
      
      // Sync other user
      const otherUserData = await getUserFromFirebase(otherUserId);
      if (otherUserData.success && otherUserData.data) {
        await saveUser(otherUserData.data);
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
      style={styles.container}
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
            data={messages}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.senderId === user?.uid}
                currentUserId={user?.uid}
              />
            )}
            keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          mode="outlined"
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          disabled={sending || creatingChat}
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />
        <IconButton
          icon="send"
          mode="contained"
          size={24}
          disabled={!messageText.trim() || sending || creatingChat}
          onPress={handleSendMessage}
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginBottom: 4,
  },
  messagesList: {
    paddingVertical: 8,
  },
});

