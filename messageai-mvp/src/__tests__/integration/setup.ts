/**
 * Integration Test Setup & Helpers
 * Provides utilities for testing with real Firebase and SQLite
 */

import * as SQLite from 'expo-sqlite';
import { getFirebaseDatabase } from '../../services/firebase';
import { ref, remove, get } from 'firebase/database';
import { setTestDatabaseOverride, clearTestDatabaseOverride } from '../../services/database.service';
import type { User, Chat, Message } from '../../types';

// Connect to Firebase Emulators before running tests
import { connectToEmulators } from './emulator-setup';
connectToEmulators();

/**
 * Generate unique test IDs to prevent collisions between test runs
 */
const testRunId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
let testCounter = 0;

export function generateTestId(prefix: string): string {
  testCounter++;
  return `${prefix}-${testRunId}-${testCounter}`;
}

/**
 * Test user factory
 */
export function createTestUser(overrides: Partial<User> = {}): User {
  const uid = overrides.uid || generateTestId('user');
  return {
    uid,
    email: `${uid}@test.com`,
    displayName: `Test User ${uid}`,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    isOnline: false,
    ...overrides,
  };
}

/**
 * Test chat factory
 */
export function createTestChat(overrides: Partial<Chat> = {}): Chat {
  const id = overrides.id || generateTestId('chat');
  return {
    id,
    type: '1:1',
    participantIds: overrides.participantIds || [generateTestId('user'), generateTestId('user')],
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Test message factory
 */
export function createTestMessage(chatId: string, senderId: string, overrides: Partial<Message> = {}): Message {
  const id = overrides.id || generateTestId('msg');
  return {
    id,
    chatId,
    senderId,
    type: 'text',
    content: `Test message ${id}`,
    timestamp: Date.now(),
    status: 'sent',
    ...overrides,
  };
}

/**
 * Firebase cleanup helper
 */
export class FirebaseTestHelper {
  private pathsToCleanup: string[] = [];

  /**
   * Track a Firebase path for cleanup
   */
  trackForCleanup(path: string): void {
    this.pathsToCleanup.push(path);
  }

  /**
   * Clean up all tracked Firebase paths
   */
  async cleanup(): Promise<void> {
    const db = getFirebaseDatabase();
    const promises = this.pathsToCleanup.map(async (path) => {
      try {
        await remove(ref(db, path));
      } catch (error) {
        console.error(`Failed to cleanup Firebase path: ${path}`, error);
      }
    });

    await Promise.all(promises);
    this.pathsToCleanup = [];
  }

  /**
   * Verify data exists at a Firebase path
   */
  async verifyExists(path: string): Promise<boolean> {
    const db = getFirebaseDatabase();
    const snapshot = await get(ref(db, path));
    return snapshot.exists();
  }

  /**
   * Get data from Firebase path
   */
  async getData<T>(path: string): Promise<T | null> {
    const db = getFirebaseDatabase();
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
  }
}

/**
 * SQLite test helper
 * Uses in-memory database for tests
 */
export class SQLiteTestHelper {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize test database
   */
  async init(): Promise<void> {
    // Create an in-memory database for testing
    this.db = await SQLite.openDatabaseAsync(':memory:');

    // Set as test override so local services can access it
    setTestDatabaseOverride(this.db);

    // Create tables
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        displayName TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        lastSeen INTEGER NOT NULL,
        isOnline INTEGER NOT NULL,
        fcmToken TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        participantIds TEXT NOT NULL,
        name TEXT,
        createdAt INTEGER NOT NULL,
        lastMessage TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(participantIds);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        chatId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        localId TEXT,
        deliveredTo TEXT,
        readBy TEXT,
        metadata TEXT,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (senderId) REFERENCES users(uid)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
  }

  /**
   * Get the test database instance
   */
  getDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Test database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Clean up and close database
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      try {
        await this.db.closeAsync();
      } catch (error) {
        console.error('Error closing test database:', error);
      }
      this.db = null;
    }
    // Clear test override to restore normal operation
    clearTestDatabaseOverride();
  }

  /**
   * Verify user exists in local database
   */
  async verifyUserExists(uid: string): Promise<boolean> {
    const db = this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE uid = ?',
      [uid]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get user from local database
   */
  async getUser(uid: string): Promise<User | null> {
    const db = this.getDb();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM users WHERE uid = ?',
      [uid]
    );

    if (!row) return null;

    return {
      uid: row.uid,
      email: row.email,
      displayName: row.displayName,
      createdAt: row.createdAt,
      lastSeen: row.lastSeen,
      isOnline: row.isOnline === 1,
      fcmToken: row.fcmToken,
    };
  }

  /**
   * Verify chat exists in local database
   */
  async verifyChatExists(chatId: string): Promise<boolean> {
    const db = this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM chats WHERE id = ?',
      [chatId]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get chat from local database
   */
  async getChat(chatId: string): Promise<Chat | null> {
    const db = this.getDb();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM chats WHERE id = ?',
      [chatId]
    );

    if (!row) return null;

    return {
      id: row.id,
      type: row.type as '1:1' | 'group',
      participantIds: JSON.parse(row.participantIds),
      name: row.name,
      createdAt: row.createdAt,
      lastMessage: row.lastMessage ? JSON.parse(row.lastMessage) : undefined,
    };
  }

  /**
   * Verify message exists in local database
   */
  async verifyMessageExists(messageId: string): Promise<boolean> {
    const db = this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE id = ?',
      [messageId]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get message from local database
   */
  async getMessage(messageId: string): Promise<Message | null> {
    const db = this.getDb();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (!row) return null;

    return {
      id: row.id,
      chatId: row.chatId,
      senderId: row.senderId,
      type: row.type as 'text' | 'image',
      content: row.content,
      timestamp: row.timestamp,
      status: row.status as 'sending' | 'sent' | 'delivered' | 'read',
      localId: row.localId,
      deliveredTo: row.deliveredTo ? JSON.parse(row.deliveredTo) : undefined,
      readBy: row.readBy ? JSON.parse(row.readBy) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Get messages for a chat
   */
  async getMessagesForChat(chatId: string): Promise<Message[]> {
    const db = this.getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC',
      [chatId]
    );

    return rows.map(row => ({
      id: row.id,
      chatId: row.chatId,
      senderId: row.senderId,
      type: row.type as 'text' | 'image',
      content: row.content,
      timestamp: row.timestamp,
      status: row.status as 'sending' | 'sent' | 'delivered' | 'read',
      localId: row.localId,
      deliveredTo: row.deliveredTo ? JSON.parse(row.deliveredTo) : undefined,
      readBy: row.readBy ? JSON.parse(row.readBy) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }
}

/**
 * Wait for a condition to be true (for testing async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  checkInterval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep utility for tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
