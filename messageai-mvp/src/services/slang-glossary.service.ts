/**
 * Slang Glossary Service
 * Manages storage, retrieval, and tracking of slang/idiom explanations
 */

import { getDatabase } from "./database.service";
import { SlangItem } from "./ai/types";

/**
 * In-memory cache for slang items
 * Key: messageId, Value: array of slang items
 */
const slangCache = new Map<string, SlangItem[]>();

/**
 * Save slang items for a message to the database
 *
 * @param items - Array of slang items to save
 */
export async function saveSlangItems(items: SlangItem[]): Promise<void> {
  if (items.length === 0) return;

  const db = getDatabase();

  // Save each item
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO slang_items
       (id, messageId, phrase, literal, actual, usage, formality, category, regions, language, startIndex, endIndex, known, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.messageId,
        item.phrase,
        item.literal,
        item.actual,
        item.usage,
        item.formality,
        item.category,
        item.regions ? JSON.stringify(item.regions) : null,
        item.language,
        item.startIndex,
        item.endIndex,
        item.known ? 1 : 0,
        item.timestamp || Date.now(),
      ],
    );
  }

  // Update cache
  const messageId = items[0].messageId;
  slangCache.set(messageId, items);
}

/**
 * Get slang items for a specific message
 *
 * @param messageId - ID of the message
 * @returns Array of slang items
 */
export async function getSlangItems(messageId: string): Promise<SlangItem[]> {
  // Check cache first
  if (slangCache.has(messageId)) {
    return slangCache.get(messageId)!;
  }

  // Query database
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM slang_items WHERE messageId = ? ORDER BY startIndex ASC`,
    [messageId],
  );

  const items: SlangItem[] = rows.map((row) => ({
    id: row.id,
    messageId: row.messageId,
    phrase: row.phrase,
    literal: row.literal,
    actual: row.actual,
    usage: row.usage,
    formality: row.formality,
    category: row.category,
    regions: row.regions ? JSON.parse(row.regions) : undefined,
    language: row.language,
    startIndex: row.startIndex,
    endIndex: row.endIndex,
    known: row.known === 1,
    timestamp: row.timestamp,
  }));

  // Update cache
  if (items.length > 0) {
    slangCache.set(messageId, items);
  }

  return items;
}

/**
 * Mark a slang item as known (user understands it)
 *
 * @param itemId - ID of the slang item to mark as known
 */
export async function markSlangAsKnown(itemId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE slang_items SET known = 1 WHERE id = ?`, [itemId]);

  // Update cache
  for (const [messageId, items] of slangCache.entries()) {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      item.known = true;
      slangCache.set(messageId, items);
      break;
    }
  }
}

/**
 * Get all slang items for the glossary view
 * Ordered alphabetically by phrase
 *
 * @param onlyUnknown - If true, only return items not marked as known
 * @returns Array of all slang items
 */
export async function getAllSlangItems(
  onlyUnknown: boolean = false,
): Promise<SlangItem[]> {
  const db = getDatabase();

  const query = onlyUnknown
    ? `SELECT * FROM slang_items WHERE known = 0 ORDER BY phrase COLLATE NOCASE ASC`
    : `SELECT * FROM slang_items ORDER BY phrase COLLATE NOCASE ASC`;

  const rows = await db.getAllAsync<any>(query);

  return rows.map((row) => ({
    id: row.id,
    messageId: row.messageId,
    phrase: row.phrase,
    literal: row.literal,
    actual: row.actual,
    usage: row.usage,
    formality: row.formality,
    category: row.category,
    regions: row.regions ? JSON.parse(row.regions) : undefined,
    language: row.language,
    startIndex: row.startIndex,
    endIndex: row.endIndex,
    known: row.known === 1,
    timestamp: row.timestamp,
  }));
}

/**
 * Get slang items for multiple messages (batch operation)
 *
 * @param messageIds - Array of message IDs
 * @returns Map of messageId to slang items array
 */
export async function getSlangItemsBatch(
  messageIds: string[],
): Promise<Map<string, SlangItem[]>> {
  const results = new Map<string, SlangItem[]>();

  // Check cache for all messages
  const uncachedIds: string[] = [];
  for (const messageId of messageIds) {
    if (slangCache.has(messageId)) {
      results.set(messageId, slangCache.get(messageId)!);
    } else {
      uncachedIds.push(messageId);
    }
  }

  // Query database for uncached messages
  if (uncachedIds.length > 0) {
    const db = getDatabase();
    const placeholders = uncachedIds.map(() => "?").join(",");
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM slang_items
       WHERE messageId IN (${placeholders})
       ORDER BY messageId, startIndex ASC`,
      uncachedIds,
    );

    // Group by messageId
    const groupedItems = new Map<string, SlangItem[]>();
    for (const row of rows) {
      const item: SlangItem = {
        id: row.id,
        messageId: row.messageId,
        phrase: row.phrase,
        literal: row.literal,
        actual: row.actual,
        usage: row.usage,
        formality: row.formality,
        category: row.category,
        regions: row.regions ? JSON.parse(row.regions) : undefined,
        language: row.language,
        startIndex: row.startIndex,
        endIndex: row.endIndex,
        known: row.known === 1,
        timestamp: row.timestamp,
      };

      if (!groupedItems.has(row.messageId)) {
        groupedItems.set(row.messageId, []);
      }
      groupedItems.get(row.messageId)!.push(item);
    }

    // Add to results and cache
    for (const [messageId, items] of groupedItems) {
      results.set(messageId, items);
      slangCache.set(messageId, items);
    }

    // Add empty arrays for messages with no slang
    for (const messageId of uncachedIds) {
      if (!results.has(messageId)) {
        results.set(messageId, []);
      }
    }
  }

  return results;
}

/**
 * Delete all slang items for a message
 *
 * @param messageId - ID of the message
 */
export async function deleteSlangItems(messageId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM slang_items WHERE messageId = ?`, [messageId]);

  // Remove from cache
  slangCache.delete(messageId);
}

/**
 * Clear the slang cache (useful for testing or memory management)
 */
export function clearSlangCache(): void {
  slangCache.clear();
}

/**
 * Get count of unknown slang items for a message
 *
 * @param messageId - ID of the message
 * @returns Number of unknown slang items
 */
export async function getUnknownSlangCount(messageId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM slang_items WHERE messageId = ? AND known = 0`,
    [messageId],
  );
  return result?.count || 0;
}

/**
 * Check if a phrase is already known (exists and marked as known)
 *
 * @param phrase - The slang phrase to check
 * @returns True if phrase is known
 */
export async function isSlangKnown(phrase: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM slang_items WHERE phrase = ? AND known = 1 LIMIT 1`,
    [phrase],
  );
  return (result?.count || 0) > 0;
}

/**
 * Reset all known slang (marks all as unknown)
 * Used when user wants to start fresh
 */
export async function resetKnownSlang(): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE slang_items SET known = 0`);

  // Clear cache to force reload
  clearSlangCache();
}
