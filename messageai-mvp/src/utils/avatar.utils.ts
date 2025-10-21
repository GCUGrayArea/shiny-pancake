/**
 * Avatar utility functions for generating user initials and colors
 * Based on PRD requirements for user avatar display
 */

import { AVATAR_COLORS } from '@/constants';

/**
 * Extract initials from a display name
 * Handles edge cases: single name, multiple words, special characters, emojis
 *
 * @param displayName - The user's display name
 * @returns 1-2 character initials string
 */
export function getInitials(displayName: string): string {
  if (!displayName || typeof displayName !== 'string') {
    return '?';
  }

  // Trim whitespace
  const trimmed = displayName.trim();

  // Handle empty string after trimming
  if (!trimmed) {
    return '?';
  }

  // Split by whitespace and hyphens, filter out empty parts
  const words = trimmed.split(/[\s-]+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return '?';
  }

  // Helper function to uppercase only letters, preserving emojis and other characters
  const smartUpperCase = (str: string): string => {
    return str.replace(/[a-z]/g, char => char.toUpperCase());
  };

  // Single word - take first 2 characters, or first if only 1 char
  if (words.length === 1) {
    const word = words[0];
    if (word.length >= 2) {
      return smartUpperCase(word.charAt(0) + word.charAt(1));
    } else {
      return smartUpperCase(word.charAt(0));
    }
  }

  // Multiple words - take first character of first and last word
  const firstInitial = smartUpperCase(words[0].charAt(0));
  const lastInitial = smartUpperCase(words[words.length - 1].charAt(0));

  return firstInitial + lastInitial;
}

/**
 * Generate a consistent avatar color based on user ID
 * Uses a hash function to ensure same user always gets same color
 *
 * @param uid - The user's unique identifier
 * @returns Hex color string from the predefined palette
 */
export function getAvatarColor(uid: string): string {
  if (!uid || typeof uid !== 'string') {
    return AVATAR_COLORS[0]; // Default to first color
  }

  // Simple hash function to get consistent index
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Get positive hash and map to color palette
  const positiveHash = Math.abs(hash);
  const colorIndex = positiveHash % AVATAR_COLORS.length;

  return AVATAR_COLORS[colorIndex];
}

/**
 * Avatar size variants as specified in PRD
 */
export const AVATAR_SIZES = {
  small: 32,
  medium: 48,
  large: 64,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;
