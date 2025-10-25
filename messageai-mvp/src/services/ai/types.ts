/**
 * AI-specific TypeScript interfaces and types for MessageAI
 * Defines types for OpenAI integration, Swarm agents, and RAG pipeline
 */

/**
 * Language codes following ISO 639-1 standard
 */
export type LanguageCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'nl' // Dutch
  | 'pl' // Polish
  | 'sv' // Swedish
  | 'tr' // Turkish
  | 'unknown'; // Unable to detect

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for completions */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature for response randomness (0-2) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * OpenAI completion request options
 */
export interface CompletionOptions {
  /** Model to use (overrides default) */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature (0-2) */
  temperature?: number;
  /** System message to prepend */
  systemMessage?: string;
  /** Enable streaming response */
  stream?: boolean;
  /** Function calling tools */
  tools?: FunctionTool[];
  /** Tool choice strategy */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * OpenAI message format
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'function';
  /** Message content */
  content: string;
  /** Function call name (if role is function) */
  name?: string;
}

/**
 * Function calling tool definition
 */
export interface FunctionTool {
  /** Tool type */
  type: 'function';
  /** Function definition */
  function: {
    /** Function name */
    name: string;
    /** Function description */
    description: string;
    /** Parameter schema (JSON Schema) */
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Function execution handler
 */
export type FunctionHandler = (args: any) => Promise<any>;

/**
 * RAG (Retrieval-Augmented Generation) context
 */
export interface RAGContext {
  /** Conversation messages */
  messages: Array<{
    /** Sender display name */
    senderName: string;
    /** Message content */
    content: string;
    /** Timestamp */
    timestamp: number;
    /** Message type */
    type: 'text' | 'image';
  }>;
  /** Total number of messages in context */
  messageCount: number;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Swarm agent configuration
 */
export interface SwarmAgent {
  /** Agent name/identifier */
  name: string;
  /** Agent description */
  description: string;
  /** System instructions for the agent */
  instructions: string;
  /** Available tools/functions for this agent */
  tools?: FunctionTool[];
  /** Model to use (overrides default) */
  model?: string;
}

/**
 * AI error types
 */
export type AIErrorType =
  | 'api_error'       // OpenAI API error
  | 'timeout'         // Request timeout
  | 'rate_limit'      // Rate limit exceeded
  | 'invalid_request' // Invalid request parameters
  | 'auth_error'      // Authentication error
  | 'network_error'   // Network connectivity error
  | 'unknown';        // Unknown error

/**
 * AI operation error
 */
export interface AIError {
  /** Error type */
  type: AIErrorType;
  /** Error message */
  message: string;
  /** Original error object */
  originalError?: any;
  /** Whether operation is retryable */
  retryable: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * AI response cache entry
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl: number;
}

/**
 * Translation result
 */
export interface TranslationResult {
  /** Original text */
  originalText: string;
  /** Translated text */
  translatedText: string;
  /** Source language */
  sourceLanguage: LanguageCode;
  /** Target language */
  targetLanguage: LanguageCode;
  /** Confidence score (0-1) */
  confidence?: number;
}

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  /** Detected language code */
  language: LanguageCode;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Cultural context hint category
 */
export type ContextHintCategory =
  | 'holiday'      // Holidays and festivals
  | 'idiom'        // Idioms and expressions
  | 'custom'       // Cultural customs and traditions
  | 'historical'   // Historical references
  | 'norm';        // Cultural norms (greetings, formality, etc.)

/**
 * Cultural context hint
 */
export interface ContextHint {
  /** Unique identifier for the hint */
  id: string;
  /** Message ID this hint is associated with */
  messageId: string;
  /** The cultural phrase or reference */
  phrase: string;
  /** Explanation of what it means */
  explanation: string;
  /** Cultural background and significance */
  culturalBackground: string;
  /** Category of the cultural reference */
  category: ContextHintCategory;
  /** Start position of phrase in message (for highlighting) */
  startIndex: number;
  /** End position of phrase in message (for highlighting) */
  endIndex: number;
  /** Whether user has seen this hint */
  seen?: boolean;
  /** Timestamp when hint was created */
  timestamp?: number;
}

/**
 * Formality levels from very informal to very formal
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
export interface FormalityDetectionResult {
  /** Detected formality level */
  level: FormalityLevel;
  /** Confidence score (0-1) */
  confidence: number;
  /** Brief explanation of the rating */
  explanation: string;
}

/**
 * Formality adjustment result
 */
export interface FormalityAdjustmentResult {
  /** Original text */
  originalText: string;
  /** Adjusted text */
  adjustedText: string;
  /** Changes made during adjustment */
  changes: string[];
  /** Source formality level */
  fromLevel: FormalityLevel;
  /** Target formality level */
  toLevel: FormalityLevel;
}

/**
 * Slang or idiom item category
 */
export type SlangCategory =
  | 'slang'           // Informal vocabulary
  | 'idiom'           // Figurative expressions
  | 'colloquialism'   // Regional phrases
  | 'internet-slang'; // Online/text abbreviations (LOL, FOMO, etc.)

/**
 * Slang or idiom detection item
 */
export interface SlangItem {
  /** Unique identifier for the slang item */
  id: string;
  /** Message ID this slang is associated with */
  messageId: string;
  /** The slang phrase or idiom */
  phrase: string;
  /** Word-for-word/literal meaning */
  literal: string;
  /** What it actually means */
  actual: string;
  /** Example sentence showing usage */
  usage: string;
  /** Formality notes (when to use/avoid) */
  formality: string;
  /** Category of slang */
  category: SlangCategory;
  /** Regions where it's common (e.g., ['US', 'UK']) */
  regions?: string[];
  /** Language of the slang phrase */
  language: LanguageCode;
  /** Start position of phrase in message (for highlighting) */
  startIndex: number;
  /** End position of phrase in message (for highlighting) */
  endIndex: number;
  /** Whether user has marked as known */
  known?: boolean;
  /** Timestamp when item was created */
  timestamp?: number;
}

/**
 * Reply type for smart suggestions
 */
export type ReplyType =
  | 'agree'         // Agreement/affirmation
  | 'question'      // Follow-up question
  | 'continue'      // Continue conversation
  | 'polite-close'  // Polite conversation closer
  | 'enthusiasm';   // Enthusiastic response

/**
 * Smart reply suggestion
 */
export interface Reply {
  /** Suggested reply text */
  text: string;
  /** Type of reply */
  type: ReplyType;
  /** Language of the reply */
  language: LanguageCode;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * User style profile for personalizing smart replies
 */
export interface UserStyleProfile {
  /** User ID this profile belongs to */
  userId: string;
  /** Chat ID this profile is for (per-conversation) */
  chatId: string;
  /** Common phrases the user frequently uses */
  commonPhrases: string[];
  /** Average message length in words */
  averageMessageLength: number;
  /** User's typical formality level */
  formalityPreference: FormalityLevel;
  /** Emoji usage patterns */
  emojiUsage: {
    /** Average emojis per message */
    frequency: number;
    /** Most frequently used emojis */
    favorites: string[];
  };
  /** Language mixing patterns */
  languageMixing: {
    /** Primary language */
    primary: LanguageCode;
    /** Secondary languages (if user code-switches) */
    secondary?: LanguageCode[];
    /** Code-switching patterns (e.g., "starts EN, ends ES") */
    switchingPatterns: string[];
  };
  /** Conversation style */
  conversationStyle: 'terse' | 'detailed' | 'balanced';
  /** Punctuation style patterns */
  punctuationStyle: {
    /** Uses periods at end of messages */
    usesPeriods: boolean;
    /** Uses exclamation marks frequently */
    usesExclamation: boolean;
    /** Uses question marks frequently */
    usesQuestions: boolean;
  };
  /** Common greeting phrases */
  greetingStyle: string[];
  /** Common closing phrases */
  closingStyle: string[];
  /** When this profile was last updated */
  lastUpdated: number;
  /** Number of messages analyzed for this profile */
  messageCount: number;
}

/**
 * Options for smart reply generation
 */
export interface SmartReplyOptions {
  /** Number of replies to generate (default: 3) */
  count?: number;
  /** Context window (number of recent messages to consider) */
  contextWindow?: number;
  /** Whether to force regeneration (bypass cache) */
  forceRegenerate?: boolean;
  /** Target language for replies (overrides user's primary) */
  targetLanguage?: LanguageCode;
}
