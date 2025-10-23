/**
 * OpenAI Client Wrapper
 * Provides a clean interface to OpenAI API with error handling, retry logic, and streaming
 */

import OpenAI from 'openai';
import type {
  OpenAIConfig,
  CompletionOptions,
  ChatMessage,
  AIError,
  RetryConfig,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
  model: 'gpt-4-turbo',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000, // 30 seconds
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * OpenAI client singleton
 */
let openaiClient: OpenAI | null = null;
let currentConfig: OpenAIConfig | null = null;

/**
 * Initialize the OpenAI client
 * Must be called before using other functions
 */
export function initializeClient(config: OpenAIConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  currentConfig = { ...DEFAULT_CONFIG, ...config };

  openaiClient = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeout || DEFAULT_CONFIG.timeout,
    maxRetries: 0, // We handle retries manually
  });

  return openaiClient;
}

/**
 * Get the current OpenAI client instance
 */
export function getClient(): OpenAI {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Call initializeClient() first.');
  }
  return openaiClient;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Convert error to AIError format
 */
function toAIError(error: any): AIError {
  // OpenAI API errors
  if (error?.error?.type) {
    const errorType = error.error.type;
    return {
      type: errorType.includes('rate_limit') ? 'rate_limit' :
            errorType.includes('auth') ? 'auth_error' :
            errorType.includes('invalid') ? 'invalid_request' : 'api_error',
      message: error.error.message || 'OpenAI API error',
      originalError: error,
      retryable: errorType.includes('rate_limit') || errorType.includes('server'),
    };
  }

  // Timeout errors
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out',
      originalError: error,
      retryable: true,
    };
  }

  // Network errors
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return {
      type: 'network_error',
      message: 'Network error',
      originalError: error,
      retryable: true,
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: error?.message || 'Unknown error',
    originalError: error,
    retryable: false,
  };
}

/**
 * Execute function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = toAIError(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      const delay = getRetryDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Call OpenAI completion API
 * Returns the complete response text
 */
export async function callCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const client = getClient();
  const config = currentConfig!;

  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model: options.model || config.model || DEFAULT_CONFIG.model!,
      messages: messages as any,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? config.temperature,
      tools: options.tools as any,
      tool_choice: options.toolChoice as any,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content;
  });
}

/**
 * Call OpenAI completion API with streaming
 * Returns an async generator that yields chunks of text
 */
export async function* callStream(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): AsyncGenerator<string> {
  const client = getClient();
  const config = currentConfig!;

  const stream = await withRetry(async () => {
    return client.chat.completions.create({
      model: options.model || config.model || DEFAULT_CONFIG.model!,
      messages: messages as any,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? config.temperature,
      stream: true,
    });
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Estimate token count for text
 * Uses rough approximation: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if client is initialized
 */
export function isInitialized(): boolean {
  return openaiClient !== null;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  openaiClient = null;
  currentConfig = null;
}
