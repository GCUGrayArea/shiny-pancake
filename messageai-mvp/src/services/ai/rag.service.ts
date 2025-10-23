/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles conversation context retrieval and formatting for LLM consumption
 */

import { Message } from '../../types';
import { getMessagesByChat } from '../local-message.service';
import { getUsers } from '../local-user.service';
import type { RAGContext } from './types';
import { estimateTokens } from './ai-client';

/**
 * Maximum number of messages to retrieve for context
 */
const DEFAULT_CONTEXT_LIMIT = 50;

/**
 * Maximum tokens allowed in context (leaving room for prompt and response)
 */
const MAX_CONTEXT_TOKENS = 3000;

/**
 * Get conversation context for RAG pipeline
 * Retrieves recent messages from a chat and formats them for LLM
 */
export async function getConversationContext(
  chatId: string,
  limit: number = DEFAULT_CONTEXT_LIMIT
): Promise<RAGContext> {
  // Retrieve messages from local database
  const messagesResult = await getMessagesByChat(chatId, limit, 0);

  if (!messagesResult.success || !messagesResult.data) {
    return {
      messages: [],
      messageCount: 0,
      estimatedTokens: 0,
    };
  }

  const messages = messagesResult.data;

  // Reverse to get chronological order (oldest first)
  const chronologicalMessages = messages.reverse();

  // Get unique sender IDs
  const senderIds = [...new Set(messages.map(m => m.senderId))];

  // Fetch user information for all senders
  const usersResult = await getUsers(senderIds);
  const users = usersResult.success && usersResult.data ? usersResult.data : [];

  // Create user lookup map
  const userMap = new Map(users.map(u => [u.uid, u]));

  // Format messages for context
  const formattedMessages = chronologicalMessages.map(msg => ({
    senderName: userMap.get(msg.senderId)?.displayName || 'Unknown',
    content: formatMessageContent(msg),
    timestamp: msg.timestamp,
    type: msg.type,
  }));

  // Calculate estimated tokens
  const contextText = formattedMessages
    .map(m => `${m.senderName}: ${m.content}`)
    .join('\n');
  const estimatedTokenCount = estimateTokens(contextText);

  return {
    messages: formattedMessages,
    messageCount: formattedMessages.length,
    estimatedTokens: estimatedTokenCount,
  };
}

/**
 * Format message content based on type
 */
function formatMessageContent(message: Message): string {
  if (message.type === 'text') {
    return message.content;
  }

  // Image messages
  if (message.type === 'image') {
    if (message.caption) {
      return `[Image: ${message.caption}]`;
    }
    return '[Image]';
  }

  return message.content;
}

/**
 * Format messages as conversation string for LLM
 * Creates a readable conversation format
 */
export function formatMessagesForLLM(
  messages: RAGContext['messages'],
  includeTimestamps: boolean = false
): string {
  if (messages.length === 0) {
    return 'No previous messages in this conversation.';
  }

  return messages
    .map(msg => {
      const timestamp = includeTimestamps
        ? ` [${new Date(msg.timestamp).toLocaleString()}]`
        : '';
      return `${msg.senderName}${timestamp}: ${msg.content}`;
    })
    .join('\n');
}

/**
 * Build a complete context prompt for LLM
 * Combines system instructions, conversation context, and user query
 */
export function buildContextPrompt(
  query: string,
  context: RAGContext,
  systemInstructions?: string
): string {
  const conversationText = formatMessagesForLLM(context.messages);

  const parts: string[] = [];

  if (systemInstructions) {
    parts.push(systemInstructions);
    parts.push('');
  }

  parts.push('Conversation history:');
  parts.push(conversationText);
  parts.push('');
  parts.push(`User query: ${query}`);

  return parts.join('\n');
}

/**
 * Trim context to fit within token limit
 * Removes oldest messages first to stay under limit
 */
export function trimContextToTokenLimit(
  context: RAGContext,
  maxTokens: number = MAX_CONTEXT_TOKENS
): RAGContext {
  if (context.estimatedTokens <= maxTokens) {
    return context;
  }

  // Remove messages from the beginning (oldest) until we're under the limit
  let trimmedMessages = [...context.messages];
  let currentTokens = context.estimatedTokens;

  while (currentTokens > maxTokens && trimmedMessages.length > 0) {
    const removedMessage = trimmedMessages.shift()!;
    const removedText = `${removedMessage.senderName}: ${removedMessage.content}\n`;
    currentTokens -= estimateTokens(removedText);
  }

  // Recalculate exact token count
  const contextText = trimmedMessages
    .map(m => `${m.senderName}: ${m.content}`)
    .join('\n');

  return {
    messages: trimmedMessages,
    messageCount: trimmedMessages.length,
    estimatedTokens: estimateTokens(contextText),
  };
}

/**
 * Get recent messages for a specific user across all their chats
 * Useful for learning user's communication style
 */
export async function getUserMessageHistory(
  userId: string,
  chatIds: string[],
  limit: number = 100
): Promise<Message[]> {
  const allMessages: Message[] = [];

  // Fetch messages from each chat
  for (const chatId of chatIds) {
    const result = await getMessagesByChat(chatId, limit, 0);
    if (result.success && result.data) {
      // Filter for messages sent by the user
      const userMessages = result.data.filter(m => m.senderId === userId);
      allMessages.push(...userMessages);
    }
  }

  // Sort by timestamp (newest first)
  allMessages.sort((a, b) => b.timestamp - a.timestamp);

  // Return most recent messages up to limit
  return allMessages.slice(0, limit);
}

/**
 * Extract text content from messages
 * Useful for analyzing user's writing style
 */
export function extractTextContent(messages: Message[]): string[] {
  return messages
    .filter(m => m.type === 'text')
    .map(m => m.content);
}

/**
 * Calculate average message length for a user
 */
export function calculateAverageMessageLength(messages: Message[]): number {
  const textMessages = messages.filter(m => m.type === 'text');

  if (textMessages.length === 0) {
    return 0;
  }

  const totalLength = textMessages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.round(totalLength / textMessages.length);
}
