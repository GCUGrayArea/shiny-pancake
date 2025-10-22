/**
 * Chat List Screen
 * Displays all user conversations with presence indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { Chat } from '@/types';
import { getRelativeTime } from '@/utils/time.utils';
import { getAllChats } from '@/services/local-chat.service';
import { getUserFromFirebase } from '@/services/firebase-user.service';
import { MainStackParamList } from '@/navigation/AppNavigator';

type ChatListNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatList'>;

export default function ChatListScreen() {
  console.log('💬 ChatListScreen: Component rendering');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<ChatListNavigationProp>();

  // Load chats from local database
  const loadChats = useCallback(async () => {
    console.log('🔄 ChatListScreen: Loading chats for user', user?.uid);
    if (!user) {
      console.log('❌ ChatListScreen: No user found, skipping chat load');
      return;
    }

    try {
      setLoading(true);
      const chatResult = await getAllChats(user.uid);
      let chatsToDisplay = chatResult.data || [];

      console.log('📊 ChatListScreen: Found chats from DB', { count: chatsToDisplay.length, data: chatResult });

      // Don't add sample data - just show empty state
      // (Sample data was causing infinite loop when chats updated)
      if (chatsToDisplay.length === 0) {
        console.log('ℹ️ ChatListScreen: No chats found - showing empty state');
      }

      // Sort by last message timestamp (most recent first)
      const sortedChats = chatsToDisplay.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp ?? a.createdAt;
        const bTime = b.lastMessage?.timestamp ?? b.createdAt;
        return bTime - aTime;
      });
      console.log('✅ ChatListScreen: Setting chats', { count: sortedChats.length });
      setChats(sortedChats);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('❌ Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh chats
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  useEffect(() => {
    // Only load once when component mounts or user changes
    if (!hasLoadedOnce || !user) {
      loadChats();
    }
  }, [user?.uid]); // Only depend on user ID, not the whole user object or loadChats

  // Handle opening a chat
  const handleOpenChat = useCallback(async (chat: Chat) => {
    if (!user) return;

    console.log('💬 ChatListScreen: Opening chat:', chat.id);
    console.log('💬 ChatListScreen: Chat type:', chat.type);
    console.log('💬 ChatListScreen: Chat participants (local):', chat.participantIds);
    console.log('💬 ChatListScreen: Current user:', user.uid);
    
    // Fetch the chat from Firebase to compare
    const { getChatFromFirebase } = await import('@/services/firebase-chat.service');
    const firebaseChat = await getChatFromFirebase(chat.id);
    
    if (firebaseChat.success && firebaseChat.data) {
      console.log('🔥 ChatListScreen: Chat participants (Firebase):', firebaseChat.data.participantIds);
      
      // If Firebase has more participants than local, use Firebase data
      if (firebaseChat.data.participantIds.length > chat.participantIds.length) {
        console.log('⚠️ ChatListScreen: Local chat data is outdated, using Firebase data');
        chat = firebaseChat.data;
      }
    } else {
      console.log('⚠️ ChatListScreen: Could not fetch chat from Firebase:', firebaseChat.error);
    }

    // For 1:1 chats, get the other user's info
    if (chat.type === '1:1') {
      const otherUserId = chat.participantIds.find(id => id !== user.uid);
      
      if (!otherUserId) {
        console.error('❌ ChatListScreen: Could not find other user in chat');
        console.error('❌ ChatListScreen: Participant IDs:', JSON.stringify(chat.participantIds));
        console.error('❌ ChatListScreen: Current user ID:', user.uid);
        
        // If we have exactly one participant and it's not us, that's the other user
        if (chat.participantIds.length === 1 && chat.participantIds[0] !== user.uid) {
          const fallbackOtherUserId = chat.participantIds[0];
          console.log('⚠️ ChatListScreen: Using fallback participant:', fallbackOtherUserId);
          
          navigation.navigate('Conversation', {
            chatId: chat.id,
            otherUserId: fallbackOtherUserId,
            otherUserName: chat.name || 'Unknown User',
            otherUserEmail: 'unknown',
          });
          return;
        }
        
        // Otherwise, we can't determine the other user
        console.error('❌ ChatListScreen: Cannot determine other user, aborting');
        return;
      }

      console.log('👤 ChatListScreen: Fetching other user info:', otherUserId);
      const userResult = await getUserFromFirebase(otherUserId);
      
      if (!userResult.success || !userResult.data) {
        console.error('❌ ChatListScreen: Failed to fetch user info:', userResult.error);
        // Navigate anyway with fallback values
        navigation.navigate('Conversation', {
          chatId: chat.id,
          otherUserId,
          otherUserName: chat.name || 'Unknown User',
          otherUserEmail: 'unknown',
        });
        return;
      }

      const otherUser = userResult.data;
      console.log('✅ ChatListScreen: Navigating to conversation with:', otherUser.displayName);
      
      navigation.navigate('Conversation', {
        chatId: chat.id,
        otherUserId: otherUser.uid,
        otherUserName: otherUser.displayName,
        otherUserEmail: otherUser.email,
      });
    } else {
      // For group chats
      console.log('👥 ChatListScreen: Opening group chat:', chat.id);
      navigation.navigate('Conversation', {
        chatId: chat.id,
        isGroup: true,
        groupName: chat.name || 'Group Chat'
      });
    }
  }, [user, navigation]);

  // Render chat item
  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const lastMessage = chat.lastMessage;

    // Create preview with sender name for group chats
    let preview: string;
    if (chat.type === 'group') {
      if (lastMessage?.senderId && lastMessage?.content) {
        // For group chats, show sender name + message
        preview = `${lastMessage.senderId === user?.uid ? 'You' : 'Unknown'}: ${lastMessage.content.length > 40
          ? lastMessage.content.substring(0, 40) + '...'
          : lastMessage.content}`;
      } else {
        preview = 'No messages yet';
      }
    } else {
      // For 1:1 chats, just show the message
      preview = lastMessage?.content
        ? (lastMessage.content.length > 50
            ? lastMessage.content.substring(0, 50) + '...'
            : lastMessage.content)
        : 'No messages yet';
    }

    const timestamp = lastMessage?.timestamp ?? chat.createdAt;
    const relativeTime = getRelativeTime(timestamp);

    // For 1:1 chats, show online status of the other participant
    const isOneOnOne = chat.type === '1:1';
    const otherParticipantId = isOneOnOne
      ? chat.participantIds.find(id => id !== user?.uid)
      : null;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.chatItemPressed
        ]}
        onPress={() => handleOpenChat(chat)}
      >
        <View style={styles.chatContent}>
          <View style={styles.chatNameRow}>
            <Text variant="titleMedium" style={styles.chatName}>
              {chat.name || `Chat ${chat.id.slice(-4)}`}
            </Text>
            {chat.type === 'group' && (
              <Text variant="bodySmall" style={styles.groupIndicator}>
                Group
              </Text>
            )}
          </View>

          <Text variant="bodyMedium" style={styles.lastMessage}>
            {preview}
          </Text>

          <View style={styles.chatMeta}>
            <Text variant="bodySmall" style={styles.timestamp}>
              {relativeTime}
            </Text>

            {isOneOnOne && otherParticipantId && (
              <Text
                variant="bodySmall"
                style={[
                  styles.onlineStatus,
                  { color: '#4CAF50' } // Assume online for now - will be replaced with real presence
                ]}
              >
                Online
              </Text>
            )}

            {chat.type === 'group' && (
              <Text variant="bodySmall" style={styles.participantCount}>
                {chat.participantIds?.length || 0} members
              </Text>
            )}
          </View>
        </View>

        {(() => {
          const unreadCount = chat.unreadCounts?.[user?.uid || ''];
          return unreadCount && unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount}
              </Text>
            </View>
          ) : null;
        })()}
      </Pressable>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    console.log('📭 ChatListScreen: Rendering empty state');
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No chats yet
        </Text>
        <Text variant="bodyLarge" style={styles.emptySubtitle}>
          Start a conversation to see your chats here
        </Text>
      </View>
    );
  };

  if (loading) {
    console.log('⏳ ChatListScreen: Showing loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  console.log('📋 ChatListScreen: Rendering chat list', { chatCount: chats.length, user: user?.uid });

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={chats.length === 0 ? styles.emptyList : undefined}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => {
          console.log('➕ ChatListScreen: New chat button pressed');
          navigation.navigate('NewChat' as never);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#666',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  chatItemPressed: {
    backgroundColor: '#F5F5F5',
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  lastMessage: {
    color: '#666',
    marginBottom: 4,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
  },
  onlineStatus: {
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    // bottom: 0, // Now set dynamically with safe area insets
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupIndicator: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 8,
  },
  participantCount: {
    color: '#666',
    fontSize: 12,
  },
});
