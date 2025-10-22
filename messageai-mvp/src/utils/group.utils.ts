/**
 * Group Chat Utilities
 * Functions for group chat management and name generation
 */

import { User } from '@/types';

/**
 * Generate a group name from participant names
 * Uses first 2-3 participant names, or "Group Chat" if fewer than 2
 */
export function generateGroupName(participants: User[]): string {
  if (participants.length === 0) {
    return 'Group Chat';
  }

  if (participants.length === 1) {
    return `${participants[0].displayName}'s Group`;
  }

  if (participants.length === 2) {
    return `${participants[0].displayName}, ${participants[1].displayName}`;
  }

  // For 3+ participants, use first 2 names + count
  const firstTwo = participants.slice(0, 2).map(p => p.displayName);
  const remainingCount = participants.length - 2;

  return `${firstTwo.join(', ')}, +${remainingCount} others`;
}

/**
 * Generate a group avatar from participant names
 * Uses first letter of first 2 participants or group name
 */
export function generateGroupInitials(participants: User[], groupName?: string): string {
  if (participants.length === 0) {
    return 'GC';
  }

  if (participants.length === 1) {
    return getInitials(participants[0].displayName);
  }

  if (participants.length >= 2) {
    const firstInitial = getInitials(participants[0].displayName);
    const secondInitial = getInitials(participants[1].displayName);
    return `${firstInitial}${secondInitial}`;
  }

  return 'GC';
}

/**
 * Extract initials from a display name
 * Handles edge cases: empty, single name, special characters
 */
function getInitials(displayName: string): string {
  if (!displayName || typeof displayName !== 'string') {
    return '?';
  }

  // Remove extra spaces and split by spaces
  const parts = displayName.trim().split(/\s+/);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    // Single name - take first 2 characters
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Multiple names - take first letter of each
  return parts
    .slice(0, 2) // Max 2 initials
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * Validate group creation parameters
 */
export function validateGroupCreation(
  participants: User[],
  currentUser: User
): { isValid: boolean; error?: string } {
  if (!participants || participants.length === 0) {
    return { isValid: false, error: 'Please select at least one participant' };
  }

  if (participants.length > 5) {
    return { isValid: false, error: 'Groups cannot have more than 5 participants' };
  }

  // Check if current user is included
  const currentUserIncluded = participants.some(p => p.uid === currentUser.uid);
  if (!currentUserIncluded) {
    return { isValid: false, error: 'You must be a participant in the group' };
  }

  return { isValid: true };
}

