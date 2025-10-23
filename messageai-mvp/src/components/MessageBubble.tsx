/**
 * Message Bubble Component
 * Displays individual messages with delivery status indicators
 * Supports both text and image messages with tap-to-expand functionality
 * Status is computed from message data (deliveredTo, readBy arrays)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text as RNText, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Message } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { computeMessageStatus, getDeliveryCount, getReadCount } from '@/utils/message-status.utils';
// import Avatar from '@/components/Avatar'; // Temporarily disabled - using inline avatar

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
  senderName?: string;
  currentUserId?: string; // For computing status
  isGroup?: boolean; // For showing delivery counts in group chats
  showSenderIndicator?: boolean; // Only show when sender changes from previous message
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showSenderName = false,
  senderName,
  currentUserId,
  isGroup = false,
  showSenderIndicator = false,
}: MessageBubbleProps) {
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  // Compute the actual status from message data
  const displayStatus = computeMessageStatus(message, currentUserId);
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
    >
      {/* Sender name and avatar for group chats */}
      {showSenderIndicator && senderName && (
        <View style={styles.senderHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.avatarText}>
              {senderName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.senderName}>
            {senderName}
          </Text>
        </View>
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {/* Message content */}
        {message.type === 'text' ? (
          <RNText
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content}
          </RNText>
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
      </View>
    </View>
  );

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
            <View style={[styles.avatarCircle, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.avatarText}>
                {senderName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.senderName}>
              {senderName}
            </Text>
          </View>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {/* Message content */}
          {message.type === 'text' ? (
            <RNText
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.content}
            </RNText>
          ) : message.type === 'image' ? (
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
        </View>
      </View>

      {/* Image preview modal */}
      {message.type === 'image' && <ImagePreview />}
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
});

