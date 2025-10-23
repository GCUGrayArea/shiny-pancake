/**
 * TypingIndicator component
 * Displays who is currently typing in a conversation with animated dots
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { User } from '@/types';

export interface TypingIndicatorProps {
  /** Users who are currently typing */
  typingUsers: User[];
  /** Additional styles */
  style?: any;
}

/**
 * Animated dot for the typing indicator
 */
function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, delay]);

  return (
    <Animated.View style={[styles.dot, { opacity }]}>
      <Text style={styles.dotText}>•</Text>
    </Animated.View>
  );
}

/**
 * Format typing user names for display
 */
function formatTypingText(users: User[]): string {
  if (users.length === 0) {
    return '';
  }

  if (users.length === 1) {
    return `${users[0].displayName} is typing`;
  }

  if (users.length === 2) {
    return `${users[0].displayName} and ${users[1].displayName} are typing`;
  }

  if (users.length === 3) {
    return `${users[0].displayName}, ${users[1].displayName}, and ${users[2].displayName} are typing`;
  }

  // More than 3 users
  const othersCount = users.length - 2;
  return `${users[0].displayName}, ${users[1].displayName}, and ${othersCount} ${
    othersCount === 1 ? 'other' : 'others'
  } are typing`;
}

/**
 * TypingIndicator component
 */
export default function TypingIndicator({ typingUsers, style }: TypingIndicatorProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length > 0) {
      // Slide in
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [typingUsers.length, slideAnim]);

  if (typingUsers.length === 0) {
    return null;
  }

  const typingText = formatTypingText(typingUsers);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{typingText}</Text>
        <View style={styles.dotsContainer}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={200} />
          <AnimatedDot delay={400} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    color: '#757575',
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  dot: {
    marginHorizontal: 1,
  },
  dotText: {
    fontSize: 16,
    color: '#757575',
    lineHeight: 16,
  },
});
