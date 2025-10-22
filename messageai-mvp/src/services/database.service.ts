/**
 * SQLite Database Service
 * Handles database initialization, schema creation, and migrations
 */

import * as SQLite from 'expo-sqlite';
import { DATABASE_CONSTANTS } from '../constants';

const { DB_NAME, DB_VERSION } = DATABASE_CONSTANTS;

// Support for dependency injection in tests
let db: SQLite.SQLiteDatabase | null = null;
let testDbOverride: SQLite.SQLiteDatabase | null = null;

/**
 * Database operation result type
 */
export interface DbResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Initialize the database connection and create schema
 */
export async function initDatabase(): Promise<DbResult<void>> {
  try {
    if (db) {
      return { success: true };
    }

    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create schema
    await createSchema();

    // Set up version tracking
    await initVersioning();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get the database instance
 * Uses test override if set (for integration tests)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  // Use test override if available (for integration tests)
  if (testDbOverride) {
    return testDbOverride;
  }

  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Set test database override (for integration tests)
 * @param testDb - Database instance to use for testing
 */
export function setTestDatabaseOverride(testDb: SQLite.SQLiteDatabase | null): void {
  testDbOverride = testDb;
}

/**
 * Clear test database override (restore normal operation)
 */
export function clearTestDatabaseOverride(): void {
  testDbOverride = null;
}

/**
 * Create database schema
 */
async function createSchema(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      displayName TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      lastSeen INTEGER,
      isOnline INTEGER DEFAULT 0,
      fcmToken TEXT
    );

    -- Chats table
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('1:1', 'group')),
      name TEXT,
      createdAt INTEGER NOT NULL,
      lastMessageContent TEXT,
      lastMessageSenderId TEXT,
      lastMessageTimestamp INTEGER,
      lastMessageType TEXT CHECK(lastMessageType IN ('text', 'image'))
    );

    -- Chat participants table
    CREATE TABLE IF NOT EXISTS chat_participants (
      chatId TEXT NOT NULL,
      userId TEXT NOT NULL,
      unreadCount INTEGER DEFAULT 0,
      PRIMARY KEY (chatId, userId),
      FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      localId TEXT UNIQUE,
      chatId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'image')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sending', 'sent', 'delivered', 'read')),
      imageWidth INTEGER,
      imageHeight INTEGER,
      imageSize INTEGER,
      FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(uid)
    );

    -- Message delivery tracking table
    CREATE TABLE IF NOT EXISTS message_delivery (
      messageId TEXT NOT NULL,
      userId TEXT NOT NULL,
      delivered INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      PRIMARY KEY (messageId, userId),
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_messages_chatId_timestamp
      ON messages(chatId, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_localId
      ON messages(localId);

    CREATE INDEX IF NOT EXISTS idx_chats_lastMessage
      ON chats(lastMessageTimestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_chat_participants_userId
      ON chat_participants(userId);
  `);
}

/**
 * Initialize version tracking for migrations
 */
async function initVersioning(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS database_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM database_version WHERE id = 1'
  );

  if (!result) {
    // First time setup
    await db.runAsync(
      'INSERT INTO database_version (id, version, updated_at) VALUES (?, ?, ?)',
      [1, DB_VERSION, Date.now()]
    );
  }
}

/**
 * Execute a SQL query with parameters
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<DbResult<T[]>> {
  try {
    const database = getDatabase();
    const result = await database.getAllAsync<T>(sql, params);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Execute a single query and return first result
 */
export async function executeQueryFirst<T = any>(
  sql: string,
  params: any[] = []
): Promise<DbResult<T | null>> {
  try {
    const database = getDatabase();
    const result = await database.getFirstAsync<T>(sql, params);
    return { success: true, data: result ?? null };
  } catch (error) {
    return {
      success: false,
      error: `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 */
export async function executeUpdate(
  sql: string,
  params: any[] = []
): Promise<DbResult<SQLite.SQLiteRunResult>> {
  try {
    const database = getDatabase();
    const result = await database.runAsync(sql, params);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Update execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Transaction queue to prevent nested transactions
 */
let transactionQueue: Promise<any> = Promise.resolve();

/**
 * Execute multiple queries in a transaction
 * Uses a queue to ensure transactions don't overlap
 */
export async function executeTransaction(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<DbResult<void>> {
  // Chain this transaction after the previous one
  const previousTransaction = transactionQueue;
  
  let resolveTransaction: (value?: any) => void;
  transactionQueue = new Promise((resolve) => {
    resolveTransaction = resolve;
  });

  try {
    // Wait for previous transaction to complete
    await previousTransaction;
    
    const database = getDatabase();

    await database.withTransactionAsync(async () => {
      for (const query of queries) {
        await database.runAsync(query.sql, query.params ?? []);
      }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    // Allow next transaction to proceed
    resolveTransaction!();
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<DbResult<void>> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Database close failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get current database version
 */
export async function getDatabaseVersion(): Promise<DbResult<number>> {
  try {
    const database = getDatabase();
    const result = await database.getFirstAsync<{ version: number }>(
      'SELECT version FROM database_version WHERE id = 1'
    );
    return { success: true, data: result?.version ?? 0 };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get database version: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
