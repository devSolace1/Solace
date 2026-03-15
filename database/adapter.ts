// V7 Database Abstraction Layer
// Supports PostgreSQL and MySQL for self-hosting

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionLimit?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: string[];
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: any = null;

  constructor(private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    const { Pool } = await import('pg');
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.connectionLimit || 20,
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const result = await this.pool.query(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name)
    };
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export class MySQLAdapter implements DatabaseAdapter {
  private pool: any = null;

  constructor(private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    const mysql = await import('mysql2/promise');
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? {} : undefined,
      connectionLimit: this.config.connectionLimit || 20,
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const [rows] = await this.pool.execute(sql, params);
    return {
      rows: Array.isArray(rows) ? rows : [rows],
      rowCount: Array.isArray(rows) ? rows.length : 1
    };
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private adapter: DatabaseAdapter | null = null;

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (config.type === 'postgresql') {
      this.adapter = new PostgreSQLAdapter(config);
    } else if (config.type === 'mysql') {
      this.adapter = new MySQLAdapter(config);
    } else {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    await this.adapter.connect();
  }

  getAdapter(): DatabaseAdapter {
    if (!this.adapter) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.adapter) return false;
    return this.adapter.healthCheck();
  }

  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
    }
  }
}

export const db = DatabaseManager.getInstance();