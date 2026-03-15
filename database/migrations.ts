// V7 Database Migration System
// Universal migrations for PostgreSQL and MySQL

import { db } from './adapter';

export interface Migration {
  version: number;
  name: string;
  up: (adapter: any) => Promise<void>;
  down?: (adapter: any) => Promise<void>;
}

export class MigrationManager {
  private migrations: Migration[] = [];

  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async runMigrations(targetVersion?: number): Promise<void> {
    const adapter = db.getAdapter();

    // Create migrations table if it doesn't exist
    await this.createMigrationsTable(adapter);

    // Get current version
    const currentVersion = await this.getCurrentVersion(adapter);

    // Determine which migrations to run
    const migrationsToRun = this.migrations.filter(m =>
      m.version > currentVersion && (!targetVersion || m.version <= targetVersion)
    );

    for (const migration of migrationsToRun) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      await adapter.transaction(async (client) => {
        await migration.up(client);
        await this.recordMigration(client, migration.version);
      });

      console.log(`Migration ${migration.version} completed`);
    }
  }

  async rollbackMigration(version: number): Promise<void> {
    const adapter = db.getAdapter();
    const migration = this.migrations.find(m => m.version === version);

    if (!migration || !migration.down) {
      throw new Error(`Migration ${version} not found or has no down function`);
    }

    const down = migration.down;

    await adapter.transaction(async (client) => {
      await down(client);
      await this.removeMigration(client, version);
    });
  }

  private async createMigrationsTable(adapter: any): Promise<void> {
    const sql = adapter.constructor.name === 'PostgreSQLAdapter'
      ? `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
      : `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INT PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

    await adapter.query(sql);
  }

  private async getCurrentVersion(adapter: any): Promise<number> {
    try {
      const result = await adapter.query('SELECT MAX(version) as version FROM schema_migrations');
      return result.rows[0]?.version || 0;
    } catch {
      return 0;
    }
  }

  private async recordMigration(adapter: any, version: number): Promise<void> {
    await adapter.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
  }

  private async removeMigration(adapter: any, version: number): Promise<void> {
    await adapter.query('DELETE FROM schema_migrations WHERE version = ?', [version]);
  }
}

// Core migrations for V7
export const coreMigrations: Migration[] = [
  {
    version: 1,
    name: 'Create users table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            role VARCHAR(20) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recovery_key VARCHAR(255),
            preferences JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            role VARCHAR(20) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recovery_key VARCHAR(255),
            preferences JSON DEFAULT ('{}')
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 2,
    name: 'Create sessions table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE sessions (
            id SERIAL PRIMARY KEY,
            participant_id INT REFERENCES users(id),
            counselor_id INT REFERENCES users(id),
            status VARCHAR(20) DEFAULT 'waiting',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            priority VARCHAR(20) DEFAULT 'normal',
            risk_indicators JSONB DEFAULT '{}',
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            participant_id INT,
            counselor_id INT,
            status VARCHAR(20) DEFAULT 'waiting',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP NULL,
            priority VARCHAR(20) DEFAULT 'normal',
            risk_indicators JSON DEFAULT ('{}'),
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (participant_id) REFERENCES users(id),
            FOREIGN KEY (counselor_id) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 3,
    name: 'Create messages table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            session_id INT REFERENCES sessions(id),
            sender_id INT REFERENCES users(id),
            content TEXT NOT NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT false,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT,
            sender_id INT,
            content TEXT NOT NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT false,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 4,
    name: 'Create panic_alerts table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE panic_alerts (
            id SERIAL PRIMARY KEY,
            session_id INT REFERENCES sessions(id),
            user_id INT REFERENCES users(id),
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(20) DEFAULT 'active',
            detection_method VARCHAR(50),
            risk_indicators JSONB DEFAULT '{}',
            assigned_counselor_id INT REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE panic_alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT,
            user_id INT,
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(20) DEFAULT 'active',
            detection_method VARCHAR(50),
            risk_indicators JSON DEFAULT ('{}'),
            assigned_counselor_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (assigned_counselor_id) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 5,
    name: 'Create support_rooms table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE support_rooms (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50) DEFAULT 'general',
            max_participants INT DEFAULT 50,
            current_participants INT DEFAULT 0,
            is_private BOOLEAN DEFAULT false,
            tags TEXT[] DEFAULT '{}',
            status VARCHAR(20) DEFAULT 'active',
            created_by INT REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE support_rooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50) DEFAULT 'general',
            max_participants INT DEFAULT 50,
            current_participants INT DEFAULT 0,
            is_private BOOLEAN DEFAULT false,
            tags JSON DEFAULT ('[]'),
            status VARCHAR(20) DEFAULT 'active',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (created_by) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 6,
    name: 'Create support_messages table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE support_messages (
            id SERIAL PRIMARY KEY,
            room_id INT REFERENCES support_rooms(id),
            sender_id INT REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT false,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE support_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT,
            sender_id INT,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT false,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (room_id) REFERENCES support_rooms(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 7,
    name: 'Create analytics_events table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE analytics_events (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id),
            session_id INT REFERENCES sessions(id),
            event_type VARCHAR(50) NOT NULL,
            event_name VARCHAR(100) NOT NULL,
            properties JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE analytics_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            session_id INT,
            event_type VARCHAR(50) NOT NULL,
            event_name VARCHAR(100) NOT NULL,
            properties JSON DEFAULT ('{}'),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (session_id) REFERENCES sessions(id)
          );
        `;
      await adapter.query(sql);
    }
  },
  {
    version: 8,
    name: 'Create counselor_metrics table',
    up: async (adapter: any) => {
      const sql = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE counselor_metrics (
            id SERIAL PRIMARY KEY,
            counselor_id INT REFERENCES users(id),
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            sessions_handled INT DEFAULT 0,
            sessions_completed INT DEFAULT 0,
            avg_response_time INT, -- in minutes
            user_satisfaction DECIMAL(3,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'
          );
        `
        : `
          CREATE TABLE counselor_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            counselor_id INT,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            sessions_handled INT DEFAULT 0,
            sessions_completed INT DEFAULT 0,
            avg_response_time INT, -- in minutes
            user_satisfaction DECIMAL(3,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSON DEFAULT ('{}'),
            FOREIGN KEY (counselor_id) REFERENCES users(id)
          );
        `;
      await adapter.query(sql);
    }
  }
];

export const migrationManager = new MigrationManager();
coreMigrations.forEach(m => migrationManager.addMigration(m));