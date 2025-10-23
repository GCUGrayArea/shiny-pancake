/**
 * OpenAI Client Wrapper
 * Handles all OpenAI API interactions with error handling and retry logic
 */

import OpenAI from 'openai';
import { AICompletionOptions, AIResponse, AIError, AIErrorType } from './types';

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

let openaiClient: OpenAI | null = null;

/**
 * Get configuration from environment variables (evaluated at runtime)
 */
function getConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  };
}

/**
 * Initialize OpenAI client
 */
export function initializeClient(): OpenAI {
  if (!openaiClient) {
    const config = getConfig();

    if (!config.apiKey) {
      throw createAIError(
        'OpenAI API key not configured',
        'api_error',
        false
      );
    }

    openaiClient = new OpenAI({
      apiKey: config.apiKey,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  return openaiClient;
}

/**
 * Get OpenAI client instance
 */
export function getClient(): OpenAI {
  if (!openaiClient) {
    return initializeClient();
  }
  return openaiClient;
}

/**
 * Create an AI error
 */
function createAIError(
  message: string,
  type: AIErrorType,
  retryable: boolean,
  originalError?: Error
): AIError {
  const error = new Error(message) as AIError;
  error.type = type;
  error.retryable = retryable;
  error.originalError = originalError;
  return error;
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call OpenAI completion with retry logic
 */
export async function callCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: AICompletionOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  const client = getClient();
  const config = getConfig();

  const {
    temperature = config.temperature,
    maxTokens = config.maxTokens,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Exponential backoff for retries
      if (attempt > 0) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      const completion = await Promise.race([
        client.chat.completions.create({
          model: config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            timeout
          )
        ),
      ]);

      const content = completion.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;

      return {
        content,
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        responseTime,
      };
    } catch (error) {
      lastError = error as Error;

      // Determine error type and if retryable
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          // Timeout errors are retryable
          continue;
        }

        if (error.message.includes('rate limit')) {
          // Rate limit - wait longer
          await sleep(5000);
          continue;
        }

        // API errors might be retryable
        if (attempt < MAX_RETRIES - 1) {
          continue;
        }
      }

      break;
    }
  }

  // All retries failed
  const errorMessage = lastError?.message || 'Unknown error';

  if (errorMessage.includes('timeout')) {
    throw createAIError('Request timed out', 'timeout', true, lastError!);
  }

  if (errorMessage.includes('rate limit')) {
    throw createAIError('Rate limit exceeded', 'rate_limit', true, lastError!);
  }

  if (errorMessage.includes('network')) {
    throw createAIError('Network error', 'network_error', true, lastError!);
  }

  throw createAIError(
    `OpenAI API error: ${errorMessage}`,
    'api_error',
    false,
    lastError!
  );
}

/**
 * Call OpenAI completion with streaming
 */
export async function* callStream(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: AICompletionOptions = {}
): AsyncGenerator<string> {
  const client = getClient();
  const config = getConfig();

  const {
    temperature = config.temperature,
    maxTokens = config.maxTokens,
  } = options;

  try {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    const err = error as Error;
    throw createAIError(
      `Streaming error: ${err.message}`,
      'api_error',
      false,
      err
    );
  }
}

/**
 * Estimate token count for text (rough approximation)
 * Rule of thumb: ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if client is initialized
 */
export function isClientInitialized(): boolean {
  return openaiClient !== null;
}

/**
 * Reset client (useful for testing)
 */
export function resetClient(): void {
  openaiClient = null;
}
