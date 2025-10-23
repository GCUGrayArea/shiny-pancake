/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles conversation context retrieval and formatting for AI agents
 */

import { Message, User } from '../../types';
import { ConversationContext, FormattedContext, LanguageCode } from './types';
import { estimateTokens } from './ai-client';
import { getMessagesByChat } from '../local-message.service';
import { getUser } from '../local-user.service';

// Token limits for context window management
const MAX_CONTEXT_TOKENS = 3000;
const AVERAGE_MESSAGE_TOKENS = 50;

/**
 * Get conversation context from local database
 * Retrieves recent messages and participant information
 */
export async function getConversationContext(
  chatId: string,
  limit: number = 50
): Promise<ConversationContext> {
  try {
    // Get recent messages from local database
    const messagesResult = await getMessagesByChat(chatId, limit);

    if (!messagesResult.success || !messagesResult.data) {
      throw new Error(messagesResult.error || 'Failed to get messages');
    }

    const messages = messagesResult.data;

    // Get unique participant IDs
    const participantIds = Array.from(
      new Set(messages.map((msg: Message) => msg.senderId))
    );

    // Fetch participant user data
    const participants: User[] = [];
    for (const userId of participantIds) {
      try {
        const userResult = await getUser(userId);
        if (userResult.success && userResult.data) {
          participants.push(userResult.data);
        }
      } catch (error) {
        console.warn(`Failed to load user ${userId}:`, error);
      }
    }

    return {
      chatId,
      messages,
      participants,
      totalMessages: messages.length,
    };
  } catch (error) {
    console.error('Failed to get conversation context:', error);
    throw error;
  }
}

/**
 * Format messages for LLM consumption
 * Converts messages into a readable conversation format
 */
export function formatMessagesForLLM(
  messages: Message[],
  participants: User[]
): string {
  // Create a map for quick user lookup
  const userMap = new Map<string, User>();
  participants.forEach((user) => userMap.set(user.uid, user));

  // Format each message
  const formattedMessages = messages.map((msg) => {
    const sender = userMap.get(msg.senderId);
    const senderName = sender?.displayName || 'Unknown';

    // Format based on message type
    if (msg.type === 'image') {
      return `${senderName}: [image${msg.content ? ': ' + msg.content : ''}]`;
    }

    return `${senderName}: ${msg.content}`;
  });

  return formattedMessages.join('\n');
}

/**
 * Build context prompt for AI agents
 * Combines query with conversation context
 */
export function buildContextPrompt(
  query: string,
  context: ConversationContext,
  systemInstructions: string = ''
): FormattedContext {
  const conversationHistory = formatMessagesForLLM(
    context.messages,
    context.participants
  );

  // Estimate tokens
  const systemTokens = estimateTokens(systemInstructions);
  const queryTokens = estimateTokens(query);
  const contextTokens = estimateTokens(conversationHistory);
  const totalTokens = systemTokens + queryTokens + contextTokens;

  // Truncate context if needed
  let finalContext = conversationHistory;
  if (totalTokens > MAX_CONTEXT_TOKENS) {
    // Keep most recent messages that fit
    const availableTokens =
      MAX_CONTEXT_TOKENS - systemTokens - queryTokens;
    const messagesToKeep = Math.floor(
      availableTokens / AVERAGE_MESSAGE_TOKENS
    );

    const recentMessages = context.messages.slice(-messagesToKeep);
    finalContext = formatMessagesForLLM(
      recentMessages,
      context.participants
    );
  }

  return {
    systemPrompt: systemInstructions,
    conversationHistory: finalContext,
    estimatedTokens: estimateTokens(
      systemInstructions + query + finalContext
    ),
  };
}

/**
 * Build system prompt for translation agent
 */
