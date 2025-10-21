/**
 * Mock implementation of expo-sqlite for Jest tests
 * Provides a Node.js compatible in-memory SQLite database
 */

// Use a simple in-memory implementation
class MockSQLiteDatabase {
  constructor(dbName) {
    this.dbName = dbName;
    this.tables = new Map();
    this.isOpen = true;
  }

  async execAsync(sql) {
    // Parse and execute SQL commands
    // This is a simplified implementation for testing
    const commands = sql.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      const trimmed = command.trim().toUpperCase();
      
      // Handle PRAGMA
      if (trimmed.startsWith('PRAGMA')) {
        continue;
      }
      
      // Handle CREATE TABLE
      if (trimmed.startsWith('CREATE TABLE')) {
        const match = command.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        if (match) {
          const tableName = match[1];
          if (!this.tables.has(tableName)) {
            this.tables.set(tableName, []);
          }
        }
      }
      
      // Handle CREATE INDEX
      if (trimmed.startsWith('CREATE INDEX')) {
        // Indexes don't need to be stored in memory for mock
        continue;
      }
    }
    
    return { changes: 0, lastInsertRowId: 0 };
  }

  async runAsync(sql, params = []) {
    // Parse SQL command
    const trimmed = sql.trim().toUpperCase();
    
    // Handle INSERT
    if (trimmed.startsWith('INSERT')) {
      const match = sql.match(/INSERT INTO (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
        }
        
        // Create a simple row object from params
        const row = { _params: params };
        this.tables.get(tableName).push(row);
        
        return { changes: 1, lastInsertRowId: this.tables.get(tableName).length };
      }
    }
    
    // Handle UPDATE
    if (trimmed.startsWith('UPDATE')) {
      return { changes: 1, lastInsertRowId: 0 };
    }
    
    // Handle DELETE
    if (trimmed.startsWith('DELETE')) {
      return { changes: 1, lastInsertRowId: 0 };
    }
    
    return { changes: 0, lastInsertRowId: 0 };
  }

  async getFirstAsync(sql, params = []) {
    // Return a mock row
    return null;
  }

  async getAllAsync(sql, params = []) {
    // Parse SELECT query
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('SELECT')) {
      const match = sql.match(/FROM (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (this.tables.has(tableName)) {
          return this.tables.get(tableName);
        }
      }
    }

    return [];
  }

  async withTransactionAsync(callback) {
    // Mock transaction support - just execute the callback
    return await callback();
  }

  async closeAsync() {
    this.isOpen = false;
  }
}

// Export mock functions using CommonJS
module.exports = {
  openDatabaseAsync: async function(databaseName, options) {
    return new MockSQLiteDatabase(databaseName);
  },
  
  openDatabaseSync: function(databaseName, options) {
    return new MockSQLiteDatabase(databaseName);
  },
};

