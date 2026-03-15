// V7 Configuration Management System
// Dynamic configuration for self-hosting

import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface PlatformConfig {
  // Database
  database: {
    type: 'postgresql' | 'mysql';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    connectionLimit: number;
  };

  // Server
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production';
    corsOrigins: string[];
  };

  // Realtime
  realtime: {
    enabled: boolean;
    port: number;
    maxConnections: number;
    heartbeatInterval: number;
  };

  // Security
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    sessionTimeout: number;
    rateLimitWindow: number;
    rateLimitMax: number;
  };

  // Platform
  platform: {
    name: string;
    version: string;
    adminToken: string;
    features: {
      anonymousChat: boolean;
      counselorMatching: boolean;
      panicButton: boolean;
      moodTracking: boolean;
      supportCircles: boolean;
      analytics: boolean;
      researchExport: boolean;
    };
  };

  // External Services (optional)
  external: {
    supabase?: {
      url: string;
      anonKey: string;
    };
    redis?: {
      host: string;
      port: number;
      password?: string;
    };
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: PlatformConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = join(process.cwd(), '.env');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  loadConfig(): PlatformConfig {
    if (this.config) return this.config;

    // Load environment variables
    config({ path: this.configPath });

    this.config = {
      database: {
        type: (process.env.DB_TYPE as 'postgresql' | 'mysql') || 'postgresql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'solace',
        username: process.env.DB_USER || 'solace',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20')
      },

      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')
      },

      realtime: {
        enabled: process.env.REALTIME_ENABLED !== 'false',
        port: parseInt(process.env.REALTIME_PORT || '3001'),
        maxConnections: parseInt(process.env.REALTIME_MAX_CONNECTIONS || '1000'),
        heartbeatInterval: parseInt(process.env.REALTIME_HEARTBEAT_INTERVAL || '30000')
      },

      security: {
        jwtSecret: process.env.JWT_SECRET || this.generateSecret(),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
      },

      platform: {
        name: process.env.PLATFORM_NAME || 'Solace',
        version: process.env.PLATFORM_VERSION || '7.0.0',
        adminToken: process.env.ADMIN_TOKEN || this.generateAdminToken(),
        features: {
          anonymousChat: process.env.FEATURE_ANONYMOUS_CHAT !== 'false',
          counselorMatching: process.env.FEATURE_COUNSELOR_MATCHING !== 'false',
          panicButton: process.env.FEATURE_PANIC_BUTTON !== 'false',
          moodTracking: process.env.FEATURE_MOOD_TRACKING !== 'false',
          supportCircles: process.env.FEATURE_SUPPORT_CIRCLES !== 'false',
          analytics: process.env.FEATURE_ANALYTICS !== 'false',
          researchExport: process.env.FEATURE_RESEARCH_EXPORT !== 'false'
        }
      },

      external: {
        supabase: process.env.SUPABASE_URL ? {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY || ''
        } : undefined,
        redis: process.env.REDIS_HOST ? {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        } : undefined
      }
    };

    return this.config;
  }

  saveConfig(): void {
    if (!this.config) return;

    const envContent = this.generateEnvFile();
    writeFileSync(this.configPath, envContent, 'utf8');
  }

  updateConfig(updates: Partial<PlatformConfig>): void {
    if (!this.config) this.loadConfig();

    this.config = this.deepMerge(this.config!, updates);
    this.saveConfig();
  }

  getConfig(): PlatformConfig {
    return this.loadConfig();
  }

  isSelfHostMode(): boolean {
    const config = this.getConfig();
    return !config.external.supabase;
  }

  private generateEnvFile(): string {
    const config = this.config!;
    const lines: string[] = [];

    lines.push('# V7 Solace Platform Configuration');
    lines.push('# Generated automatically - do not edit manually');
    lines.push('');

    // Database
    lines.push('# Database Configuration');
    lines.push(`DB_TYPE=${config.database.type}`);
    lines.push(`DB_HOST=${config.database.host}`);
    lines.push(`DB_PORT=${config.database.port}`);
    lines.push(`DB_NAME=${config.database.database}`);
    lines.push(`DB_USER=${config.database.username}`);
    lines.push(`DB_PASSWORD=${config.database.password}`);
    lines.push(`DB_SSL=${config.database.ssl}`);
    lines.push(`DB_CONNECTION_LIMIT=${config.database.connectionLimit}`);
    lines.push('');

    // Server
    lines.push('# Server Configuration');
    lines.push(`PORT=${config.server.port}`);
    lines.push(`HOST=${config.server.host}`);
    lines.push(`NODE_ENV=${config.server.environment}`);
    lines.push(`CORS_ORIGINS=${config.server.corsOrigins.join(',')}`);
    lines.push('');

    // Realtime
    lines.push('# Realtime Configuration');
    lines.push(`REALTIME_ENABLED=${config.realtime.enabled}`);
    lines.push(`REALTIME_PORT=${config.realtime.port}`);
    lines.push(`REALTIME_MAX_CONNECTIONS=${config.realtime.maxConnections}`);
    lines.push(`REALTIME_HEARTBEAT_INTERVAL=${config.realtime.heartbeatInterval}`);
    lines.push('');

    // Security
    lines.push('# Security Configuration');
    lines.push(`JWT_SECRET=${config.security.jwtSecret}`);
    lines.push(`JWT_EXPIRES_IN=${config.security.jwtExpiresIn}`);
    lines.push(`BCRYPT_ROUNDS=${config.security.bcryptRounds}`);
    lines.push(`SESSION_TIMEOUT=${config.security.sessionTimeout}`);
    lines.push(`RATE_LIMIT_WINDOW=${config.security.rateLimitWindow}`);
    lines.push(`RATE_LIMIT_MAX=${config.security.rateLimitMax}`);
    lines.push('');

    // Platform
    lines.push('# Platform Configuration');
    lines.push(`PLATFORM_NAME=${config.platform.name}`);
    lines.push(`PLATFORM_VERSION=${config.platform.version}`);
    lines.push(`ADMIN_TOKEN=${config.platform.adminToken}`);
    lines.push(`FEATURE_ANONYMOUS_CHAT=${config.platform.features.anonymousChat}`);
    lines.push(`FEATURE_COUNSELOR_MATCHING=${config.platform.features.counselorMatching}`);
    lines.push(`FEATURE_PANIC_BUTTON=${config.platform.features.panicButton}`);
    lines.push(`FEATURE_MOOD_TRACKING=${config.platform.features.moodTracking}`);
    lines.push(`FEATURE_SUPPORT_CIRCLES=${config.platform.features.supportCircles}`);
    lines.push(`FEATURE_ANALYTICS=${config.platform.features.analytics}`);
    lines.push(`FEATURE_RESEARCH_EXPORT=${config.platform.features.researchExport}`);
    lines.push('');

    // External Services
    if (config.external.supabase) {
      lines.push('# External Services');
      lines.push(`SUPABASE_URL=${config.external.supabase.url}`);
      lines.push(`SUPABASE_ANON_KEY=${config.external.supabase.anonKey}`);
    }

    if (config.external.redis) {
      lines.push(`REDIS_HOST=${config.external.redis.host}`);
      lines.push(`REDIS_PORT=${config.external.redis.port}`);
      if (config.external.redis.password) {
        lines.push(`REDIS_PASSWORD=${config.external.redis.password}`);
      }
    }

    return lines.join('\n');
  }

  private generateSecret(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }

  private generateAdminToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result: Record<string, any> = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue as Record<string, any>, sourceValue as Record<string, any>);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result as T;
  }

  private isObject(item: any): item is Record<string, any> {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

export const configManager = ConfigManager.getInstance();