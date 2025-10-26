/**
 * AI Error Handler Service
 * Centralized error handling for all AI operations
 * Provides user-friendly messages, retry logic, and graceful degradation
 */

export enum AIErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  API_ERROR = "API_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AIError {
  type: AIErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  originalError?: any;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number; // exponential backoff
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

/**
 * Parse and classify AI errors
 */
export function parseAIError(error: any): AIError {
  // Network errors
  if (error.message?.includes("network") || error.code === "ENOTFOUND") {
    return {
      type: AIErrorType.NETWORK_ERROR,
      message: "Network connection failed",
      userMessage: "Unable to connect. Please check your internet connection.",
      retryable: true,
      originalError: error,
    };
  }

  // Rate limiting
  if (error.status === 429 || error.message?.includes("rate limit")) {
    return {
      type: AIErrorType.RATE_LIMIT,
      message: "API rate limit exceeded",
      userMessage: "Too many requests. Please wait a moment and try again.",
      retryable: true,
      originalError: error,
    };
  }

  // Timeout errors
  if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
    return {
      type: AIErrorType.TIMEOUT,
      message: "Request timed out",
      userMessage: "Request took too long. Please try again.",
      retryable: true,
      originalError: error,
    };
  }

  // Invalid response
  if (error.status === 400 || error.message?.includes("invalid")) {
    return {
      type: AIErrorType.INVALID_RESPONSE,
      message: "Invalid response from AI service",
      userMessage: "Something went wrong. Please try again.",
      retryable: false,
      originalError: error,
    };
  }

  // API errors (5xx)
  if (error.status >= 500) {
    return {
      type: AIErrorType.API_ERROR,
      message: "AI service error",
      userMessage: "Service temporarily unavailable. Please try again later.",
      retryable: true,
      originalError: error,
    };
  }

  // Unknown errors
  return {
    type: AIErrorType.UNKNOWN_ERROR,
    message: error.message || "Unknown error occurred",
    userMessage: "Something went wrong. Please try again.",
    retryable: false,
    originalError: error,
  };
}

/**
 * Execute an AI operation with automatic retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const aiError = parseAIError(error);

      // Don't retry if not retryable
      if (!aiError.retryable) {
        throw aiError;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxRetries) {
        throw aiError;
      }

      // Wait before retrying (exponential backoff)
      const delay =
        retryConfig.retryDelay *
        Math.pow(retryConfig.backoffMultiplier, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw parseAIError(lastError);
}

/**
 * Execute AI operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000,
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs),
    ),
  ]);
}

/**
 * Graceful fallback for AI operations
 * Returns null on error instead of throwing
 */
export async function withGracefulFallback<T>(
  operation: () => Promise<T>,
  fallback: T | null = null,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.warn(
      "AI operation failed gracefully:",
      parseAIError(error).message,
    );
    return fallback;
  }
}

/**
 * Log AI errors for debugging and monitoring
 */
export function logAIError(error: AIError, context?: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[AI Error ${timestamp}] ${context ? `[${context}] ` : ""}${error.type}: ${error.message}`;

  console.error(logMessage);

  // In production, you might want to send this to a logging service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: any): string {
  const aiError = parseAIError(error);
  return aiError.userMessage;
}
