/**
 * New Chat Screen
 * Allows users to search and select other users to start conversations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, ActivityIndicator, Button, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import UserListItem from '@/components/UserListItem';
import { getAllUsersFromFirebase, searchUsers } from '@/services/firebase-user.service';
import { getUserPresence } from '@/services/presence.service';
import { findOneOnOneChat } from '@/services/firebase-chat.service';
import { getAllChats } from '@/services/local-chat.service';
import { MainStackParamList } from '@/navigation/AppNavigator';

type NewChatScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'NewChat'>;

export default function NewChatScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [chatParticipants, setChatParticipants] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingChat, setCreatingChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingEmail, setIsSearchingEmail] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<NewChatScreenNavigationProp>();

  // Load all users and chat participants from Firebase
  const loadUsers = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load users from Firebase
      const usersResult = await getAllUsersFromFirebase();
      if (!usersResult.success) {
        return;
      }

      // Filter out current user from the list
      const firebaseUsers = (usersResult.data || []).filter(u => u.uid !== user.uid);

      // Load existing chats to get participants (filter by current user for security)
      const chatsResult = await getAllChats(user.uid);
      const chats = chatsResult.success ? (chatsResult.data || []) : [];

      // Extract unique participants from chats (excluding current user)
      const participantMap = new Map<string, any>();
      chats.forEach(chat => {
        if (chat.participantIds) {
          Object.keys(chat.participantIds).forEach(participantId => {
            if (participantId !== user.uid && !participantMap.has(participantId)) {
              // Create a basic user object for chat participants
              // We'll need to fetch their full details from Firebase users
              const firebaseUser = firebaseUsers.find(u => u.uid === participantId);
              if (firebaseUser) {
                participantMap.set(participantId, firebaseUser);
              }
            }
          });
        }
      });

      const chatParticipants = Array.from(participantMap.values());

      // Combine Firebase users and chat participants (remove duplicates)
      const allUsersMap = new Map<string, User>();


      // Add all Firebase users first
      firebaseUsers.forEach(u => {
        if (u.uid !== user.uid) {
          allUsersMap.set(u.uid, u);
        } else {
        }
      });

      // Add chat participants (they might already be in the map)
      chatParticipants.forEach(p => {
        if (p.uid !== user.uid) {
          allUsersMap.set(p.uid, p);
        }
      });

      const combinedUsers = Array.from(allUsersMap.values());

      // Enhance all users with real-time presence data
      const usersWithPresence = await Promise.all(
        combinedUsers.map(async (userData) => {
          try {
            const presence = await getUserPresence(userData.uid);
            return {
              ...userData,
              isOnline: presence.isOnline,
              lastSeen: presence.lastSeen,
            };
          } catch (error) {
            // Return user with default offline status if presence fetch fails
            return {
              ...userData,
              isOnline: false,
              lastSeen: Date.now(),
            };
          }
        })
      );

      
      // Store all Firebase users for searching
      setUsers(firebaseUsers.filter(u => u.uid !== user.uid));
      
      // Store chat participants with presence
      const chatParticipantsWithPresence = usersWithPresence.filter(u =>
        chatParticipants.some(p => p.uid === u.uid)
      );
      setChatParticipants(chatParticipantsWithPresence);
      
      // Store all users for searching
      setAllUsers(usersWithPresence);
      
      // Initially show only chat participants (empty if no chats)
      setFilteredUsers(chatParticipantsWithPresence);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh users (for pull-to-refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Enhanced search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      // When no search query, show only chat participants (users we already have chats with)
      setFilteredUsers(chatParticipants);
      setIsSearchingEmail(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    // Search through chat participants first (by display name and email)
    const filteredParticipants = chatParticipants.filter(u =>
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );

    // If this looks like an email search (contains @), enable email search mode
    if (query.includes('@')) {
      setIsSearchingEmail(true);
      // For email searches, show filtered participants
      // (exact Firebase search happens on Enter key)
      setFilteredUsers(filteredParticipants);
    } else {
      setIsSearchingEmail(false);
      setFilteredUsers(filteredParticipants);
    }
  }, [searchQuery, chatParticipants]);

  // Toggle multi-select mode
  const toggleMultiSelect = useCallback(() => {
    if (isMultiSelectMode) {
      // Canceling - just exit multi-select mode
      setIsMultiSelectMode(false);
      setSelectedUsers([]);
    } else {
      // Starting group creation - go directly to group creation screen
      setIsMultiSelectMode(true);
      // Note: Users will select participants in this mode, then press Create Group
    }
  }, [isMultiSelectMode]);

  // Handle user selection (single or multi-select)
  const handleUserSelect = useCallback(async (selectedUser: User) => {
    if (!user || creatingChat) return;

    // Prevent chatting with yourself
    if (selectedUser.uid === user.uid) {
      return;
    }

    if (isMultiSelectMode) {
      // Multi-select mode - toggle selection
      setSelectedUsers(prev => {
        const isSelected = prev.some(u => u.uid === selectedUser.uid);
        if (isSelected) {
          return prev.filter(u => u.uid !== selectedUser.uid);
        } else {
          return [...prev, selectedUser];
        }
      });
    } else {
      // Single-select mode - open 1:1 chat
      try {
        setCreatingChat(selectedUser.uid);

        // Check if a chat already exists (but don't create it yet)
        const chatResult = await findOneOnOneChat(user.uid, selectedUser.uid);

        if (!chatResult.success) {
          // Still navigate to conversation - chat will be created on first message
        }

        const existingChatId = chatResult.success && chatResult.data ? chatResult.data : undefined;

        if (existingChatId) {
        } else {
        }

        // Navigate to conversation screen
        // Chat will be created when first message is sent (if it doesn't exist)
        navigation.navigate('Conversation', {
          chatId: existingChatId,
          otherUserId: selectedUser.uid,
          otherUserName: selectedUser.displayName,
          otherUserEmail: selectedUser.email,
        });

      } catch (error) {
      } finally {
        setCreatingChat(null);
      }
    }
  }, [user, navigation, creatingChat, isMultiSelectMode]);

  // Handle creating group with selected users
  const handleCreateGroup = useCallback(() => {
    if (selectedUsers.length < 2) return;


    // Include current user as the first participant (they're creating the group)
    const allParticipants = [
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isOnline: true,
        lastSeen: Date.now(),
      },
      ...selectedUsers.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      }))
    ];

    navigation.navigate('CreateGroup', {
      participants: allParticipants
    });

    // Reset multi-select mode
    setIsMultiSelectMode(false);
    setSelectedUsers([]);
  }, [selectedUsers, navigation, user]);

  // Render user item
  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(u => u.uid === item.uid);
    const isCurrentUser = item.uid === user?.uid;

    if (isMultiSelectMode) {
      return (
        <View style={styles.multiSelectItem}>
          <Checkbox
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => !isCurrentUser && handleUserSelect(item)}
            disabled={isCurrentUser}
          />
          <UserListItem
            user={item}
            onPress={() => !isCurrentUser && handleUserSelect(item)}
            showOnlineStatus={true}
            style={styles.multiSelectUserItem}
            loading={creatingChat === item.uid}
          />
          {isCurrentUser && (
            <Text variant="bodySmall" style={styles.cannotSelectText}>
              Cannot select yourself
            </Text>
          )}
        </View>
      );
    }

    return (
      <UserListItem
        user={item}
        onPress={handleUserSelect}
        showOnlineStatus={true}
        style={styles.userItem}
        loading={creatingChat === item.uid}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text variant="headlineSmall" style={styles.title}>
            Start New Chat
          </Text>
          <Button
            mode={isMultiSelectMode ? "contained" : "outlined"}
            onPress={toggleMultiSelect}
            style={styles.modeToggle}
            compact
          >
            {isMultiSelectMode ? "Cancel Group" : "Create Group"}
          </Button>
        </View>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isMultiSelectMode
            ? `Select ${selectedUsers.length} users to create a group chat${selectedUsers.length >= 2 ? ' - then tap "Create Group" below' : ''}`
            : "Search existing chats by name/email, or tap 'Create Group' to start a group chat"
          }
        </Text>
      </View>

      {isMultiSelectMode && (
        <View style={[
          styles.createGroupBar,
          selectedUsers.length >= 2 && styles.createGroupBarReady
        ]}>
          <Text variant="bodyMedium" style={[
            styles.selectedCount,
            selectedUsers.length >= 2 && styles.selectedCountReady
          ]}>
            {selectedUsers.length >= 2
              ? `✅ ${selectedUsers.length} selected - ready to create!`
              : `${selectedUsers.length} selected - select ${2 - selectedUsers.length} more`
            }
          </Text>
          <Button
            mode="contained"
            onPress={handleCreateGroup}
            disabled={selectedUsers.length < 2}
            style={[
              styles.createButton,
              selectedUsers.length < 2 && styles.disabledButton
            ]}
          >
            {selectedUsers.length >= 2 ? 'Create Group' : 'Select Users'}
          </Button>
        </View>
      )}

      <Searchbar
        placeholder={
          isSearchingEmail
            ? "Email search mode - press Enter to search"
            : "Search users by name or email..."
        }
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[
          styles.searchBar,
          isSearchingEmail && styles.emailSearchMode
        ]}
        onSubmitEditing={async () => {
          if (searchQuery.trim() && searchQuery.includes('@')) {

            try {
              // Perform exact email search
              const emailResult = await searchUsers(searchQuery.trim());


              if (emailResult.success && emailResult.data && emailResult.data.length > 0) {
                const foundUser = emailResult.data[0];

                // Check if user is already in allUsers
                const existingUser = allUsers.find(u => u.uid === foundUser.uid);

                if (existingUser) {
                  
                  // User exists in allUsers, just add to filteredUsers if not already there
                  setFilteredUsers(prev => {
                    const alreadyInFiltered = prev.some(u => u.uid === existingUser.uid);
                    if (alreadyInFiltered) {
                      return prev;
                    }
                    return [existingUser, ...prev];
                  });
                } else {

                  // Add this user to our results (they'll appear at the top)
                  const enhancedUser = {
                    ...foundUser,
                    isOnline: false, // Default until we fetch presence
                    lastSeen: Date.now(),
                  };

                  // Fetch presence for the newly found user
                  try {
                    const presence = await getUserPresence(foundUser.uid);
                    enhancedUser.isOnline = presence.isOnline;
                    enhancedUser.lastSeen = presence.lastSeen;
                  } catch (error) {
                  }

                  setAllUsers(prev => [enhancedUser, ...prev]);
                  setFilteredUsers(prev => [enhancedUser, ...prev]);
                }
              } else {
              }
            } catch (error) {
            }
          }
        }}
      />

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {searchQuery 
                ? 'No users found. Try typing an email and pressing Enter.' 
                : 'No existing chats. Search for a user by email to start a new chat.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 0, // Set dynamically with safe area insets
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
  header: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    color: '#666',
  },
  modeToggle: {
    marginLeft: 16,
  },
  createGroupBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#2196F3',
  },
  createGroupBarReady: {
    backgroundColor: '#4CAF50',
    borderBottomColor: '#4CAF50',
  },
  selectedCount: {
    flex: 1,
    color: '#1976D2',
  },
  selectedCountReady: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  cannotSelectText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  searchBar: {
    margin: 16,
  },
  emailSearchMode: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  listContainer: {
    flexGrow: 1,
  },
  userItem: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  multiSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  multiSelectUserItem: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

