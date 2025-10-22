/**
 * Local Chat Storage Service
 * Handles CRUD operations for chats and participants in SQLite
 */

import { Chat, LastMessage } from '../types';
import {
  executeQuery,
  executeQueryFirst,
  executeUpdate,
  executeTransaction,
  DbResult,
} from './database.service';

/**
 * Save a chat to local database
 */
export async function saveChat(chat: Chat): Promise<DbResult<void>> {
  try {
    const queries = [];

    // Insert or update chat
    const chatSql = `
      INSERT OR REPLACE INTO chats (
        id, type, name, createdAt, lastMessageContent,
        lastMessageSenderId, lastMessageTimestamp, lastMessageType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    queries.push({
      sql: chatSql,
      params: [
        chat.id,
        chat.type,
        chat.name ?? null,
        chat.createdAt,
        chat.lastMessage?.content ?? null,
        chat.lastMessage?.senderId ?? null,
        chat.lastMessage?.timestamp ?? null,
        chat.lastMessage?.type ?? null,
      ],
    });

    // Delete existing participants
    queries.push({
      sql: 'DELETE FROM chat_participants WHERE chatId = ?',
      params: [chat.id],
    });

    // Insert participants
    for (const userId of chat.participantIds) {
      queries.push({
        sql: `INSERT INTO chat_participants (chatId, userId, unreadCount) VALUES (?, ?, ?)`,
        params: [chat.id, userId, chat.unreadCounts?.[userId] ?? 0],
      });
    }

    try {
      const result = await executeTransaction(queries);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in saveChat:', error);
      return {
        success: false,
        error: `Failed to save chat: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to save chat: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a chat by ID
 */
export async function getChat(chatId: string): Promise<DbResult<Chat | null>> {
  try {
    const chatSql = 'SELECT * FROM chats WHERE id = ?';
    const chatResult = await executeQueryFirst<any>(chatSql, [chatId]);

    if (!chatResult.success) {
      return { success: false, error: chatResult.error };
    }

    if (!chatResult.data) {
      return { success: true, data: null };
    }

    const participantsSql = 'SELECT userId, unreadCount FROM chat_participants WHERE chatId = ?';
    const participantsResult = await executeQuery<any>(participantsSql, [chatId]);

    if (!participantsResult.success) {
      return { success: false, error: participantsResult.error };
    }

    const chat = mapRowToChat(chatResult.data, participantsResult.data ?? []);
    return { success: true, data: chat };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get chat: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all chats for a specific user (security: only return chats where user is a participant)
 */
export async function getAllChats(userId?: string): Promise<DbResult<Chat[]>> {
  try {
    let sql;
    let params: any[] = [];

    if (userId) {
      // Filter by user participation (secure)
      sql = `
        SELECT DISTINCT c.*
        FROM chats c
        INNER JOIN chat_participants cp ON c.id = cp.chatId
        WHERE cp.userId = ?
        ORDER BY c.lastMessageTimestamp DESC
      `;
      params = [userId];
    } else {
      // For backward compatibility, but this should not be used in production
      console.warn('⚠️ getAllChats called without userId - this may show chats user is not part of');
      sql = `
        SELECT DISTINCT c.*
        FROM chats c
        ORDER BY c.lastMessageTimestamp DESC
      `;
    }

    const chatsResult = await executeQuery<any>(sql, params);

    if (!chatsResult.success) {
      return { success: false, error: chatsResult.error };
    }

    const chats: Chat[] = [];

    for (const row of chatsResult.data ?? []) {
      const participantsSql = 'SELECT userId, unreadCount FROM chat_participants WHERE chatId = ?';
      const participantsResult = await executeQuery<any>(participantsSql, [row.id]);

      if (!participantsResult.success) {
        continue;
      }

      chats.push(mapRowToChat(row, participantsResult.data ?? []));
    }

    return { success: true, data: chats };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get all chats: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update chat's last message
 */
export async function updateChatLastMessage(
  chatId: string,
  message: LastMessage
): Promise<DbResult<void>> {
  try {
    const sql = `
      UPDATE chats
      SET lastMessageContent = ?,
          lastMessageSenderId = ?,
          lastMessageTimestamp = ?,
          lastMessageType = ?
      WHERE id = ?
    `;

    const params = [
      message.content,
      message.senderId,
      message.timestamp,
      message.type,
      chatId,
    ];

    const result = await executeUpdate(sql, params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update last message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<DbResult<void>> {
  try {
    const sql = 'DELETE FROM chats WHERE id = ?';
    const result = await executeUpdate(sql, [chatId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete chat: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Add a participant to a chat
 */
export async function addParticipant(
  chatId: string,
  userId: string
): Promise<DbResult<void>> {
  try {
    const sql = `
      INSERT OR IGNORE INTO chat_participants (chatId, userId, unreadCount)
      VALUES (?, ?, 0)
    `;

    const result = await executeUpdate(sql, [chatId, userId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add participant: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Remove a participant from a chat
 */
export async function removeParticipant(
  chatId: string,
  userId: string
): Promise<DbResult<void>> {
  try {
    const sql = 'DELETE FROM chat_participants WHERE chatId = ? AND userId = ?';
    const result = await executeUpdate(sql, [chatId, userId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to remove participant: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get unread count for a chat and user
 */
export async function getUnreadCount(
  chatId: string,
  userId: string
): Promise<DbResult<number>> {
  try {
    const sql = `
      SELECT unreadCount
      FROM chat_participants
      WHERE chatId = ? AND userId = ?
    `;

    const result = await executeQueryFirst<{ unreadCount: number }>(sql, [chatId, userId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data?.unreadCount ?? 0 };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get unread count: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update unread count for a chat and user
 */
export async function updateUnreadCount(
  chatId: string,
  userId: string,
  count: number
): Promise<DbResult<void>> {
  try {
    const sql = `
      UPDATE chat_participants
      SET unreadCount = ?
      WHERE chatId = ? AND userId = ?
    `;

    const result = await executeUpdate(sql, [count, chatId, userId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update unread count: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Reset unread count to zero for a chat and user
 */
export async function resetUnreadCount(
  chatId: string,
  userId: string
): Promise<DbResult<void>> {
  return updateUnreadCount(chatId, userId, 0);
}

/**
 * Map database row to Chat object
 */
function mapRowToChat(chatRow: any, participantRows: any[]): Chat {
  const participantIds = participantRows.map((p) => p.userId);
  const unreadCounts: { [userId: string]: number } = {};

  participantRows.forEach((p) => {
    unreadCounts[p.userId] = p.unreadCount;
  });

  const chat: Chat = {
    id: chatRow.id,
    type: chatRow.type,
    participantIds,
    createdAt: chatRow.createdAt,
    unreadCounts,
  };

  if (chatRow.name) {
    chat.name = chatRow.name;
  }

  if (chatRow.lastMessageContent) {
    chat.lastMessage = {
      content: chatRow.lastMessageContent,
      senderId: chatRow.lastMessageSenderId,
      timestamp: chatRow.lastMessageTimestamp,
      type: chatRow.lastMessageType,
    };
  }

  return chat;
}
