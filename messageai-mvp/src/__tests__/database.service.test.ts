/**
 * Unit tests for database.service.ts
 * Uses in-memory SQLite for realistic testing
 */

import * as SQLite from 'expo-sqlite';
import {
  initDatabase,
  closeDatabase,
  executeQuery,
  executeQueryFirst,
  executeUpdate,
  executeTransaction,
  getDatabaseVersion,
} from '../services/database.service';
import { DATABASE_CONSTANTS } from '../constants';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => {
  return {
    openDatabaseAsync: jest.fn(),
  };
});

describe('Database Service', () => {
  let mockDb: any;

  beforeEach(async () => {
    // Create mock database with in-memory simulation
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
      withTransactionAsync: jest.fn().mockImplementation(async (callback) => {
        await callback();
      }),
      closeAsync: jest.fn().mockResolvedValue(undefined),
    };

    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  afterEach(async () => {
    await closeDatabase();
    jest.clearAllMocks();
  });

  describe('initDatabase', () => {
    it('should initialize database successfully', async () => {
      const result = await initDatabase();

      expect(result.success).toBe(true);
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith(DATABASE_CONSTANTS.DB_NAME);
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
    });

    it('should create all required tables', async () => {
      await initDatabase();

      const execCalls = mockDb.execAsync.mock.calls;
      const schemaCall = execCalls.find((call: any[]) =>
        call[0].includes('CREATE TABLE IF NOT EXISTS users')
      );

      expect(schemaCall).toBeDefined();
      expect(schemaCall[0]).toContain('CREATE TABLE IF NOT EXISTS chats');
      expect(schemaCall[0]).toContain('CREATE TABLE IF NOT EXISTS messages');
      expect(schemaCall[0]).toContain('CREATE TABLE IF NOT EXISTS message_delivery');
      expect(schemaCall[0]).toContain('CREATE TABLE IF NOT EXISTS chat_participants');
    });

    it('should create indexes', async () => {
      await initDatabase();

      const execCalls = mockDb.execAsync.mock.calls;
      const schemaCall = execCalls.find((call: any[]) =>
        call[0].includes('CREATE INDEX')
      );

      expect(schemaCall).toBeDefined();
      expect(schemaCall[0]).toContain('idx_messages_chatId_timestamp');
      expect(schemaCall[0]).toContain('idx_messages_localId');
      expect(schemaCall[0]).toContain('idx_chats_lastMessage');
    });

    it('should initialize version tracking', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      await initDatabase();

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO database_version (id, version, updated_at) VALUES (?, ?, ?)',
        [1, DATABASE_CONSTANTS.DB_VERSION, expect.any(Number)]
      );
    });

    it('should handle initialization errors', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockRejectedValue(
        new Error('Database open failed')
      );

      const result = await initDatabase();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database initialization failed');
    });

    it('should return success if already initialized', async () => {
      await initDatabase();
      const result = await initDatabase();

      expect(result.success).toBe(true);
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('should execute query and return results', async () => {
      const mockResults = [{ id: 1, name: 'Test' }];
      mockDb.getAllAsync.mockResolvedValue(mockResults);

      const result = await executeQuery('SELECT * FROM users');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
    });

    it('should execute query with parameters', async () => {
      await executeQuery('SELECT * FROM users WHERE id = ?', [123]);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [123]
      );
    });

    it('should handle query errors', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Query failed'));

      const result = await executeQuery('INVALID SQL');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query execution failed');
    });
  });

  describe('executeQueryFirst', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('should return first result', async () => {
      const mockResult = { id: 1, name: 'Test' };
      mockDb.getFirstAsync.mockResolvedValue(mockResult);

      const result = await executeQueryFirst('SELECT * FROM users WHERE id = ?', [1]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });

    it('should return null when no results', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await executeQueryFirst('SELECT * FROM users WHERE id = ?', [999]);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('executeUpdate', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('should execute update query', async () => {
      const mockResult = { changes: 1, lastInsertRowId: 5 };
      mockDb.runAsync.mockResolvedValue(mockResult);

      const result = await executeUpdate('INSERT INTO users VALUES (?, ?)', ['id', 'name']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });

    it('should handle update errors', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Update failed'));

      const result = await executeUpdate('INVALID UPDATE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update execution failed');
    });
  });

  describe('executeTransaction', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('should execute multiple queries in transaction', async () => {
      jest.clearAllMocks();

      const queries = [
        { sql: 'INSERT INTO users VALUES (?, ?)', params: ['id1', 'name1'] },
        { sql: 'INSERT INTO users VALUES (?, ?)', params: ['id2', 'name2'] },
      ];

      const result = await executeTransaction(queries);

      expect(result.success).toBe(true);
      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction errors', async () => {
      mockDb.withTransactionAsync.mockRejectedValue(new Error('Transaction failed'));

      const result = await executeTransaction([
        { sql: 'INSERT INTO users VALUES (?, ?)', params: ['id', 'name'] },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });
  });

  describe('getDatabaseVersion', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('should return current database version', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ version: 1 });

      const result = await getDatabaseVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
    });

    it('should return 0 if version not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await getDatabaseVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection', async () => {
      await initDatabase();
      const result = await closeDatabase();

      expect(result.success).toBe(true);
      expect(mockDb.closeAsync).toHaveBeenCalled();
    });

    it('should handle close when database not initialized', async () => {
      const result = await closeDatabase();

      expect(result.success).toBe(true);
    });
  });
});
