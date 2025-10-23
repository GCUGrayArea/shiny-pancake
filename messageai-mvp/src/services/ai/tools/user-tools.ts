/**
 * User-related function calling tools for OpenAI
 * Provides tools for retrieving user preferences and information
 */

import type { FunctionTool, FunctionHandler, LanguageCode } from '../types';
import { getUser } from '../../local-user.service';

/**
 * Tool definition: Get user preferences
 * Retrieves user profile and preferences
 */
export const getUserPreferencesTool: FunctionTool = {
  type: 'function',
  function: {
    name: 'get_user_preferences',
    description: 'Retrieve user profile information and preferences',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The unique identifier of the user',
        },
      },
      required: ['userId'],
    },
  },
};

/**
 * Handler: Get user preferences
 */
export const getUserPreferencesHandler: FunctionHandler = async (args: {
  userId: string;
}) => {
  const { userId } = args;

  // Get user from local database
  const result = await getUser(userId);

  if (!result.success || !result.data) {
    return {
      error: 'User not found',
      userId,
    };
  }

  const user = result.data;

  return {
    userId: user.uid,
    displayName: user.displayName,
    email: user.email,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    // Future: preferredLanguage, autoTranslateEnabled, etc.
  };
};

/**
 * Tool definition: Detect language
 * Detects the language of a given text
 */
export const detectLanguageTool: FunctionTool = {
  type: 'function',
  function: {
    name: 'detect_language',
    description: 'Detect the language of a text message',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to analyze for language detection',
        },
      },
      required: ['text'],
    },
  },
};

/**
 * Handler: Detect language
 * Note: This is a placeholder that returns basic detection
 * Will be enhanced in PR-043 with actual OpenAI-based detection
 */
export const detectLanguageHandler: FunctionHandler = async (args: {
  text: string;
}) => {
  const { text } = args;

  // Simple heuristic-based detection for common patterns
  // This will be replaced with OpenAI-based detection in PR-043
  let detectedLanguage: LanguageCode = 'unknown';
  let confidence = 0.5;

  // Very basic pattern matching (placeholder)
  if (/^[a-zA-Z\s.,!?'-]+$/.test(text)) {
    detectedLanguage = 'en';
    confidence = 0.7;
  } else if (/[\u4e00-\u9fa5]/.test(text)) {
    detectedLanguage = 'zh';
    confidence = 0.8;
  } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    detectedLanguage = 'ja';
    confidence = 0.8;
  } else if (/[\uac00-\ud7af]/.test(text)) {
    detectedLanguage = 'ko';
    confidence = 0.8;
  } else if (/[\u0600-\u06ff]/.test(text)) {
    detectedLanguage = 'ar';
    confidence = 0.8;
  }

  return {
    text: text.substring(0, 50), // Return first 50 chars for reference
    detectedLanguage,
    confidence,
    note: 'Using basic pattern matching. Will be enhanced with AI in PR-043.',
  };
};

/**
 * All user tools
 */
export const userTools: FunctionTool[] = [
  getUserPreferencesTool,
  detectLanguageTool,
];

/**
 * User tool handlers mapped by function name
 */
export const userToolHandlers: Record<string, FunctionHandler> = {
  get_user_preferences: getUserPreferencesHandler,
  detect_language: detectLanguageHandler,
};
