/**
 * Edit Profile Screen
 * Allows users to update their profile picture and display name
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { uploadProfilePicture, removeProfilePicture, updateUserInFirebase } from '@/services/firebase-user.service';
import { updateUser } from '@/services/local-user.service';
import { clearAllData } from '@/services/database.service';
import Avatar from '@/components/Avatar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

export default function EditProfileScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);

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

  /**
   * Handle theme mode change
   */
  const handleThemeChange = async (mode: 'light' | 'dark' | 'auto') => {
    if (!user) return;

    try {
      setSaving(true);
      setThemeMode(mode);
      setThemeMenuVisible(false);

      // Save to Firebase and local database
      await updateUserInFirebase(user.uid, { themeMode: mode });
      await updateUser(user.uid, { themeMode: mode });
      await refreshUser();
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      Alert.alert('Error', 'Failed to save theme preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Get theme mode display name
   */
  const getThemeModeName = (mode: string): string => {
    switch (mode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'auto': return 'Auto (System)';
      default: return mode;
    }
  };

  /**
   * Handle logout with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? This will clear all local data from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);

              // Clear all local data
              await clearAllData();

              // Sign out from Firebase
              await signOut();

              // Navigation to login screen is handled by AuthContext
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentPhotoUrl = selectedImageUri || user.profilePictureUrl;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>
        Edit Profile
      </Text>

      {/* Profile Picture Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Profile Picture
        </Text>

        <View style={styles.avatarContainer}>
          {currentPhotoUrl ? (
            <Image
              source={{ uri: currentPhotoUrl }}
              style={[styles.previewImage, { backgroundColor: colors.surface }]}
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
            textColor={colors.primary}
          >
            {selectedImageUri ? 'Change Photo' : 'Upload Photo'}
          </Button>

          {user.profilePictureUrl && !selectedImageUri && (
            <Button
              mode="text"
              onPress={handleRemovePhoto}
              disabled={uploading || saving}
              textColor={colors.error}
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
                buttonColor={colors.primary}
                textColor="#FFFFFF"
              >
                {uploading ? 'Uploading...' : 'Save Photo'}
              </Button>
              <Button
                mode="text"
                onPress={() => setSelectedImageUri(null)}
                disabled={uploading || saving}
                style={styles.button}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
            </>
          )}
        </View>

        {uploading && uploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <Text variant="bodySmall" style={[styles.progressText, { color: colors.textSecondary }]}>
              Uploading: {Math.round(uploadProgress * 100)}%
            </Text>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {/* Display Name Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Display Name
        </Text>

        <TextInput
          mode="outlined"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          placeholderTextColor={colors.textSecondary}
          disabled={uploading || saving}
          style={[styles.input, { backgroundColor: colors.surface }]}
          maxLength={50}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />

        <Button
          mode="contained"
          onPress={handleSaveDisplayName}
          disabled={uploading || saving || displayName.trim() === user.displayName}
          style={styles.button}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
        >
          {saving ? 'Saving...' : 'Save Display Name'}
        </Button>
      </View>

      {/* Account Info Section (Read-only) */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Account Information
        </Text>

        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Email:
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.text }}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={[styles.infoLabel, { color: colors.textSecondary }]}>
            User ID:
          </Text>
          <Text variant="bodySmall" style={[styles.infoValue, { color: colors.textSecondary }]}>
            {user.uid}
          </Text>
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>

        <Text variant="bodySmall" style={[styles.infoLabel, { color: colors.textSecondary }]}>
          Theme
        </Text>

        <Menu
          visible={themeMenuVisible}
          onDismiss={() => setThemeMenuVisible(false)}
          anchor={
            <Pressable
              onPress={() => setThemeMenuVisible(true)}
              disabled={uploading || saving}
              style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View>
                <Text variant="bodyLarge" style={{ color: colors.text }}>{getThemeModeName(themeMode)}</Text>
                <Text variant="bodySmall" style={[styles.themeSubtext, { color: colors.textSecondary }]}>
                  {isDark ? 'Dark mode is active' : 'Light mode is active'}
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.chevron, { color: colors.textSecondary }]}>▼</Text>
            </Pressable>
          }
        >
          <Menu.Item
            onPress={() => handleThemeChange('light')}
            title="Light"
            titleStyle={themeMode === 'light' ? styles.selectedTheme : undefined}
          />
          <Menu.Item
            onPress={() => handleThemeChange('dark')}
            title="Dark"
            titleStyle={themeMode === 'dark' ? styles.selectedTheme : undefined}
          />
          <Menu.Item
            onPress={() => handleThemeChange('auto')}
            title="Auto (System)"
            titleStyle={themeMode === 'auto' ? styles.selectedTheme : undefined}
          />
        </Menu>

        <Text variant="bodySmall" style={[styles.themeDescription, { color: colors.textSecondary }]}>
          Choose how MessageAI appears. Auto mode follows your device's system settings.
        </Text>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          disabled={uploading || saving || loggingOut}
          textColor={colors.error}
          style={[styles.button, { borderColor: colors.error, borderWidth: 1 }]}
        >
          {loggingOut ? 'Logging Out...' : 'Log Out'}
        </Button>
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
  logoutButton: {
    borderColor: '#d32f2f',
    borderWidth: 1,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  themeSubtext: {
    color: '#666',
    marginTop: 4,
  },
  chevron: {
    color: '#666',
    marginLeft: 8,
  },
  themeDescription: {
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  selectedTheme: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
});
