/**
 * AI Loading Indicator Component
 * Provides consistent loading UI for all AI features
 * Supports spinner, skeleton, and inline loading styles with timeout indicators
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';

export type LoadingStyle = 'spinner' | 'skeleton' | 'inline';

interface AILoadingIndicatorProps {
  /** Loading style variant */
  style?: LoadingStyle;
  /** Optional loading message */
  message?: string;
  /** Whether the indicator is visible */
  visible?: boolean;
  /** Timeout in milliseconds (default: 10000ms = 10s) */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
  /** Custom container style */
  containerStyle?: ViewStyle;
  /** Size of the spinner (default: 'small') */
  size?: 'small' | 'large';
}

/**
 * AILoadingIndicator displays loading state for AI operations
 * Shows timeout message if operation takes longer than expected
 */
export default function AILoadingIndicator({
  style = 'spinner',
  message,
  visible = true,
  timeout = 10000,
  onTimeout,
  containerStyle,
  size = 'small',
}: AILoadingIndicatorProps) {
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Handle timeout
  useEffect(() => {
    if (!visible) {
      setIsTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => {
      clearTimeout(timer);
      setIsTimedOut(false);
    };
  }, [visible, timeout, onTimeout]);

  if (!visible) {
    return null;
  }

  // Render based on style
  switch (style) {
    case 'spinner':
      return (
        <View style={[styles.spinnerContainer, containerStyle]}>
          <ActivityIndicator size={size} color="#6200ee" />
          {message && (
            <Text variant="bodySmall" style={styles.message}>
              {message}
            </Text>
          )}
          {isTimedOut && (
            <Text variant="bodySmall" style={styles.timeoutMessage}>
              Taking longer than expected...
            </Text>
          )}
        </View>
      );

    case 'skeleton':
      return (
        <View style={[styles.skeletonContainer, containerStyle]}>
          <SkeletonLoader />
          {isTimedOut && (
            <Text variant="bodySmall" style={styles.timeoutMessage}>
              Still processing...
            </Text>
          )}
        </View>
      );

    case 'inline':
      return (
        <View style={[styles.inlineContainer, containerStyle]}>
          <ActivityIndicator size="small" color="#6200ee" />
          {message && (
            <Text variant="bodySmall" style={styles.inlineMessage}>
              {message}
            </Text>
          )}
        </View>
      );

    default:
      return null;
  }
}

/**
 * Skeleton loader for AI content
 * Shows animated placeholder during loading
 */
function SkeletonLoader() {
  return (
    <View style={styles.skeleton}>
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  timeoutMessage: {
    marginTop: 4,
    color: '#FF9800',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  skeletonContainer: {
    padding: 12,
  },
  skeleton: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: '60%',
  },
  skeletonLineMedium: {
    width: '80%',
  },
  skeletonLineLong: {
    width: '95%',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineMessage: {
    color: '#666',
  },
});
