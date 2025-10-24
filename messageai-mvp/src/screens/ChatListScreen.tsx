/**
 * Chat List Screen
 * Displays all user conversations with presence indicators
 */

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Chat } from '@/types';
import { getRelativeTime } from '@/utils/time.utils';
import { getAllChats } from '@/services/local-chat.service';
import { getUserFromFirebase } from '@/services/firebase-user.service';
import { getUsers } from '@/services/local-user.service';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { getChatDisplayName } from '@/utils/chat.utils';

type ChatListNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatList'>;

export default function ChatListScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<ChatListNavigationProp>();

  // Add AI Settings and Profile buttons to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="account-circle" size={24} color="#6200ee" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AISettings')}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="robot" size={24} color="#6200ee" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // Load chats from local database
  const loadChats = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);

      // First, refresh from Firebase to ensure we have latest data with correct participantIds
      const { getUserChatsFromFirebase } = await import('@/services/firebase-chat.service');
      const { saveChat: saveChatLocal } = await import('@/services/local-chat.service');

      const firebaseResult = await getUserChatsFromFirebase(user.uid);
      if (firebaseResult.success && firebaseResult.data) {
        // If Firebase has no chats, clear local database
        if (firebaseResult.data.length === 0) {
          const { clearAllData } = await import('@/services/database.service');
          await clearAllData();
          console.log('Cleared local database - Firebase has no chats');
          // Set chats to empty immediately
          setChats([]);
          setHasLoadedOnce(true);
          setLoading(false);
          return; // Exit early
        } else {
          // Save all chats to local database to fix any stale data
          for (const chat of firebaseResult.data) {
            await saveChatLocal(chat);
          }
        }
      }

      const chatResult = await getAllChats(user.uid);
      let chatsToDisplay = chatResult.data || [];

      // Sort by last message timestamp (most recent first)
      const sortedChats = chatsToDisplay.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp ?? a.createdAt;
        const bTime = b.lastMessage?.timestamp ?? b.createdAt;
        return bTime - aTime;
      });
      setChats(sortedChats);

      // Load user names for 1:1 chats
      const userIdsToLoad = new Set<string>();
      for (const chat of sortedChats) {
        if (chat.type === '1:1') {
          const participantIds = Array.isArray(chat.participantIds)
            ? chat.participantIds
            : Object.keys(chat.participantIds || {});
          const otherUserId = participantIds.find(id => id !== user.uid);
          if (otherUserId) {
            userIdsToLoad.add(otherUserId);
          }
        }
      }

      if (userIdsToLoad.size > 0) {
        const newUserNames = new Map<string, string>();

        // Try to load from local database first
        const usersResult = await getUsers(Array.from(userIdsToLoad));
        if (usersResult.success && usersResult.data) {
          for (const u of usersResult.data) {
            newUserNames.set(u.uid, u.displayName);
          }
        }

        // For any users not found locally, fetch from Firebase
        const missingUserIds = Array.from(userIdsToLoad).filter(
          uid => !newUserNames.has(uid)
        );

        for (const uid of missingUserIds) {
          try {
            const userResult = await getUserFromFirebase(uid);
            if (userResult.success && userResult.data) {
              newUserNames.set(uid, userResult.data.displayName);
            }
          } catch (error) {
            // Silently fail for individual users
          }
        }

        setUserNames(newUserNames);
      }

      setHasLoadedOnce(true);
    } catch (error) {
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

    // Fetch the chat from Firebase to compare
    const { getChatFromFirebase } = await import('@/services/firebase-chat.service');
    const firebaseChat = await getChatFromFirebase(chat.id);

    if (firebaseChat.success && firebaseChat.data) {
      const firebaseParticipantIds = Array.isArray(firebaseChat.data.participantIds)
        ? firebaseChat.data.participantIds
        : Object.keys(firebaseChat.data.participantIds || {});
      const chatParticipantIds = Array.isArray(chat.participantIds)
        ? chat.participantIds
        : Object.keys(chat.participantIds || {});
      // If Firebase has more participants than local, use Firebase data
      if (firebaseParticipantIds.length > chatParticipantIds.length) {
        chat = firebaseChat.data;
      }
    }

    // For 1:1 chats, get the other user's info
    if (chat.type === '1:1') {
      const participantIds = Array.isArray(chat.participantIds)
        ? chat.participantIds
        : Object.keys(chat.participantIds || {});
      const otherUserId = participantIds.find(id => id !== user.uid);

      if (!otherUserId) {
        // If we have exactly one participant and it's not us, that's the other user
        if (participantIds.length === 1 && participantIds[0] !== user.uid) {
          const fallbackOtherUserId = participantIds[0];

          navigation.navigate('Conversation', {
            chatId: chat.id,
            otherUserId: fallbackOtherUserId,
            otherUserName: chat.name || 'Unknown User',
            otherUserEmail: 'unknown',
          });
          return;
        }

        return;
      }

      const userResult = await getUserFromFirebase(otherUserId);

      if (!userResult.success || !userResult.data) {
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

      navigation.navigate('Conversation', {
        chatId: chat.id,
        otherUserId: otherUser.uid,
        otherUserName: otherUser.displayName,
        otherUserEmail: otherUser.email,
      });
    } else {
      // For group chats
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

    // Get the display name for this chat
    const chatDisplayName = user ? getChatDisplayName(chat, user.uid, userNames) : 'Chat';

    // Create preview with sender name for group chats
    let preview: string;
    if (lastMessage) {
      const isOwnMessage = lastMessage.senderId === user?.uid;
      const senderName = isOwnMessage ? 'You' : (userNames.get(lastMessage.senderId) || 'Unknown');

      // Format based on message type and chat type
      if (lastMessage.type === 'image') {
        const photoText = lastMessage.caption
          ? `📷 ${lastMessage.caption.substring(0, 30)}${lastMessage.caption.length > 30 ? '...' : ''}`
          : '📷 Photo';

        preview = chat.type === 'group'
          ? `${senderName}: ${photoText}`
          : isOwnMessage
            ? `You: ${photoText}`
            : photoText;
      } else {
        const contentPreview = lastMessage.content.length > 40
          ? lastMessage.content.substring(0, 40) + '...'
          : lastMessage.content;

        preview = chat.type === 'group'
          ? `${senderName}: ${contentPreview}`
          : contentPreview;
      }
    } else {
      preview = 'No messages yet';
    }

    const timestamp = lastMessage?.timestamp ?? chat.createdAt;
    const relativeTime = getRelativeTime(timestamp);

    // For 1:1 chats, show online status of the other participant
    const isOneOnOne = chat.type === '1:1';
    const participantIds = Array.isArray(chat.participantIds)
      ? chat.participantIds
      : Object.keys(chat.participantIds || {});
    const otherParticipantId = isOneOnOne
      ? participantIds.find(id => id !== user?.uid)
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
              {chatDisplayName}
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
                {(Array.isArray(chat.participantIds)
                  ? chat.participantIds.length
                  : Object.keys(chat.participantIds || {}).length) || 0} members
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

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
