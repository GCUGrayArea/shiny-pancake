/**
 * Avatar component for displaying user initials with presence status
 * Based on PRD requirements for user avatar display
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { getInitials, getAvatarColor, AVATAR_SIZES, type AvatarSize } from '@/utils/avatar.utils';

export interface AvatarProps {
  /** User display name to generate initials from */
  displayName: string;
  /** User ID for consistent color generation */
  userId: string;
  /** Size variant */
  size?: AvatarSize;
  /** Whether to show online status indicator */
  showOnlineStatus?: boolean;
  /** Current online status */
  isOnline?: boolean;
  /** Additional styles */
  style?: any;
}

/**
 * Avatar component with presence indicator
 */
export default function Avatar({
  displayName,
  userId,
  size = 'medium',
  showOnlineStatus = false,
  isOnline = false,
  style,
}: AvatarProps) {
  const initials = getInitials(displayName);
  const backgroundColor = getAvatarColor(userId);
  const avatarSize = AVATAR_SIZES[size];
  const dotSize = size === 'small' ? 8 : size === 'medium' ? 10 : 12;

  return (
    <View style={[styles.container, { width: avatarSize, height: avatarSize }, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            backgroundColor,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: avatarSize * 0.4,
              lineHeight: avatarSize * 0.4,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {initials}
        </Text>
      </View>

      {showOnlineStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              position: 'absolute',
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusDot: {
    // Position and styling handled dynamically
  },
});