export function buildTranslationSystemPrompt(
  fromLang: LanguageCode,
  toLang: LanguageCode
): string {
  return `You are a professional translator specializing in natural, fluent translations.
Your task is to translate text from ${fromLang} to ${toLang}.

Guidelines:
- Preserve the original meaning and tone precisely
- Maintain formatting (line breaks, emphasis, bullet points)
- Keep emojis unchanged
- Produce natural, idiomatic translations
- Preserve formality level

Respond ONLY with the translated text, no explanations.`;
}

/**
 * Build system prompt for language detection
 */
export function buildLanguageDetectionPrompt(): string {
  return `You are a language detection expert.
Analyze the given text and identify its primary language.

Respond with ONLY the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'zh').
If the language cannot be determined with confidence, respond with 'unknown'.`;
}

/**
 * Build system prompt for cultural context analysis
 */
export function buildCulturalContextPrompt(): string {
  return `You are a cultural expert and educator.
Your task is to identify cultural references in messages that may need explanation.

Look for:
- Holidays and festivals
- Idioms and proverbs
- Cultural customs and traditions
- Historical references
- Social norms and etiquette

For each cultural reference, provide:
1. The specific phrase or reference
2. A clear explanation of what it means
3. Cultural background and significance
4. Category (holiday, idiom, custom, historical, norm, or slang)

Only identify references that non-native speakers might not understand.
Respond in valid JSON format: {"hints": [{"phrase": "...", "explanation": "...", "culturalBackground": "...", "category": "..."}]}`;
}

/**
 * Build system prompt for formality detection
 */
export function buildFormalityDetectionPrompt(
  language: LanguageCode
): string {
  return `You are a linguistic expert specializing in formality analysis.
Analyze the given ${language} text and determine its formality level.

Formality levels:
- very-informal: Slang, casual abbreviations, very relaxed
- informal: Casual but complete sentences, friendly tone
- neutral: Standard, balanced tone
- formal: Professional, polite, proper grammar
- very-formal: Official, ceremonial, highly respectful

Consider cultural norms for ${language}.

Respond in JSON format: {"level": "...", "confidence": 0.0-1.0}`;
}

/**
 * Build system prompt for formality adjustment
 */
export function buildFormalityAdjustmentPrompt(
  targetLevel: string,
  language: LanguageCode
): string {
  return `You are a professional writing assistant.
Transform the given ${language} text to a ${targetLevel} formality level.

Guidelines:
- Preserve the exact meaning
- Adjust vocabulary, grammar, and tone appropriately
- Maintain cultural appropriateness for ${language}
- Keep the message natural and authentic

Respond ONLY with the adjusted text, no explanations.`;
}

/**
 * Build system prompt for smart reply generation
 */
export function buildSmartReplyPrompt(
  userStyle: string,
  language: LanguageCode
): string {
  return `You are a helpful AI assistant generating reply suggestions.

User communication style:
${userStyle}

Generate 3-4 diverse, contextually appropriate reply options in ${language}.

Types of replies to consider:
- Agreement/acknowledgment
- Follow-up question
- Continue the conversation
- Polite closing

Each reply should:
- Match the user's typical style and formality
- Be natural and authentic
- Be concise (1-2 sentences)
- Fit the conversation context

Respond in JSON format: {"replies": [{"text": "...", "type": "agree|question|continue|polite-close|casual"}]}`;
}

/**
 * Extract language code from text
 * Helper to parse language detection responses
 */
export function extractLanguageCode(response: string): LanguageCode {
  const cleaned = response.trim().toLowerCase();

  // List of valid codes
  const validCodes: LanguageCode[] = [
    'en',
    'es',
    'fr',
    'de',
    'it',
    'pt',
    'zh',
    'ja',
    'ko',
    'ar',
    'ru',
    'hi',
    'nl',
    'sv',
    'pl',
    'tr',
    'vi',
    'th',
    'id',
  ];

  // Check if response is a valid code
  if (validCodes.includes(cleaned as LanguageCode)) {
    return cleaned as LanguageCode;
  }

  return 'unknown';
}
