/**
 * Message-related tools for AI function calling
 * These tools allow AI agents to access conversation context
 */

import { getMessagesByChat } from '../../local-message.service';
import { Message } from '../../../types';

/**
 * Function calling tool schema for getting message history
 */
export const getMessageHistoryTool = {
  type: 'function' as const,
  function: {
    name: 'get_message_history',
    description:
      'Retrieve recent messages from a conversation for context',
    parameters: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'The unique identifier for the chat/conversation',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of messages to retrieve (default: 50)',
          default: 50,
        },
      },
      required: ['chatId'],
    },
  },
};

/**
 * Execute get_message_history tool
 */
export async function executeGetMessageHistory(
  chatId: string,
  limit: number = 50
): Promise<Message[]> {
  try {
    const result = await getMessagesByChat(chatId, limit);
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Failed to get message history:', error);
    return [];
  }
}

/**
 * Get last message from conversation
 */
export const getLastMessageTool = {
  type: 'function' as const,
  function: {
    name: 'get_last_message',
    description: 'Get the most recent message from a conversation',
    parameters: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'The unique identifier for the chat',
        },
      },
      required: ['chatId'],
    },
  },
};

/**
 * Execute get_last_message tool
 */
export async function executeGetLastMessage(
  chatId: string
): Promise<Message | null> {
  try {
    const result = await getMessagesByChat(chatId, 1);
    if (result.success && result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error('Failed to get last message:', error);
    return null;
  }
}

/**
 * All message tools
 */
export const messageTools = [getMessageHistoryTool, getLastMessageTool];

/**
 * Execute a message tool by name
 */
export async function executeMessageTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case 'get_message_history':
      return executeGetMessageHistory(args.chatId, args.limit);
    case 'get_last_message':
      return executeGetLastMessage(args.chatId);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
