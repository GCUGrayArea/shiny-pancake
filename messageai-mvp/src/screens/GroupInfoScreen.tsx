/**
 * Group Info Screen
 * Shows group details, participants, and allows leaving the group
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { getChatFromFirebase } from '@/services/firebase-chat.service';
import { getUserFromFirebase, getAllUsersFromFirebase } from '@/services/firebase-user.service';
import { getUserPresence } from '@/services/presence.service';
import { generateGroupInitials } from '@/utils/group.utils';
import Avatar from '@/components/Avatar';
import { Chat, User } from '@/types';

type GroupInfoScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'GroupInfo'>;
type GroupInfoScreenRouteProp = RouteProp<MainStackParamList, 'GroupInfo'>;

interface ParticipantWithPresence extends User {
  isOnline: boolean;
  lastSeen: number;
}

export default function GroupInfoScreen() {
  const [chat, setChat] = useState<Chat | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<GroupInfoScreenNavigationProp>();
  const route = useRoute<GroupInfoScreenRouteProp>();

  const { chatId, chatName } = route.params;

  // Load group info and participants
  const loadGroupInfo = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      console.log('📋 GroupInfoScreen: Loading group info for chat:', chatId);

      // Load chat data from Firebase
      const chatResult = await getChatFromFirebase(chatId);
      if (!chatResult.success) {
        console.error('❌ GroupInfoScreen: Failed to load chat:', chatResult.error);
        Alert.alert('Error', 'Failed to load group information');
        return;
      }

      const chatData = chatResult.data!;
      setChat(chatData);

      // Load participants
      if (chatData.participantIds) {
        const participantIds = Object.keys(chatData.participantIds);
        console.log('👥 GroupInfoScreen: Loading participants:', participantIds.length);

        // Get all users first
        const usersResult = await getAllUsersFromFirebase();
        if (!usersResult.success) {
          console.error('❌ GroupInfoScreen: Failed to load users:', usersResult.error);
          return;
        }

        const allUsers = usersResult.data || [];

        // Filter to only group participants and enhance with presence
        const groupParticipants = await Promise.all(
          participantIds.map(async (participantId) => {
            const firebaseUser = allUsers.find(u => u.uid === participantId);
            if (!firebaseUser) {
              console.warn('⚠️ GroupInfoScreen: Participant not found:', participantId);
              return null;
            }

            try {
              const presence = await getUserPresence(participantId);
              return {
                ...firebaseUser,
                isOnline: presence.isOnline,
                lastSeen: presence.lastSeen,
              };
            } catch (error) {
              console.error(`Failed to get presence for ${participantId}:`, error);
              return {
                ...firebaseUser,
                isOnline: false,
                lastSeen: Date.now(),
              };
            }
          })
        );

        const validParticipants = groupParticipants.filter(p => p !== null) as ParticipantWithPresence[];
        setParticipants(validParticipants);
        console.log('✅ GroupInfoScreen: Loaded participants:', validParticipants.length);
      }
    } catch (error) {
      console.error('❌ GroupInfoScreen: Error loading group info:', error);
      Alert.alert('Error', 'Failed to load group information');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadGroupInfo();
  }, [loadGroupInfo]);

  // Handle leaving the group
  const handleLeaveGroup = useCallback(async () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${chatName}"? You won't receive messages from this group anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true);
              console.log('🚪 GroupInfoScreen: Leaving group:', chatId);

              // TODO: Implement leave group functionality
              // This would involve removing the user from chat.participantIds
              // and updating the chat in Firebase

              Alert.alert(
                'Group Left',
                `You have left "${chatName}". You can rejoin by being added back by another participant.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );

            } catch (error) {
              console.error('❌ GroupInfoScreen: Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            } finally {
              setLeaving(false);
            }
          }
        }
      ]
    );
  }, [chatId, chatName, navigation]);

  // Render participant item
  const renderParticipant = ({ item }: { item: ParticipantWithPresence }) => {
    const isCurrentUser = item.uid === user?.uid;

    return (
      <View style={styles.participantItem}>
        <Avatar
          userId={item.uid}
          displayName={item.displayName}
          size="medium"
          showOnlineStatus={true}
        />
        <View style={styles.participantInfo}>
          <Text variant="bodyLarge" style={styles.participantName}>
            {item.displayName}
            {isCurrentUser && ' (You)'}
          </Text>
          <Text variant="bodySmall" style={styles.participantEmail}>
            {item.email}
          </Text>
        </View>
        {isCurrentUser && (
          <Chip mode="outlined" style={styles.currentUserChip}>
            You
          </Chip>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Loading group information...</Text>
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Group Not Found
        </Text>
        <Text variant="bodyMedium" style={styles.errorText}>
          This group chat may have been deleted or you no longer have access to it.
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const groupInitials = generateGroupInitials(participants);
  const onlineCount = participants.filter(p => p.isOnline).length;

  return (
    <View style={styles.container}>
      <View style={styles.groupHeader}>
        <Avatar
          userId={chatId}
          displayName={chatName}
          size="large"
          showOnlineStatus={false}
        />
        <View style={styles.groupInfo}>
          <Text variant="headlineSmall" style={styles.groupName}>
            {chatName}
          </Text>
          <Text variant="bodyMedium" style={styles.groupSubtitle}>
            {participants.length} participants • {onlineCount} online
          </Text>
        </View>
      </View>

      <View style={styles.participantsSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Participants
        </Text>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.participantsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={[styles.actionsSection, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          mode="outlined"
          onPress={handleLeaveGroup}
          loading={leaving}
          disabled={leaving}
          style={styles.leaveButton}
        >
          {leaving ? 'Leaving Group...' : 'Leave Group'}
        </Button>
      </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    gap: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    marginBottom: 4,
  },
  groupSubtitle: {
    color: '#666',
  },
  participantsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    gap: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontWeight: '500',
  },
  participantEmail: {
    color: '#666',
  },
  currentUserChip: {
    backgroundColor: 'transparent',
  },
  actionsSection: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 0, // Set dynamically with safe area insets
  },
  leaveButton: {
    borderColor: '#F44336',
  },
});

