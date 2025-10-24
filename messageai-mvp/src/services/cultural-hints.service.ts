/**
 * Cultural Hints Service
 * Manages storage, retrieval, and caching of cultural context hints
 */

import { getDatabase } from './database.service';
import { ContextHint } from './ai/types';

/**
 * In-memory cache for cultural hints
 * Key: messageId, Value: array of hints
 */
const hintsCache = new Map<string, ContextHint[]>();

/**
 * Save cultural hints for a message to the database
 *
 * @param hints - Array of cultural hints to save
 */
export async function saveCulturalHints(hints: ContextHint[]): Promise<void> {
  if (hints.length === 0) return;

  const db = getDatabase();

  // Save each hint
  for (const hint of hints) {
    await db.runAsync(
      `INSERT OR REPLACE INTO cultural_hints
       (id, messageId, phrase, explanation, culturalBackground, category, startIndex, endIndex, seen, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hint.id,
        hint.messageId,
        hint.phrase,
        hint.explanation,
        hint.culturalBackground,
        hint.category,
        hint.startIndex,
        hint.endIndex,
        hint.seen ? 1 : 0,
        hint.timestamp || Date.now()
      ]
    );
  }

  // Update cache
  const messageId = hints[0].messageId;
  hintsCache.set(messageId, hints);
}

/**
 * Get cultural hints for a specific message
 *
 * @param messageId - ID of the message
 * @returns Array of cultural hints
 */
export async function getCulturalHints(messageId: string): Promise<ContextHint[]> {
  // Check cache first
  if (hintsCache.has(messageId)) {
    return hintsCache.get(messageId)!;
  }

  // Query database
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM cultural_hints WHERE messageId = ? ORDER BY startIndex ASC`,
    [messageId]
  );

  const hints: ContextHint[] = rows.map(row => ({
    id: row.id,
    messageId: row.messageId,
    phrase: row.phrase,
    explanation: row.explanation,
    culturalBackground: row.culturalBackground,
    category: row.category,
    startIndex: row.startIndex,
    endIndex: row.endIndex,
    seen: row.seen === 1,
    timestamp: row.timestamp
  }));

  // Update cache
  if (hints.length > 0) {
    hintsCache.set(messageId, hints);
  }

  return hints;
}

/**
 * Mark a cultural hint as seen
 *
 * @param hintId - ID of the hint to mark as seen
 */
export async function markHintAsSeen(hintId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE cultural_hints SET seen = 1 WHERE id = ?`,
    [hintId]
  );

  // Update cache
  for (const [messageId, hints] of hintsCache.entries()) {
    const hint = hints.find(h => h.id === hintId);
    if (hint) {
      hint.seen = true;
      hintsCache.set(messageId, hints);
      break;
    }
  }
}

/**
 * Get hints for multiple messages (batch operation)
 *
 * @param messageIds - Array of message IDs
 * @returns Map of messageId to hints array
 */
export async function getCulturalHintsBatch(
  messageIds: string[]
): Promise<Map<string, ContextHint[]>> {
  const results = new Map<string, ContextHint[]>();

  // Check cache for all messages
  const uncachedIds: string[] = [];
  for (const messageId of messageIds) {
    if (hintsCache.has(messageId)) {
      results.set(messageId, hintsCache.get(messageId)!);
    } else {
      uncachedIds.push(messageId);
    }
  }

  // Query database for uncached messages
  if (uncachedIds.length > 0) {
    const db = getDatabase();
    const placeholders = uncachedIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cultural_hints
       WHERE messageId IN (${placeholders})
       ORDER BY messageId, startIndex ASC`,
      uncachedIds
    );

    // Group by messageId
    const groupedHints = new Map<string, ContextHint[]>();
    for (const row of rows) {
      const hint: ContextHint = {
        id: row.id,
        messageId: row.messageId,
        phrase: row.phrase,
        explanation: row.explanation,
        culturalBackground: row.culturalBackground,
        category: row.category,
        startIndex: row.startIndex,
        endIndex: row.endIndex,
        seen: row.seen === 1,
        timestamp: row.timestamp
      };

      if (!groupedHints.has(row.messageId)) {
        groupedHints.set(row.messageId, []);
      }
      groupedHints.get(row.messageId)!.push(hint);
    }

    // Add to results and cache
    for (const [messageId, hints] of groupedHints) {
      results.set(messageId, hints);
      hintsCache.set(messageId, hints);
    }

    // Add empty arrays for messages with no hints
    for (const messageId of uncachedIds) {
      if (!results.has(messageId)) {
        results.set(messageId, []);
      }
    }
  }

  return results;
}

/**
 * Delete all cultural hints for a message
 *
 * @param messageId - ID of the message
 */
export async function deleteCulturalHints(messageId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `DELETE FROM cultural_hints WHERE messageId = ?`,
    [messageId]
  );

  // Remove from cache
  hintsCache.delete(messageId);
}

/**
 * Clear the hints cache (useful for testing or memory management)
 */
export function clearHintsCache(): void {
  hintsCache.clear();
}

/**
 * Get count of unseen hints for a message
 *
 * @param messageId - ID of the message
 * @returns Number of unseen hints
 */
export async function getUnseenHintCount(messageId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cultural_hints WHERE messageId = ? AND seen = 0`,
    [messageId]
  );
  return result?.count || 0;
}
