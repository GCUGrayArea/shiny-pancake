/**
 * Message Input Component
 * Handles text input and image selection for sending messages
 * Supports both text and image messages with upload progress
 * Includes typing indicator integration and formality adjustment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { TextInput, IconButton, Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Message, MessageType } from '@/types';
import { IMAGE_CONSTANTS, MESSAGE_CONSTANTS, ERROR_CODES } from '@/constants';
import { compressImage, uploadImage, validateImage } from '@/services/image.service';
import { setTyping, clearTyping } from '@/services/typing.service';
import {
  detectFormality,
  adjustFormality,
  type FormalityLevel,
  type FormalityDetectionResult,
  type FormalityAdjustmentResult,
} from '@/services/ai/agents/formality-agent';
import type { LanguageCode } from '@/services/ai/types';
import FormalityIndicator from './FormalityIndicator';
import FormalityPreviewModal from './FormalityPreviewModal';

interface MessageInputProps {
  onSendMessage: (content: string, type: MessageType, imageUri?: string, caption?: string) => Promise<void>;
  chatId?: string; // For image uploads and typing indicators
  currentUserId?: string; // For typing indicators
  disabled?: boolean;
  placeholder?: string;
  /** Enable formality detection and adjustment (default: true) */
  enableFormality?: boolean;
  /** Language for formality detection (default: 'en') */
  language?: LanguageCode;
}

const CAPTION_MAX_LENGTH = 500;
const TYPING_DEBOUNCE_MS = 300;
const AUTO_CLEAR_TYPING_MS = 5000;
const FORMALITY_DEBOUNCE_MS = 500; // Debounce formality detection

