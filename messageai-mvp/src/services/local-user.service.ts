/**
 * Local User Storage Service
 * Handles CRUD operations for users in SQLite
 */

import { User } from '../types';
import { executeQuery, executeQueryFirst, executeUpdate, DbResult } from './database.service';

/**
 * Save a user to local database
 */
export async function saveUser(user: User): Promise<DbResult<void>> {
  try {
    const sql = `
      INSERT OR REPLACE INTO users (
        uid, email, displayName, createdAt, lastSeen, isOnline, fcmToken, pushToken,
        autoTranslateEnabled, preferredLanguage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user.uid,
      user.email,
      user.displayName,
      user.createdAt,
      user.lastSeen ?? null,
      user.isOnline ? 1 : 0,
      user.fcmToken ?? null,
      user.pushToken ?? null,
      user.autoTranslateEnabled ? 1 : 0,
      user.preferredLanguage ?? 'en',
    ];

    const result = await executeUpdate(sql, params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save user: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a user by UID
 */
export async function getUser(uid: string): Promise<DbResult<User | null>> {
  try {
    const sql = 'SELECT * FROM users WHERE uid = ?';
    const result = await executeQueryFirst<any>(sql, [uid]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: true, data: null };
    }

    const user = mapRowToUser(result.data);
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get multiple users by UIDs
 */
export async function getUsers(uids: string[]): Promise<DbResult<User[]>> {
  try {
    if (uids.length === 0) {
      return { success: true, data: [] };
    }

    const placeholders = uids.map(() => '?').join(',');
    const sql = `SELECT * FROM users WHERE uid IN (${placeholders})`;
    const result = await executeQuery<any>(sql, uids);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const users = (result.data ?? []).map(mapRowToUser);
    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get users: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update user presence status
 */
export async function updateUserPresence(
  uid: string,
  isOnline: boolean,
  lastSeen?: number
): Promise<DbResult<void>> {
  try {
    const sql = `
      UPDATE users
      SET isOnline = ?, lastSeen = ?
      WHERE uid = ?
    `;

    const params = [isOnline ? 1 : 0, lastSeen ?? Date.now(), uid];
    const result = await executeUpdate(sql, params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update presence: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all users from local database
 */
export async function getAllUsers(): Promise<DbResult<User[]>> {
  try {
    const sql = 'SELECT * FROM users ORDER BY displayName ASC';
    const result = await executeQuery<any>(sql);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const users = (result.data ?? []).map(mapRowToUser);
    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get all users: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update user FCM token
 */
export async function updateUserFcmToken(
  uid: string,
  fcmToken: string
): Promise<DbResult<void>> {
  try {
    const sql = 'UPDATE users SET fcmToken = ? WHERE uid = ?';
    const result = await executeUpdate(sql, [fcmToken, uid]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update FCM token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a user from local database
 */
export async function deleteUser(uid: string): Promise<DbResult<void>> {
  try {
    const sql = 'DELETE FROM users WHERE uid = ?';
    const result = await executeUpdate(sql, [uid]);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete user: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update specific user fields (partial update)
 */
export async function updateUser(
  uid: string,
  updates: Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>
): Promise<DbResult<void>> {
  try {
    // Build dynamic UPDATE query
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return { success: true }; // Nothing to update
    }

    const setClauses = fields.map(field => {
      // Handle boolean fields
      if (field === 'isOnline' || field === 'autoTranslateEnabled') {
        return `${field} = ?`;
      }
      return `${field} = ?`;
    });

    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE uid = ?`;

    const params = fields.map(field => {
      const value = updates[field as keyof typeof updates];
      // Convert booleans to 0/1 for SQLite
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      return value ?? null;
    });
    params.push(uid);

    const result = await executeUpdate(sql, params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update user: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Map database row to User object
 */
function mapRowToUser(row: any): User {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
    lastSeen: row.lastSeen ?? undefined,
    isOnline: row.isOnline === 1,
    fcmToken: row.fcmToken ?? undefined,
    pushToken: row.pushToken ?? undefined,
    autoTranslateEnabled: row.autoTranslateEnabled === 1,
    preferredLanguage: row.preferredLanguage ?? 'en',
  };
}
