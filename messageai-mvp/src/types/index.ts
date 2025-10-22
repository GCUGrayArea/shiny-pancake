/**
 * Core TypeScript interfaces for MessageAI MVP
 * Based on PRD data models
 */

/**
 * User interface representing a registered user
 */
export interface User {
  /** Firebase Auth UID - unique identifier for the user */
  uid: string;
  /** User's email address */
  email: string;
  /** User's display name (2-50 characters) */
  displayName: string;
  /** Timestamp when the user account was created */
  createdAt: number;
  /** Timestamp of last activity */
  lastSeen: number;
  /** Current online/offline status */
  isOnline: boolean;
  /** Firebase Cloud Messaging token for push notifications */
  fcmToken?: string;
  // Future: profilePictureUrl?: string;
}

/**
 * Message delivery status states
 */
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

/**
 * Message content types
 */
export type MessageType = 'text' | 'image';

/**
 * Message interface representing a single chat message
 */
export interface Message {
  /** Unique message ID (from server) */
  id: string;
  /** Reference to the chat this message belongs to */
  chatId: string;
  /** UID of the user who sent the message */
  senderId: string;
  /** Type of message content */
  type: MessageType;
  /** Message content - text string or image URL */
  content: string;
  /** Timestamp when message was created */
  timestamp: number;
  /** Current delivery status of the message */
  status: DeliveryStatus;
  /** Temporary local ID for optimistic UI (before server confirmation) */
  localId?: string;
  /** Array of user UIDs who have received the message (for group chats) */
  deliveredTo?: string[];
  /** Array of user UIDs who have read the message (for group chats) */
  readBy?: string[];
  /** Additional metadata for the message */
  metadata?: {
    /** Image width in pixels */
    imageWidth?: number;
    /** Image height in pixels */
    imageHeight?: number;
    /** Image file size in bytes */
    imageSize?: number;
  };
}

/**
 * Chat type - one-on-one or group
 */
export type ChatType = '1:1' | 'group';

/**
 * Last message preview for chat list
 */
export interface LastMessage {
  /** Preview of message content */
  content: string;
  /** UID of user who sent the last message */
  senderId: string;
  /** Timestamp of last message */
  timestamp: number;
  /** Type of last message */
  type: MessageType;
}

/**
 * Chat interface representing a conversation (1:1 or group)
 */
export interface Chat {
  /** Unique chat ID */
  id: string;
  /** Type of chat - one-on-one or group */
  type: ChatType;
  /** Array of participant user UIDs */
  participantIds: string[];
  /** Optional group name (for group chats) */
  name?: string;
  /** Timestamp when chat was created */
  createdAt: number;
  /** Preview of the last message in the chat */
  lastMessage?: LastMessage;
  /** Per-user unread message counts */
  unreadCounts?: {
    [userId: string]: number;
  };
  // Future: avatarUrl?: string;
}

/**
 * Error response from API operations
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  /** The authenticated user */
  user: User;
  /** Authentication token */
  token: string;
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
  /** Public URL of the uploaded image */
  url: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  /** Chat ID the notification is for */
  chatId: string;
  /** Message ID that triggered the notification */
  messageId: string;
  /** Sender's display name */
  senderName: string;
  /** Message preview text */
  preview: string;
  /** Message type */
  type: MessageType;
}
