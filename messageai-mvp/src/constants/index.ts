/**
 * Application constants
 * Based on PRD requirements
 */

/**
 * Message constraints
 */
export const MESSAGE_CONSTANTS = {
  /** Maximum message length in characters */
  MAX_LENGTH: 5000,
  /** Number of messages to load per page */
  PAGINATION_SIZE: 50,
} as const;

/**
 * Image constraints
 */
export const IMAGE_CONSTANTS = {
  /** Maximum image size in bytes (2MB) */
  MAX_SIZE: 2 * 1024 * 1024,
  /** Image compression quality (0-1) */
  COMPRESSION_QUALITY: 0.8,
  /** Supported image formats */
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png'] as const,
} as const;

/**
 * Group chat constraints
 */
export const GROUP_CONSTANTS = {
  /** Minimum number of participants in a group */
  MIN_PARTICIPANTS: 3,
  /** Maximum number of participants in a group */
  MAX_PARTICIPANTS: 5,
} as const;

/**
 * User profile constraints
 */
export const USER_CONSTANTS = {
  /** Minimum display name length */
  MIN_DISPLAY_NAME_LENGTH: 2,
  /** Maximum display name length */
  MAX_DISPLAY_NAME_LENGTH: 50,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
} as const;

/**
 * Network and retry configuration
 */
export const NETWORK_CONSTANTS = {
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
  /** Maximum number of retry attempts for failed operations */
  MAX_RETRIES: 5,
  /** Initial retry delay in milliseconds */
  INITIAL_RETRY_DELAY: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 16000,
} as const;

/**
 * Presence update intervals
 */
export const PRESENCE_CONSTANTS = {
  /** Maximum time before considering a user offline (seconds) */
  OFFLINE_THRESHOLD: 30,
} as const;

/**
 * Database configuration
 */
export const DATABASE_CONSTANTS = {
  /** Database name for SQLite */
  DB_NAME: 'messageai.db',
  /** Database version */
  DB_VERSION: 1,
} as const;

/**
 * Regular expressions for validation
 */
export const VALIDATION_REGEX = {
  /** Email validation pattern */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

/**
 * Avatar color palette for user initials
 * Ensures consistent, visually distinct colors
 */
export const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52B788', // Green
] as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_EMAIL: 'auth/invalid-email',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_WRONG_PASSWORD: 'auth/wrong-password',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',

  // Network errors
  NETWORK_ERROR: 'network/error',
  NETWORK_TIMEOUT: 'network/timeout',

  // Message errors
  MESSAGE_TOO_LONG: 'message/too-long',
  MESSAGE_SEND_FAILED: 'message/send-failed',

  // Image errors
  IMAGE_TOO_LARGE: 'image/too-large',
  IMAGE_UPLOAD_FAILED: 'image/upload-failed',
  IMAGE_INVALID_FORMAT: 'image/invalid-format',

  // General errors
  UNKNOWN_ERROR: 'unknown/error',
} as const;
