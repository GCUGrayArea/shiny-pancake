/**
 * Conversation Screen
 * Displays messages in a chat and allows sending new messages
 * 
 * Note: Chat is NOT created until the first message is sent
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, FlatList, RefreshControl } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { findOrCreateOneOnOneChat, getChatFromFirebase } from '@/services/firebase-chat.service';
import { sendMessageToFirebase, getMessagesFromFirebase } from '@/services/firebase-message.service';
import { getUserFromFirebase } from '@/services/firebase-user.service';
import { saveMessage, getMessagesByChat } from '@/services/local-message.service';
import { saveChat } from '@/services/local-chat.service';
import { saveUser } from '@/services/local-user.service';
import { Message } from '@/types';

type ConversationScreenRouteProp = RouteProp<MainStackParamList, 'Conversation'>;
type ConversationScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const { user } = useAuth();
  
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

  const loadMessages = async () => {
    if (!chatId) return;

    try {
      setLoadingMessages(true);
      console.log('📥 ConversationScreen: Loading messages for chat:', chatId);

      // Always fetch from Firebase to get the latest messages
      console.log('📡 ConversationScreen: Fetching messages from Firebase');
      const firebaseResult = await getMessagesFromFirebase(chatId);
      
      if (firebaseResult.success && firebaseResult.data && firebaseResult.data.length > 0) {
        console.log(`✅ ConversationScreen: Loaded ${firebaseResult.data.length} messages from Firebase`);
        const sortedMessages = firebaseResult.data.sort((a, b) => a.timestamp - b.timestamp);
        console.log('📋 ConversationScreen: Messages:', sortedMessages.map(m => ({ id: m.id, content: m.content.substring(0, 20), timestamp: m.timestamp })));
        setMessages(sortedMessages);
        
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
          const sortedMessages = localResult.data.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(sortedMessages);
        } else {
          console.log('⚠️ ConversationScreen: No messages found in Firebase or local DB');
          setMessages([]);
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
      setLoadingMessages(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!user || !messageText.trim() || sending) return;

    const messageContent = messageText.trim();
    
    try {
      setSending(true);
      console.log('📤 ConversationScreen: Sending message');

      let activeChatId = chatId;
      let needsSync = false;

      // If no chat exists yet, create it now (first message)
      if (!activeChatId) {
        console.log('➕ ConversationScreen: Creating chat on first message');
        setCreatingChat(true);
        
        const chatResult = await findOrCreateOneOnOneChat(user.uid, otherUserId);
        
        if (!chatResult.success) {
          console.error('❌ ConversationScreen: Failed to create chat:', chatResult.error);
          // TODO: Show error to user (Snackbar or Alert)
          return;
        }

        activeChatId = chatResult.data!;
        console.log('✅ ConversationScreen: Chat created:', activeChatId);
        setChatId(activeChatId);
        setCreatingChat(false);
        needsSync = true;
      }

      // Sync chat to local database if not already synced
      if (!chatSyncedToLocal) {
        console.log('💾 ConversationScreen: Syncing chat and users to local database');
        
        // First, ensure both users exist in local database
        console.log('👤 ConversationScreen: Syncing current user to local DB');
        const currentUserData = await getUserFromFirebase(user.uid);
        if (currentUserData.success && currentUserData.data) {
          await saveUser(currentUserData.data);
        }
        
        console.log('👤 ConversationScreen: Syncing other user to local DB');
        const otherUserData = await getUserFromFirebase(otherUserId);
        if (otherUserData.success && otherUserData.data) {
          await saveUser(otherUserData.data);
        }
        
        // Now sync the chat
        console.log('💬 ConversationScreen: Syncing chat to local DB');
        const chatData = await getChatFromFirebase(activeChatId);
        if (chatData.success && chatData.data) {
          const localChatResult = await saveChat(chatData.data);
          if (localChatResult.success) {
            console.log('✅ ConversationScreen: Chat synced to local DB');
            setChatSyncedToLocal(true);
          } else {
            console.error('❌ ConversationScreen: Failed to sync chat to local DB:', localChatResult.error);
            // Continue anyway - we can still send the message to Firebase
          }
        } else {
          console.error('❌ ConversationScreen: Failed to fetch chat from Firebase:', chatData.error);
        }
      }

      // Create the message object
      const message: Message = {
        id: '', // Will be generated by Firebase
        chatId: activeChatId,
        senderId: user.uid,
        type: 'text',
        content: messageContent,
        timestamp: Date.now(),
        status: 'sending',
        localId: `local_${Date.now()}_${Math.random()}`, // Temporary local ID
      };

      console.log('📨 ConversationScreen: Sending message to chat:', activeChatId);
      console.log('📝 ConversationScreen: Message content:', messageContent);

      // Clear the input immediately (optimistic UI)
      setMessageText('');

      // Send to Firebase
      const firebaseResult = await sendMessageToFirebase(message);
      
      if (!firebaseResult.success) {
        console.error('❌ ConversationScreen: Failed to send to Firebase:', firebaseResult.error);
        // TODO: Show error to user
        // TODO: Implement retry logic
        return;
      }

      const messageId = firebaseResult.data!;
      console.log('✅ ConversationScreen: Message sent to Firebase:', messageId);

      // Update message with server ID and status
      message.id = messageId;
      message.status = 'sent';

      // Save to local database
      const localResult = await saveMessage(message);
      
      if (!localResult.success) {
        console.error('❌ ConversationScreen: Failed to save to local DB:', localResult.error);
        // Message is already in Firebase, so this is not critical
        // But we should log it for debugging
      } else {
        console.log('✅ ConversationScreen: Message saved to local DB');
      }

      // Add message to UI immediately (optimistic UI)
      setMessages(prev => [...prev, message]);

      // TODO: Update chat's lastMessage
      
    } catch (error) {
      console.error('❌ ConversationScreen: Error sending message:', error);
      // TODO: Show error to user
    } finally {
      setSending(false);
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
              <View
                style={[
                  styles.messageBubble,
                  item.senderId === user?.uid ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
            contentContainerStyle={styles.messagesList}
            inverted={false}
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
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});

