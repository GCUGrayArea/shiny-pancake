/**
 * Edit Profile Screen
 * Allows users to update their profile picture and display name
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProfilePicture, removeProfilePicture, updateUserInFirebase } from '@/services/firebase-user.service';
import { updateUser } from '@/services/local-user.service';
import Avatar from '@/components/Avatar';
import { useNavigation } from '@react-navigation/native';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  /**
   * Request permission and pick image from library
   */
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to upload a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  /**
   * Upload the selected profile picture
   */
  const handleUploadPhoto = async () => {
    if (!user || !selectedImageUri) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Upload to Firebase Storage and update profile
      const result = await uploadProfilePicture(
        user.uid,
        selectedImageUri,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        // Update local database
        await updateUser(user.uid, {
          profilePictureUrl: result.data,
        });

        // Refresh user context
        await refreshUser();

        // Clear selected image
        setSelectedImageUri(null);

        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Remove the current profile picture
   */
  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              setUploading(true);

              const result = await removeProfilePicture(user.uid);

              if (result.success) {
                // Update local database
                await updateUser(user.uid, {
                  profilePictureUrl: undefined,
                });

                // Refresh user context
                await refreshUser();

                Alert.alert('Success', 'Profile picture removed successfully!');
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Save display name changes
   */
  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) {
      Alert.alert('Error', 'Please enter a valid display name.');
      return;
    }

    if (displayName.trim() === user.displayName) {
      // No changes
      return;
    }

    try {
      setSaving(true);

      // Update Firebase
      await updateUserInFirebase(user.uid, {
        displayName: displayName.trim(),
      });

      // Update local database
      await updateUser(user.uid, {
        displayName: displayName.trim(),
      });

      // Refresh user context
      await refreshUser();

      Alert.alert('Success', 'Display name updated successfully!');
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Error', 'Failed to update display name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const currentPhotoUrl = selectedImageUri || user.profilePictureUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Edit Profile
      </Text>

      {/* Profile Picture Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Profile Picture
        </Text>

        <View style={styles.avatarContainer}>
          {currentPhotoUrl ? (
            <Image
              source={{ uri: currentPhotoUrl }}
              style={styles.previewImage}
            />
          ) : (
            <Avatar
              displayName={user.displayName}
              userId={user.uid}
              size="xlarge"
            />
          )}
        </View>

        <View style={styles.buttonGroup}>
          <Button
            mode="outlined"
            onPress={pickImage}
            disabled={uploading || saving}
            style={styles.button}
          >
            {selectedImageUri ? 'Change Photo' : 'Upload Photo'}
          </Button>

          {user.profilePictureUrl && !selectedImageUri && (
            <Button
              mode="text"
              onPress={handleRemovePhoto}
              disabled={uploading || saving}
              textColor="#d32f2f"
              style={styles.button}
            >
              Remove Photo
            </Button>
          )}

          {selectedImageUri && (
            <>
              <Button
                mode="contained"
                onPress={handleUploadPhoto}
                disabled={uploading || saving}
                style={styles.button}
              >
                {uploading ? 'Uploading...' : 'Save Photo'}
              </Button>
              <Button
                mode="text"
                onPress={() => setSelectedImageUri(null)}
                disabled={uploading || saving}
                style={styles.button}
              >
                Cancel
              </Button>
            </>
          )}
        </View>

        {uploading && uploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <Text variant="bodySmall" style={styles.progressText}>
              Uploading: {Math.round(uploadProgress * 100)}%
            </Text>
            <ActivityIndicator size="small" />
          </View>
        )}
      </View>

      {/* Display Name Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Display Name
        </Text>

        <TextInput
          mode="outlined"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          disabled={uploading || saving}
          style={styles.input}
          maxLength={50}
        />

        <Button
          mode="contained"
          onPress={handleSaveDisplayName}
          disabled={uploading || saving || displayName.trim() === user.displayName}
          style={styles.button}
        >
          {saving ? 'Saving...' : 'Save Display Name'}
        </Button>
      </View>

      {/* Account Info Section (Read-only) */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account Information
        </Text>

        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={styles.infoLabel}>
            Email:
          </Text>
          <Text variant="bodyMedium">{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={styles.infoLabel}>
            User ID:
          </Text>
          <Text variant="bodySmall" style={styles.infoValue}>
            {user.uid}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
  },
  buttonGroup: {
    gap: 8,
  },
  button: {
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressText: {
    color: '#666666',
  },
  input: {
    marginBottom: 8,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    color: '#999999',
  },
});
