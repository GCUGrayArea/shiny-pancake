/**
 * Message-related function calling tools for OpenAI
 * Provides tools for retrieving and analyzing message history
 */

import type { FunctionTool, FunctionHandler } from '../types';
import { getConversationContext, formatMessagesForLLM } from '../rag.service';

/**
 * Tool definition: Get message history
 * Retrieves recent messages from a conversation
 */
export const getMessageHistoryTool: FunctionTool = {
  type: 'function',
  function: {
    name: 'get_message_history',
    description: 'Retrieve recent messages from a conversation to understand context',
    parameters: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'The unique identifier of the chat/conversation',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to retrieve (default: 50, max: 100)',
        },
      },
      required: ['chatId'],
    },
  },
};

/**
 * Handler: Get message history
 */
export const getMessageHistoryHandler: FunctionHandler = async (args: {
  chatId: string;
  limit?: number;
}) => {
  const { chatId, limit = 50 } = args;

  // Validate limit
  const validLimit = Math.min(Math.max(1, limit), 100);

  // Get conversation context
  const context = await getConversationContext(chatId, validLimit);

  // Format messages for LLM
  const formattedMessages = formatMessagesForLLM(context.messages, true);

  return {
    chatId,
    messageCount: context.messageCount,
    estimatedTokens: context.estimatedTokens,
    messages: formattedMessages,
  };
};

/**
 * Tool definition: Analyze conversation tone
 * Analyzes the overall tone and formality of a conversation
 */
export const analyzeConversationToneTool: FunctionTool = {
  type: 'function',
  function: {
    name: 'analyze_conversation_tone',
    description: 'Analyze the tone and formality level of recent messages in a conversation',
    parameters: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'The unique identifier of the chat/conversation',
        },
        messageLimit: {
          type: 'number',
          description: 'Number of recent messages to analyze (default: 20)',
        },
      },
      required: ['chatId'],
    },
  },
};

/**
 * Handler: Analyze conversation tone
 */
export const analyzeConversationToneHandler: FunctionHandler = async (args: {
  chatId: string;
  messageLimit?: number;
}) => {
  const { chatId, messageLimit = 20 } = args;

  // Get conversation context
  const context = await getConversationContext(chatId, messageLimit);

  // Return conversation data for analysis
  return {
    chatId,
    messageCount: context.messageCount,
    messages: context.messages.map(m => ({
      sender: m.senderName,
      content: m.content,
      type: m.type,
    })),
  };
};

/**
 * All message tools
 */
export const messageTools: FunctionTool[] = [
  getMessageHistoryTool,
  analyzeConversationToneTool,
];

/**
 * Message tool handlers mapped by function name
 */
export const messageToolHandlers: Record<string, FunctionHandler> = {
  get_message_history: getMessageHistoryHandler,
  analyze_conversation_tone: analyzeConversationToneHandler,
};
