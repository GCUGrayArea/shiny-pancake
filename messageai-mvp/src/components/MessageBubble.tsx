/**
 * Message Bubble Component
 * Displays individual messages with delivery status indicators
 * Supports both text and image messages with tap-to-expand functionality
 * Status is computed from message data (deliveredTo, readBy arrays)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text as RNText, TouchableOpacity, Image, Modal, Dimensions, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Message } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { computeMessageStatus, getDeliveryCount, getReadCount } from '@/utils/message-status.utils';
import MessageContextMenu, { MenuAction } from './MessageContextMenu';
import LanguagePickerModal from './LanguagePickerModal';
import TranslationBubble from './TranslationBubble';
import { detectLanguage } from '@/services/ai/language-detection.service';
import { translateMessageOnDemand } from '@/services/ai/translation.service';
import type { LanguageCode } from '@/services/ai/types';
import Avatar from '@/components/Avatar';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
  senderName?: string;
  senderProfilePictureUrl?: string; // Profile picture URL for sender
  senderId?: string; // Sender's user ID for avatar color
  currentUserId?: string; // For computing status
  isGroup?: boolean; // For showing delivery counts in group chats
  showSenderIndicator?: boolean; // Only show when sender changes from previous message
  preferredLanguage?: LanguageCode; // User's preferred language for translations
  onTranslationUpdate?: (messageId: string, translation: string, targetLang: LanguageCode) => void;
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showSenderName = false,
  senderName,
  senderProfilePictureUrl,
  senderId,
  currentUserId,
  isGroup = false,
  showSenderIndicator = false,
  preferredLanguage = 'en',
  onTranslationUpdate,
}: MessageBubbleProps) {
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | undefined>();

  // On-demand translation state (separate from auto-translation)
  const [onDemandTranslation, setOnDemandTranslation] = useState<string | null>(null);
  const [onDemandTargetLang, setOnDemandTargetLang] = useState<LanguageCode | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Compute the actual status from message data
  const displayStatus = computeMessageStatus(message, currentUserId);
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle long press on message
  const handleLongPress = (event: any) => {
    if (message.type !== 'text') return; // Only for text messages

    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  // Handle translation to preferred language
  const handleTranslate = async () => {
    await performTranslation(preferredLanguage);
  };

  // Handle translation to custom language
  const handleTranslateTo = () => {
    setLanguagePickerVisible(true);
  };

  // Perform the actual translation
  const performTranslation = async (targetLang: LanguageCode) => {
    if (message.type !== 'text') return;

    setTranslating(true);
    setTranslationError(null);

    try {
      // Detect source language
      const sourceLang = message.detectedLanguage as LanguageCode || await detectLanguage(message.content);

      // Translate
      const translation = await translateMessageOnDemand(
        message.content,
        sourceLang,
        targetLang,
        message.id
      );

      setOnDemandTranslation(translation);
      setOnDemandTargetLang(targetLang);
      setShowOriginal(false);

      // Notify parent component if callback provided
      if (onTranslationUpdate) {
        onTranslationUpdate(message.id, translation, targetLang);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  // Handle language selection from picker
  const handleLanguageSelect = async (language: LanguageCode) => {
    setLanguagePickerVisible(false);
    await performTranslation(language);
  };

  // Handle context menu actions
  const handleMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'translate':
        handleTranslate();
        break;
      case 'translate-to':
        handleTranslateTo();
        break;
      case 'copy':
        // TODO: Implement copy functionality
        console.log('Copy message:', message.content);
        break;
    }
  };

  // Build context menu actions
  const getMenuActions = (): MenuAction[] => {
    const actions: MenuAction[] = [];

    // Always show translate option for text messages
    if (message.type === 'text') {
      actions.push({
        id: 'translate',
        label: `Translate to ${preferredLanguage.toUpperCase()}`,
        icon: 'translate',
        color: '#2196F3',
      });

      actions.push({
        id: 'translate-to',
        label: 'Translate to...',
        icon: 'earth',
        color: '#2196F3',
      });

      actions.push({
        id: 'copy',
        label: 'Copy',
        icon: 'content-copy',
      });
    }

    return actions;
  };

  // Render delivery status indicators (only for sent messages)
  const renderStatusIndicator = () => {
    if (!isOwnMessage) return null;

    const iconSize = 14;
    const deliveryCount = getDeliveryCount(message);
    const readCount = getReadCount(message);

    switch (displayStatus) {
      case 'sending':
        // Gray single checkmark
        return (
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons
              name="check"
              size={iconSize}
              color="#999"
              style={styles.statusIcon}
            />
          </View>
        );

      case 'sent':
        // Gray double checkmark
        return (
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons
              name="check-all"
              size={iconSize}
              color="#999"
              style={styles.statusIcon}
            />
          </View>
        );

      case 'delivered':
        // Blue double checkmark with delivery count for groups
        if (isGroup && deliveryCount > 0) {
          return (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name="check-all"
                size={iconSize}
                color="#2196F3"
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>
                {deliveryCount}
              </Text>
            </View>
          );
        }

        return (
          <MaterialCommunityIcons
            name="check-all"
            size={iconSize}
            color="#2196F3"
            style={styles.statusIcon}
          />
        );

      case 'read':
        // Darker blue double checkmark with read count for groups
        if (isGroup && readCount > 0) {
          return (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name="check-all"
                size={iconSize}
                color="#1976D2"
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>
                {readCount}
              </Text>
            </View>
          );
        }

        return (
          <MaterialCommunityIcons
            name="check-all"
            size={iconSize}
            color="#1976D2"
            style={styles.statusIcon}
          />
        );

      default:
        return null;
    }
  };

  // Image Preview Modal Component
  const ImagePreview = () => (
    <Modal
      visible={imagePreviewVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setImagePreviewVisible(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => setImagePreviewVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImagePreviewVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: message.content }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            {message.caption && (
              <View style={styles.modalCaptionContainer}>
                <RNText style={styles.modalCaptionText} selectable>
                  {message.caption}
                </RNText>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <>
      {/* Main message bubble */}
      <View
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {/* Sender name and avatar for group chats */}
        {showSenderIndicator && senderName && (
          <View style={styles.senderHeader}>
            <Avatar
              displayName={senderName}
              userId={senderId || message.senderId}
              profilePictureUrl={senderProfilePictureUrl}
              size="small"
            />
            <Text variant="bodySmall" style={styles.senderName}>
              {senderName}
            </Text>
          </View>
        )}

        {/* Message bubble */}
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {/* Message content */}
          {message.type === 'text' ? (
            <>
              {/* Show on-demand translation if available, otherwise auto-translation, otherwise original */}
              {onDemandTranslation && onDemandTargetLang ? (
                <TranslationBubble
                  original={message.content}
                  translated={onDemandTranslation}
                  fromLang={(message.detectedLanguage as LanguageCode) || 'unknown'}
                  toLang={onDemandTargetLang}
                  loading={translating}
                  error={translationError || undefined}
                  isOwnMessage={isOwnMessage}
                  onToggleOriginal={() => setShowOriginal(!showOriginal)}
                  showingOriginal={showOriginal}
                />
              ) : (
                <>
                  <RNText
                    style={[
                      styles.messageText,
                      isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                    ]}
                  >
                    {showOriginal || !message.translatedText
                      ? message.content
                      : message.translatedText}
                  </RNText>
                  {message.translatedText && (
                    <View style={styles.translationInfo}>
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.translationLabel,
                          isOwnMessage ? styles.ownTranslationLabel : styles.otherTranslationLabel,
                        ]}
                      >
                        {showOriginal
                          ? `Original (${message.detectedLanguage?.toUpperCase() || 'unknown'})`
                          : `Translated from ${message.detectedLanguage?.toUpperCase() || 'unknown'}`}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowOriginal(!showOriginal)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.translationToggle,
                            isOwnMessage ? styles.ownTranslationToggle : styles.otherTranslationToggle,
                          ]}
                        >
                          {showOriginal ? 'Show Translation' : 'Show Original'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </>
          ) : message.type === 'image' ? (
            <>
              <TouchableOpacity
                onPress={() => setImagePreviewVisible(true)}
                style={styles.imageContainer}
              >
                <Image
                  source={{ uri: message.content }}
                  style={[
                    styles.messageImage,
                    isOwnMessage ? styles.ownMessageImage : styles.otherMessageImage,
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              {message.caption && (
                <RNText
                  style={[
                    styles.captionText,
                    isOwnMessage ? styles.ownCaptionText : styles.otherCaptionText,
                  ]}
                  selectable
                >
                  {message.caption}
                </RNText>
              )}
            </>
          ) : null}

          {/* Timestamp and status */}
          <View style={styles.footer}>
            <RNText
              style={[
                styles.timestamp,
                isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
              ]}
            >
              {formatTime(message.timestamp)}
            </RNText>
            {renderStatusIndicator()}
          </View>
        </Pressable>
      </View>

      {/* Image preview modal */}
      {message.type === 'image' && <ImagePreview />}

      {/* Context menu for message actions */}
      <MessageContextMenu
        visible={contextMenuVisible}
        actions={getMenuActions()}
        onActionPress={handleMenuAction}
        onClose={() => setContextMenuVisible(false)}
        position={menuPosition}
      />

      {/* Language picker for "Translate to..." */}
      <LanguagePickerModal
        visible={languagePickerVisible}
        selectedLanguage={onDemandTargetLang || preferredLanguage}
        onSelect={handleLanguageSelect}
        onClose={() => setLanguagePickerVisible(false)}
        title="Translate to"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E0E0E0',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#666',
    marginBottom: 2,
    marginLeft: 12,
    fontWeight: '500',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestamp: {
    color: '#666',
  },
  statusIcon: {
    marginTop: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  // Image styles
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  ownMessageImage: {
    // Same as bubble styling
  },
  otherMessageImage: {
    // Same as bubble styling
  },
  // Caption styles
  captionText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
  ownCaptionText: {
    color: '#FFFFFF',
  },
  otherCaptionText: {
    color: '#000000',
  },
  // Modal styles for full-screen image preview
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    position: 'relative',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  modalCaptionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
    maxHeight: 150,
  },
  modalCaptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  // Translation styles
  translationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  translationLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  ownTranslationLabel: {
    color: '#FFFFFF',
  },
  otherTranslationLabel: {
    color: '#666',
  },
  translationToggle: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  ownTranslationToggle: {
    color: '#FFFFFF',
  },
  otherTranslationToggle: {
    color: '#2196F3',
  },
});

