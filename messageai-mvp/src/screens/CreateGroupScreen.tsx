/**
 * Create Group Screen
 * Allows users to create a new group chat with selected participants
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainStackParamList } from '@/navigation/AppNavigator';
import { createChatInFirebase } from '@/services/firebase-chat.service';
import { generateGroupName, validateGroupCreation } from '@/utils/group.utils';
import Avatar from '@/components/Avatar';

type CreateGroupScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'CreateGroup'>;
type CreateGroupScreenRouteProp = RouteProp<MainStackParamList, 'CreateGroup'>;

interface Participant {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const route = useRoute<CreateGroupScreenRouteProp>();

  // Initialize participants from navigation params
  React.useEffect(() => {
    if (route.params?.participants) {
      setParticipants(route.params.participants);
      // Auto-generate group name if not set
      if (!groupName) {
        setGroupName(generateGroupName(route.params.participants));
      }
    }
  }, [route.params?.participants, groupName]);

  // Handle removing a participant
  const handleRemoveParticipant = useCallback((participantId: string) => {
    if (!user || participantId === user.uid) return; // Can't remove self

    Alert.alert(
      'Remove Participant',
      `Remove ${participants.find(p => p.uid === participantId)?.displayName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setParticipants(prev => prev.filter(p => p.uid !== participantId));
          }
        }
      ]
    );
  }, [participants, user]);

  // Handle creating the group
  const handleCreateGroup = useCallback(async () => {
    if (!user || participants.length === 0) return;

    // Validate group creation
    const validation = validateGroupCreation(
      participants.map(p => ({
        uid: p.uid,
        email: p.email,
        displayName: p.displayName,
        createdAt: 0,
        lastSeen: p.lastSeen || 0,
        isOnline: p.isOnline || false
      })),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: 0,
        lastSeen: 0,
        isOnline: true
      }
    );

    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }

    try {
      setLoading(true);
      console.log('🏗️ CreateGroupScreen: Creating group with participants:', participants.length);

      // Create group chat in Firebase
      const participantIds = participants.map(p => p.uid);
      const finalGroupName = groupName.trim() || generateGroupName(participants);

      const chatData = {
        type: 'group' as const,
        participantIds,
        name: finalGroupName,
        createdAt: Date.now()
      };

      const result = await createChatInFirebase(chatData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create group');
      }

      const chatId = result.data!;
      console.log('✅ CreateGroupScreen: Group created successfully:', chatId);

      // Navigate to conversation
      navigation.navigate('Conversation', {
        chatId,
        isGroup: true,
        groupName: finalGroupName
      });

    } catch (error) {
      console.error('❌ CreateGroupScreen: Error creating group:', error);
      Alert.alert(
        'Error',
        'Failed to create group. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [user, participants, groupName, navigation]);

  // Render participant item
  const renderParticipant = ({ item }: { item: Participant }) => {
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
        {!isCurrentUser && (
          <Chip
            mode="outlined"
            onPress={() => handleRemoveParticipant(item.uid)}
            style={styles.removeChip}
          >
            Remove
          </Chip>
        )}
      </View>
    );
  };

  // Set initial group name only once when participants are loaded (if user hasn't edited)
  React.useEffect(() => {
    if (participants.length > 0 && !groupName && !userHasEdited) {
      setGroupName(suggestedName);
    }
  }, [participants.length, suggestedName, userHasEdited]);

  const canCreateGroup = participants.length >= 3 && !loading; // Need current user + at least 2 others
  const suggestedName = participants.length > 0 ? generateGroupName(participants) : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Create Group
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Add a name for your group chat (optional)
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Group Name"
          value={groupName}
          onChangeText={(text) => {
            setGroupName(text);
            setUserHasEdited(true);
          }}
          placeholder={suggestedName || "Enter group name (optional)"}
          maxLength={50}
          style={styles.nameInput}
        />

        <Text variant="bodySmall" style={styles.participantCount}>
          {participants.length} participants
        </Text>

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

        <Button
          mode="contained"
          onPress={handleCreateGroup}
          loading={loading}
          disabled={!canCreateGroup}
          style={[styles.createButton, { marginBottom: insets.bottom }]}
        >
          {loading ? 'Creating Group...' : 'Create Group'}
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
  header: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  nameInput: {
    marginBottom: 16,
  },
  participantCount: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  participantsSection: {
    flex: 1,
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
  removeChip: {
    backgroundColor: 'transparent',
  },
  createButton: {
    marginTop: 16,
    marginBottom: 0, // Set dynamically with safe area insets
  },
});