export default function MessageInput({
  onSendMessage,
  chatId,
  currentUserId,
  disabled = false,
  placeholder = "Type a message...",
  enableFormality = true,
  language = 'en',
}: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Formality state
  const [formalityDetection, setFormalityDetection] = useState<FormalityDetectionResult | null>(null);
  const [isDetectingFormality, setIsDetectingFormality] = useState(false);
  const [isAdjustingFormality, setIsAdjustingFormality] = useState(false);
  const [adjustmentResult, setAdjustmentResult] = useState<FormalityAdjustmentResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Refs for typing indicator management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  // Refs for formality detection management
  const formalityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear typing indicator
  const clearTypingIndicator = useCallback(async () => {
    if (chatId && currentUserId && isTypingRef.current) {
      try {
        await clearTyping(chatId, currentUserId);
        isTypingRef.current = false;
      } catch (error) {
        // Silently fail - typing indicators are non-critical
      }
    }
  }, [chatId, currentUserId]);

  // Set typing indicator
  const setTypingIndicator = useCallback(async () => {
    if (chatId && currentUserId && !isTypingRef.current) {
      try {
        await setTyping(chatId, currentUserId, true);
        isTypingRef.current = true;
      } catch (error) {
        // Silently fail - typing indicators are non-critical
      }
    }
  }, [chatId, currentUserId]);

  // Detect formality of text
  const detectFormalityLevel = useCallback(async (text: string) => {
    if (!enableFormality || !text || text.trim().length < 10) {
      setFormalityDetection(null);
      return;
    }

    setIsDetectingFormality(true);
    try {
      const result = await detectFormality(text, language);
      setFormalityDetection(result);
    } catch (error) {
      // Silently fail - formality detection is non-critical
      setFormalityDetection(null);
    } finally {
      setIsDetectingFormality(false);
    }
  }, [enableFormality, language]);

  // Handle formality adjustment
  const handleFormalityAdjustment = useCallback(async (targetLevel: FormalityLevel) => {
    if (!messageText || messageText.trim().length < 10) {
      return;
    }

    setIsAdjustingFormality(true);
    try {
      const result = await adjustFormality(
        messageText,
        targetLevel,
        language,
        formalityDetection?.level
      );
      setAdjustmentResult(result);
      setShowPreviewModal(true);
    } catch (error) {
      Alert.alert(
        'Adjustment Failed',
        'Failed to adjust formality. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAdjustingFormality(false);
    }
  }, [messageText, language, formalityDetection]);

  // Make text more formal
  const handleMakeFormal = useCallback(async () => {
    const targetLevel: FormalityLevel =
      formalityDetection?.level === 'very-informal' ? 'informal' :
      formalityDetection?.level === 'informal' ? 'neutral' :
      formalityDetection?.level === 'neutral' ? 'formal' :
      'very-formal';

    await handleFormalityAdjustment(targetLevel);
  }, [formalityDetection, handleFormalityAdjustment]);

  // Make text more casual
  const handleMakeCasual = useCallback(async () => {
    const targetLevel: FormalityLevel =
      formalityDetection?.level === 'very-formal' ? 'formal' :
      formalityDetection?.level === 'formal' ? 'neutral' :
      formalityDetection?.level === 'neutral' ? 'informal' :
      'very-informal';

    await handleFormalityAdjustment(targetLevel);
  }, [formalityDetection, handleFormalityAdjustment]);

  // Accept adjusted text
  const handleAcceptAdjustment = useCallback((adjustedText: string) => {
    setMessageText(adjustedText);
    setShowPreviewModal(false);
    setAdjustmentResult(null);
    // Re-detect formality of adjusted text
    detectFormalityLevel(adjustedText);
  }, [detectFormalityLevel]);

  // Reject adjusted text
  const handleRejectAdjustment = useCallback(() => {
    setShowPreviewModal(false);
    setAdjustmentResult(null);
  }, []);

  // Handle text change with debounced typing indicator and formality detection
  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);

    // Clear existing timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (autoClearTimeoutRef.current) {
      clearTimeout(autoClearTimeoutRef.current);
    }
    if (formalityTimeoutRef.current) {
      clearTimeout(formalityTimeoutRef.current);
    }

    if (text.trim().length > 0) {
      // Debounce typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setTypingIndicator();

        // Set up auto-clear
        autoClearTimeoutRef.current = setTimeout(() => {
          clearTypingIndicator();
        }, AUTO_CLEAR_TYPING_MS);
      }, TYPING_DEBOUNCE_MS);

      // Debounce formality detection (longer delay)
      if (enableFormality && !selectedImage) {
        formalityTimeoutRef.current = setTimeout(() => {
          detectFormalityLevel(text);
        }, FORMALITY_DEBOUNCE_MS);
      }
    } else {
      // Empty input - clear typing and formality immediately
      clearTypingIndicator();
      setFormalityDetection(null);
    }
  }, [setTypingIndicator, clearTypingIndicator, detectFormalityLevel, enableFormality, selectedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoClearTimeoutRef.current) {
        clearTimeout(autoClearTimeoutRef.current);
      }
      if (formalityTimeoutRef.current) {
        clearTimeout(formalityTimeoutRef.current);
      }

      // Clear typing indicator
      if (chatId && currentUserId && isTypingRef.current) {
        clearTyping(chatId, currentUserId).catch(() => {});
      }
    };
  }, [chatId, currentUserId]);

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

      // Clear typing indicator immediately when sending
      await clearTypingIndicator();

      if (selectedImage) {
        // Send image message with optional caption
        const caption = messageText.trim() || undefined;

        // Create message with local image URI (upload will happen in background)
        await onSendMessage(selectedImage, 'image', undefined, caption);

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

  // Show formality indicator when typing text (not for captions)
  const showFormalityIndicator = enableFormality &&
    !selectedImage &&
    messageText.trim().length >= 10 &&
    (formalityDetection || isDetectingFormality);

  return (
    <View style={styles.container}>
      {/* Formality Indicator */}
      <FormalityIndicator
        currentLevel={formalityDetection?.level}
        isDetecting={isDetectingFormality}
        confidence={formalityDetection?.confidence}
        onMakeFormal={handleMakeFormal}
        onMakeCasual={handleMakeCasual}
        isAdjusting={isAdjustingFormality}
        visible={showFormalityIndicator}
      />

      {/* Formality Preview Modal */}
      <FormalityPreviewModal
        visible={showPreviewModal}
        adjustmentResult={adjustmentResult || undefined}
        onAccept={handleAcceptAdjustment}
        onReject={handleRejectAdjustment}
        onClose={() => setShowPreviewModal(false)}
      />

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
          placeholder={selectedImage ? "Add a caption (optional)..." : placeholder}
          value={messageText}
          onChangeText={handleTextChange}
          multiline
          maxLength={selectedImage ? CAPTION_MAX_LENGTH : MESSAGE_CONSTANTS.MAX_LENGTH}
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
      {selectedImage && messageText.length > 0 && (
        <Text style={[
          styles.characterCount,
          messageText.length >= CAPTION_MAX_LENGTH && styles.characterCountWarning
        ]}>
          Caption: {messageText.length}/{CAPTION_MAX_LENGTH}
        </Text>
      )}
      {!selectedImage && messageText.length > MESSAGE_CONSTANTS.MAX_LENGTH * 0.8 && (
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

