/**
 * Chat List Screen
 * Displays all user conversations with presence indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';
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
      const chatResult = await getAllChats();
      let chatsToDisplay = chatResult.data || [];

      console.log('📊 ChatListScreen: Found chats from DB', { count: chatsToDisplay.length, data: chatResult });

      // For demo purposes, add some sample chats if none exist
      if (chatsToDisplay.length === 0) {
        console.log('🎭 ChatListScreen: No chats found, adding sample data');
        const sampleChats: Chat[] = [
          {
            id: 'sample-chat-1',
            type: '1:1',
            participantIds: [user.uid, 'sample-user-1'],
            name: 'Alice Johnson',
            createdAt: Date.now() - 86400000,
            lastMessage: {
              content: 'Hey! How are you doing?',
              senderId: 'sample-user-1',
              timestamp: Date.now() - 3600000,
              type: 'text',
            },
            unreadCounts: {
              [user.uid]: 2,
            },
          },
          {
            id: 'sample-chat-2',
            type: '1:1',
            participantIds: [user.uid, 'sample-user-2'],
            name: 'Bob Smith',
            createdAt: Date.now() - 172800000,
            lastMessage: {
              content: 'Thanks for the help yesterday!',
              senderId: 'sample-user-2',
              timestamp: Date.now() - 7200000,
              type: 'text',
            },
          },
        ];
        chatsToDisplay = sampleChats;
      }

      // Sort by last message timestamp (most recent first)
      const sortedChats = chatsToDisplay.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp ?? a.createdAt;
        const bTime = b.lastMessage?.timestamp ?? b.createdAt;
        return bTime - aTime;
      });
      console.log('✅ ChatListScreen: Setting chats', { count: sortedChats.length });
      setChats(sortedChats);
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
    loadChats();
  }, [loadChats]);

  // Handle opening a chat
  const handleOpenChat = useCallback(async (chat: Chat) => {
    if (!user) return;

    console.log('💬 ChatListScreen: Opening chat:', chat.id);

    // For 1:1 chats, get the other user's info
    if (chat.type === '1:1') {
      const otherUserId = chat.participantIds.find(id => id !== user.uid);
      
      if (!otherUserId) {
        console.error('❌ ChatListScreen: Could not find other user in chat');
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
      // For group chats (future implementation)
      console.log('❌ ChatListScreen: Group chats not yet implemented');
      // TODO: Implement group chat navigation
    }
  }, [user, navigation]);

  // Render chat item
  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const lastMessage = chat.lastMessage;
    const preview = lastMessage?.content
      ? (lastMessage.content.length > 50
          ? lastMessage.content.substring(0, 50) + '...'
          : lastMessage.content)
      : 'No messages yet';

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
          <Text variant="titleMedium" style={styles.chatName}>
            {chat.name || `Chat ${chat.id.slice(-4)}`}
          </Text>

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
        style={styles.fab}
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
    bottom: 0,
  },
});
