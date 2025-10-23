/**
 * Chat Utility Functions
 * Helper functions for chat-related operations
 */

import { Chat } from '../types';

/**
 * Get the display name for a chat
 * - For 1:1 chats: Returns the other participant's name
 * - For group chats: Returns the group name or a fallback
 *
 * @param chat - The chat object
 * @param currentUserId - The current user's ID
 * @param userNames - Optional map of user IDs to display names for 1:1 chats
 * @returns The display name for the chat
 */
export function getChatDisplayName(
  chat: Chat,
  currentUserId: string,
  userNames?: Map<string, string>
): string {
  // For group chats, return the group name or a fallback
  if (chat.type === 'group') {
    return chat.name || 'Group Chat';
  }

  // For 1:1 chats, find the other participant
  const otherUserId = chat.participantIds.find(id => id !== currentUserId);

  if (!otherUserId) {
    // Fallback if we can't find the other user
    return 'Chat';
  }

  // Try to get the display name from the provided map
  if (userNames && userNames.has(otherUserId)) {
    return userNames.get(otherUserId)!;
  }

  // Fallback to user ID (should be rare)
  return `User ${otherUserId.slice(-4)}`;
}

/**
 * Get initials from a display name for avatar display
 *
 * @param displayName - The user's display name
 * @returns Up to 2 initials in uppercase
 */
export function getInitials(displayName: string): string {
  if (!displayName || displayName.trim().length === 0) {
    return '?';
  }

  const words = displayName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
