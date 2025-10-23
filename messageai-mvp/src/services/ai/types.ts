/**
 * AI Service Types
 * Type definitions for OpenAI and Swarm integration
 */

import { Message, User } from '../../types';

/**
 * Language codes (ISO 639-1)
 */
export type LanguageCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'ru' // Russian
  | 'hi' // Hindi
  | 'nl' // Dutch
  | 'sv' // Swedish
  | 'pl' // Polish
  | 'tr' // Turkish
  | 'vi' // Vietnamese
  | 'th' // Thai
  | 'id' // Indonesian
  | 'unknown';

/**
 * AI completion options
 */
export interface AICompletionOptions {
  /** Temperature for response randomness (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * AI agent response
 */
export interface AIResponse {
  /** Generated text content */
  content: string;
  /** Model used for generation */
  model: string;
  /** Tokens used in the request */
  tokensUsed?: number;
  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Conversation context for RAG pipeline
 */
export interface ConversationContext {
  /** Chat ID */
  chatId: string;
  /** Recent messages in chronological order */
  messages: Message[];
  /** Participant user information */
  participants: User[];
  /** Total number of messages in conversation */
  totalMessages: number;
}

/**
 * Formatted context for LLM
 */
export interface FormattedContext {
  /** System prompt */
  systemPrompt: string;
  /** Formatted conversation history */
  conversationHistory: string;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Cultural context hint
 */
export interface ContextHint {
  /** The phrase or reference */
  phrase: string;
  /** Explanation of what it means */
  explanation: string;
  /** Cultural background information */
  culturalBackground: string;
  /** Category of the hint */
  category: 'holiday' | 'idiom' | 'custom' | 'historical' | 'norm' | 'slang';
}

/**
 * Formality levels
 */
export type FormalityLevel =
  | 'very-informal'
  | 'informal'
  | 'neutral'
  | 'formal'
  | 'very-formal';

/**
 * Formality detection result
 */
export interface FormalityResult {
  /** Detected formality level */
  level: FormalityLevel;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Smart reply suggestion
 */
export interface SmartReply {
  /** Reply text */
  text: string;
  /** Language of the reply */
  language: LanguageCode;
  /** Type/category of reply */
  type: 'agree' | 'question' | 'continue' | 'polite-close' | 'casual';
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * User style profile for smart replies
 */
export interface UserStyleProfile {
  /** User ID */
  userId: string;
  /** Common phrases */
  commonPhrases: string[];
  /** Typical formality level */
  typicalFormality: FormalityLevel;
  /** Emoji usage frequency (0-1) */
  emojiUsage: number;
  /** Average message length */
  averageLength: number;
  /** Preferred languages */
  languages: LanguageCode[];
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Translation cache entry
 */
export interface TranslationCacheEntry {
  /** Original text */
  original: string;
  /** Translated text */
  translated: string;
  /** Source language */
  fromLang: LanguageCode;
  /** Target language */
  toLang: LanguageCode;
  /** Timestamp of translation */
  timestamp: number;
}

/**
 * AI error types
 */
export type AIErrorType =
  | 'timeout'
  | 'api_error'
  | 'invalid_response'
  | 'rate_limit'
  | 'network_error'
  | 'unknown';

/**
 * AI error
 */
export interface AIError extends Error {
  /** Error type */
  type: AIErrorType;
  /** Original error if available */
  originalError?: Error;
  /** Retry suggested */
  retryable: boolean;
}
