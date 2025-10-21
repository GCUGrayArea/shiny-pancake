/**
 * Local Message Storage Service
 * Handles CRUD operations for messages and delivery tracking in SQLite
 */

import { Message, DeliveryStatus } from '../types';
import {
  executeQuery,
  executeQueryFirst,
  executeUpdate,
  executeTransaction,
  DbResult,
} from './database.service';

/**
 * Message delivery status for a user
 */
export interface MessageDelivery {
  userId: string;
  delivered: boolean;
  read: boolean;
}

/**
 * Save a message to local database
 */
export async function saveMessage(message: Message): Promise<DbResult<void>> {
  try {
    const queries = [];

    // Insert or replace message
    const messageSql = `
      INSERT OR REPLACE INTO messages (
        id, localId, chatId, senderId, type, content,
        timestamp, status, imageWidth, imageHeight, imageSize
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    queries.push({
      sql: messageSql,
      params: [
        message.id,
        message.localId ?? null,
        message.chatId,
        message.senderId,
        message.type,
        message.content,
        message.timestamp,
        message.status,
        message.metadata?.imageWidth ?? null,
        message.metadata?.imageHeight ?? null,
        message.metadata?.imageSize ?? null,
      ],
    });

    // Save delivery tracking for group messages
    if (message.deliveredTo || message.readBy) {
      // Delete existing delivery records
      queries.push({
        sql: 'DELETE FROM message_delivery WHERE messageId = ?',
        params: [message.id],
      });

      // Insert delivery records
      const allUserIds = new Set([
        ...(message.deliveredTo ?? []),
        ...(message.readBy ?? []),
      ]);

      const userIdArray = Array.from(allUserIds);
      for (const userId of userIdArray) {
        const delivered = message.deliveredTo?.includes(userId) ?? false;
        const read = message.readBy?.includes(userId) ?? false;

        queries.push({
          sql: `
            INSERT INTO message_delivery (messageId, userId, delivered, read)
            VALUES (?, ?, ?, ?)
          `,
          params: [message.id, userId, delivered ? 1 : 0, read ? 1 : 0],
        });
      }
    }

    const result = await executeTransaction(queries);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a message by ID
 */
export async function getMessage(messageId: string): Promise<DbResult<Message | null>> {
  try {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    const result = await executeQueryFirst<any>(sql, [messageId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: true, data: null };
    }

    const deliveryResult = await getMessageDeliveryStatus(messageId);
    const message = mapRowToMessage(result.data, deliveryResult.data ?? []);

    return { success: true, data: message };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get messages for a chat with pagination
 */
export async function getMessagesByChat(
  chatId: string,
  limit: number = 50,
  offset: number = 0
): Promise<DbResult<Message[]>> {
  try {
    const sql = `
      SELECT * FROM messages
      WHERE chatId = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const result = await executeQuery<any>(sql, [chatId, limit, offset]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const messages: Message[] = [];

    for (const row of result.data ?? []) {
      const deliveryResult = await getMessageDeliveryStatus(row.id);
      messages.push(mapRowToMessage(row, deliveryResult.data ?? []));
    }

    return { success: true, data: messages };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get messages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  messageId: string,
  status: DeliveryStatus
): Promise<DbResult<void>> {
  try {
    const sql = 'UPDATE messages SET status = ? WHERE id = ?';
    const result = await executeUpdate(sql, [status, messageId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update message delivery for a specific user
 */
export async function updateMessageDelivery(
  messageId: string,
  userId: string,
  delivered: boolean,
  read: boolean
): Promise<DbResult<void>> {
  try {
    const sql = `
      INSERT OR REPLACE INTO message_delivery (messageId, userId, delivered, read)
      VALUES (?, ?, ?, ?)
    `;

    const params = [messageId, userId, delivered ? 1 : 0, read ? 1 : 0];
    const result = await executeUpdate(sql, params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update delivery: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get delivery status for a message
 */
export async function getMessageDeliveryStatus(
  messageId: string
): Promise<DbResult<MessageDelivery[]>> {
  try {
    const sql = `
      SELECT userId, delivered, read
      FROM message_delivery
      WHERE messageId = ?
    `;

    const result = await executeQuery<any>(sql, [messageId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const deliveries: MessageDelivery[] = (result.data ?? []).map((row) => ({
      userId: row.userId,
      delivered: row.delivered === 1,
      read: row.read === 1,
    }));

    return { success: true, data: deliveries };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get delivery status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<DbResult<void>> {
  try {
    const sql = 'DELETE FROM messages WHERE id = ?';
    const result = await executeUpdate(sql, [messageId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get pending messages (status = 'sending')
 */
export async function getPendingMessages(): Promise<DbResult<Message[]>> {
  try {
    const sql = `
      SELECT * FROM messages
      WHERE status = 'sending'
      ORDER BY timestamp ASC
    `;

    const result = await executeQuery<any>(sql);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const messages: Message[] = [];

    for (const row of result.data ?? []) {
      const deliveryResult = await getMessageDeliveryStatus(row.id);
      messages.push(mapRowToMessage(row, deliveryResult.data ?? []));
    }

    return { success: true, data: messages };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get pending messages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a message by local ID
 */
export async function getMessageByLocalId(
  localId: string
): Promise<DbResult<Message | null>> {
  try {
    const sql = 'SELECT * FROM messages WHERE localId = ?';
    const result = await executeQueryFirst<any>(sql, [localId]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: true, data: null };
    }

    const deliveryResult = await getMessageDeliveryStatus(result.data.id);
    const message = mapRowToMessage(result.data, deliveryResult.data ?? []);

    return { success: true, data: message };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get message by localId: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Map database row to Message object
 */
function mapRowToMessage(row: any, deliveries: MessageDelivery[]): Message {
  const message: Message = {
    id: row.id,
    chatId: row.chatId,
    senderId: row.senderId,
    type: row.type,
    content: row.content,
    timestamp: row.timestamp,
    status: row.status,
  };

  if (row.localId) {
    message.localId = row.localId;
  }

  if (deliveries.length > 0) {
    message.deliveredTo = deliveries.filter((d) => d.delivered).map((d) => d.userId);
    message.readBy = deliveries.filter((d) => d.read).map((d) => d.userId);
  }

  if (row.imageWidth || row.imageHeight || row.imageSize) {
    message.metadata = {
      imageWidth: row.imageWidth ?? undefined,
      imageHeight: row.imageHeight ?? undefined,
      imageSize: row.imageSize ?? undefined,
    };
  }

  return message;
}
