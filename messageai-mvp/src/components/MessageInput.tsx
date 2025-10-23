/**
 * Message Input Component
 * Handles text input and image selection for sending messages
 * Supports both text and image messages with upload progress
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { TextInput, IconButton, Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Message, MessageType } from '@/types';
import { IMAGE_CONSTANTS, MESSAGE_CONSTANTS, ERROR_CODES } from '@/constants';
import { compressImage, uploadImage, validateImage } from '@/services/image.service';

interface MessageInputProps {
  onSendMessage: (content: string, type: MessageType, imageUri?: string) => Promise<void>;
  chatId?: string; // For image uploads
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  onSendMessage,
  chatId,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Request permissions for image picker
  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permissions are needed to select images.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  // Handle image selection
  const handleImagePick = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return;
      }


      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Set to false to avoid editing issues
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate image
        const isValid = await validateImage(asset);
        if (!isValid) {
          Alert.alert(
            'Invalid Image',
            `Image must be ${IMAGE_CONSTANTS.SUPPORTED_FORMATS.join(' or ')} and under ${IMAGE_CONSTANTS.MAX_SIZE / 1024 / 1024}MB.`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Compress image
        const compressed = await compressImage(asset.uri);

        // Generate preview thumbnail
        const { generateThumbnail } = await import('@/services/image.service');
        const previewUri = await generateThumbnail(compressed.uri, 150);

        setSelectedImage(compressed.uri);
        setImagePreview(previewUri);

      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to select image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle sending message (text or image) - now uses queue system for non-blocking UI
  const handleSend = async () => {
    if (disabled || sending) return;

    // Must have either text or image
    if (!messageText.trim() && !selectedImage) return;

    try {
      setSending(true);

      if (selectedImage) {
        // Send image message - enqueue for background processing

        // Create message with local image URI (upload will happen in background)
        await onSendMessage(selectedImage, 'image');

        // Clear image state immediately (upload happens in background)
        setSelectedImage(null);
        setImagePreview(null);

      } else {
        // Send text message immediately
        await onSendMessage(messageText.trim(), 'text');
      }

      // Clear text input
      setMessageText('');


    } catch (error) {
      Alert.alert(
        'Send Failed',
        'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSending(false);
    }
  };

  // Handle clearing selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Check if send button should be enabled
  const canSend = (messageText.trim() || selectedImage) && !sending && !disabled;

  return (
    <View style={styles.container}>
      {/* Image preview */}
      {imagePreview && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.clearImageButton}
            onPress={handleClearImage}
          >
            <IconButton icon="close" size={16} iconColor="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input container */}
      <View style={styles.inputContainer}>
        {/* Image picker button */}
        <IconButton
          icon="image"
          size={24}
          onPress={() => {
            handleImagePick();
          }}
          disabled={disabled || sending}
          style={styles.imageButton}
        />

        {/* Text input */}
        <TextInput
          style={styles.input}
          mode="outlined"
          placeholder={placeholder}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={MESSAGE_CONSTANTS.MAX_LENGTH}
          disabled={disabled || sending}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          numberOfLines={5}
        />

        {/* Send button */}
        <IconButton
          icon="send"
          size={24}
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled
          ]}
        />
      </View>

      {/* Character count */}
      {messageText.length > MESSAGE_CONSTANTS.MAX_LENGTH * 0.8 && (
        <Text style={[
          styles.characterCount,
          messageText.length >= MESSAGE_CONSTANTS.MAX_LENGTH && styles.characterCountWarning
        ]}>
          {messageText.length}/{MESSAGE_CONSTANTS.MAX_LENGTH}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  imagePreviewContainer: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#F5F5F5',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  clearImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  imageButton: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  characterCountWarning: {
    color: '#FF6B6B',
  },
});

