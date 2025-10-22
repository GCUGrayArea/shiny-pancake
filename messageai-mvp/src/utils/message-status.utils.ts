/**
 * Message Status Utilities
 * Computes message delivery status from message data
 * 
 * Status logic:
 * - sending: Message has localId but no Firebase ID yet
 * - sent: Message has Firebase ID (persisted to server)
 * - delivered: At least one recipient in deliveredTo array
 * - read: At least one recipient in readBy array
 */

import { Message, DeliveryStatus } from '../types';

/**
 * Compute the display status for a message based on its data
 * 
 * @param message - The message to compute status for
 * @param currentUserId - The current user's ID (to determine if they sent the message)
 * @returns The computed delivery status
 */
export function computeMessageStatus(
  message: Message,
  currentUserId?: string
): DeliveryStatus {
  // For messages we didn't send, status is always 'sent' from our perspective
  // (we received it, so it was sent)
  if (currentUserId && message.senderId !== currentUserId) {
    return 'sent';
  }

  // For messages we sent, compute status from Firebase persistence and arrays
  
  // If message has no Firebase ID, it's still sending
  if (!message.id || message.id === '') {
    return 'sending';
  }

  // If at least one recipient has read the message, show as read
  if (message.readBy && message.readBy.length > 0) {
    return 'read';
  }

  // If at least one recipient has received the message, show as delivered
  if (message.deliveredTo && message.deliveredTo.length > 0) {
    return 'delivered';
  }

  // Message is persisted to Firebase but no delivery confirmation yet
  return 'sent';
}

/**
 * Check if a message is still being sent
 */
export function isMessageSending(message: Message): boolean {
  return !message.id || message.id === '';
}

/**
 * Check if a message has been persisted to Firebase
 */
export function isMessagePersisted(message: Message): boolean {
  return !!message.id && message.id !== '';
}

/**
 * Check if a message has been delivered to at least one recipient
 */
export function isMessageDelivered(message: Message): boolean {
  return !!message.deliveredTo && message.deliveredTo.length > 0;
}

/**
 * Check if a message has been read by at least one recipient
 */
export function isMessageRead(message: Message): boolean {
  return !!message.readBy && message.readBy.length > 0;
}

/**
 * Get the number of recipients who have received a message
 */
export function getDeliveryCount(message: Message): number {
  return message.deliveredTo?.length ?? 0;
}

/**
 * Get the number of recipients who have read a message
 */
export function getReadCount(message: Message): number {
  return message.readBy?.length ?? 0;
}

/**
 * Check if a specific user has received a message
 */
export function hasUserReceivedMessage(message: Message, userId: string): boolean {
  return message.deliveredTo?.includes(userId) ?? false;
}

/**
 * Check if a specific user has read a message
 */
export function hasUserReadMessage(message: Message, userId: string): boolean {
  return message.readBy?.includes(userId) ?? false;
}

