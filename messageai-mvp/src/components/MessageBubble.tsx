/**
 * Message Bubble Component
 * Displays individual messages with delivery status indicators
 * Status is computed from message data (deliveredTo, readBy arrays)
 */

import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';
import { Message } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { computeMessageStatus } from '@/utils/message-status.utils';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
  senderName?: string;
  currentUserId?: string; // For computing status
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showSenderName = false,
  senderName,
  currentUserId,
}: MessageBubbleProps) {
  
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
    
    switch (displayStatus) {
      case 'sending':
        // Gray single checkmark
        return (
          <MaterialCommunityIcons 
            name="check" 
            size={iconSize} 
            color="#999" 
            style={styles.statusIcon}
          />
        );
      
      case 'sent':
        // Gray double checkmark
        return (
          <MaterialCommunityIcons 
            name="check-all" 
            size={iconSize} 
            color="#999" 
            style={styles.statusIcon}
          />
        );
      
      case 'delivered':
        // Blue double checkmark
        return (
          <MaterialCommunityIcons 
            name="check-all" 
            size={iconSize} 
            color="#2196F3" 
            style={styles.statusIcon}
          />
        );
      
      case 'read':
        // Darker blue double checkmark
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
      {/* Sender name for group chats */}
      {showSenderName && senderName && (
        <Text variant="bodySmall" style={styles.senderName}>
          {senderName}
        </Text>
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {/* Message content */}
        <RNText
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {message.content}
        </RNText>

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
});

