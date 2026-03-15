// V7 Automated Installation System
// Self-host setup and configuration

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { configManager } from '../config/manager';
import { db } from '../database/adapter';
import { migrationManager } from '../database/migrations';

export interface InstallOptions {
  database: {
    type: 'postgresql' | 'mysql';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  admin: {
    email?: string;
    generateToken: boolean;
  };
  platform: {
    name: string;
    features: string[];
  };
}

export class Installer {
  private static readonly REQUIRED_NODE_VERSION = '18.0.0';
  private installDir: string;

  constructor() {
    this.installDir = join(process.cwd(), 'install');
  }

  async runInstallation(options: Partial<InstallOptions> = {}): Promise<void> {
    console.log('🚀 Starting Solace V7 Installation...\n');

    try {
      // Step 1: Check prerequisites
      await this.checkPrerequisites();

      // Step 2: Configure database
      const dbConfig = await this.configureDatabase(options.database);

      // Step 3: Initialize configuration
      await this.initializeConfiguration(dbConfig, options);

      // Step 4: Run database migrations
      await this.runMigrations();

      // Step 5: Create admin access
      await this.createAdminAccess(options.admin);

      // Step 6: Initialize platform settings
      await this.initializePlatformSettings(options.platform);

      // Step 7: Generate startup scripts
      await this.generateStartupScripts();

      console.log('\n✅ Installation completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Review your .env configuration file');
      console.log('2. Start the application: npm run dev');
      console.log('3. Access the admin panel with your generated token');

    } catch (error) {
      console.error('\n❌ Installation failed:', error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    if (!this.isVersionCompatible(nodeVersion, this.REQUIRED_NODE_VERSION)) {
      throw new Error(`Node.js ${this.REQUIRED_NODE_VERSION} or higher is required. Current: ${nodeVersion}`);
    }
    console.log(`✅ Node.js version: ${nodeVersion}`);

    // Check if .env already exists
    if (existsSync('.env')) {
      console.log('⚠️  .env file already exists. Installation will update existing configuration.');
    }

    // Check database connectivity (if config provided)
    console.log('✅ Prerequisites check completed');
  }

  private async configureDatabase(dbOptions?: InstallOptions['database']): Promise<any> {
    console.log('🗄️  Configuring database...');

    const dbConfig = dbOptions || await this.promptDatabaseConfig();

    // Test connection
    try {
      await db.initialize(dbConfig);
      const isHealthy = await db.healthCheck();

      if (!isHealthy) {
        throw new Error('Database connection test failed');
      }

      console.log('✅ Database connection established');
      return dbConfig;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  private async initializeConfiguration(dbConfig: any, options: Partial<InstallOptions>): Promise<void> {
    console.log('⚙️  Initializing configuration...');

    const config = configManager.loadConfig();

    // Update database configuration
    config.database = {
      ...config.database,
      ...dbConfig
    };

    // Set platform settings
    if (options.platform) {
      config.platform.name = options.platform.name || config.platform.name;
      // Configure features based on options
    }

    // Save configuration
    configManager.updateConfig(config);

    console.log('✅ Configuration initialized');
  }

  private async runMigrations(): Promise<void> {
    console.log('🛠️  Running database migrations...');

    try {
      await migrationManager.runMigrations();
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async createAdminAccess(adminOptions?: InstallOptions['admin']): Promise<void> {
    console.log('👑 Creating admin access...');

    const config = configManager.getConfig();

    if (adminOptions?.generateToken || !config.platform.adminToken) {
      const adminToken = this.generateAdminToken();

      configManager.updateConfig({
        platform: {
          ...config.platform,
          adminToken
        }
      });

      console.log('✅ Admin token generated');
      console.log(`🔑 Admin Token: ${adminToken}`);
      console.log('⚠️  Save this token securely - it provides full admin access!');
    }

    // Create initial admin user in database
    try {
      const adapter = db.getAdapter();
      const adminUser = {
        role: 'admin',
        is_active: true,
        last_active: new Date().toISOString()
      };

      await adapter.query(
        'INSERT INTO users (role, is_active, last_active) VALUES (?, ?, ?)',
        [adminUser.role, adminUser.is_active, adminUser.last_active]
      );

      console.log('✅ Admin user created in database');
    } catch (error) {
      console.warn('⚠️  Could not create admin user (might already exist):', error);
    }
  }

  private async initializePlatformSettings(platformOptions?: InstallOptions['platform']): Promise<void> {
    console.log('🏗️  Initializing platform settings...');

    // Create default platform settings
    const defaultSettings = {
      platform_name: platformOptions?.name || 'Solace',
      version: '7.0.0',
      installation_date: new Date().toISOString(),
      features_enabled: JSON.stringify(platformOptions?.features || [
        'anonymous_chat',
        'counselor_matching',
        'panic_button',
        'mood_tracking',
        'support_circles',
        'analytics'
      ])
    };

    try {
      const adapter = db.getAdapter();

      // Create settings table if it doesn't exist
      const createTableSQL = adapter.constructor.name === 'PostgreSQLAdapter'
        ? `
          CREATE TABLE IF NOT EXISTS platform_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
        : `
          CREATE TABLE IF NOT EXISTS platform_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `;

      await adapter.query(createTableSQL);

      // Insert default settings
      for (const [key, value] of Object.entries(defaultSettings)) {
        await adapter.query(
          'INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = ?',
          [key, String(value), String(value)]
        );
      }

      console.log('✅ Platform settings initialized');
    } catch (error) {
      console.error('❌ Failed to initialize platform settings:', error);
      throw error;
    }
  }

  private async generateStartupScripts(): Promise<void> {
    console.log('📜 Generating startup scripts...');

    // Create start script for different environments
    const scripts = {
      'start.sh': `#!/bin/bash
# Solace V7 Startup Script

echo "Starting Solace V7..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please run 'npm run setup' first."
    exit 1
fi

# Start the application
npm run start
`,
      'start-docker.sh': `#!/bin/bash
# Solace V7 Docker Startup Script

echo "Starting Solace V7 with Docker..."

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo "Error: docker-compose.yml not found."
    exit 1
fi

# Start with Docker Compose
docker compose up -d
`,
      'check-health.sh': `#!/bin/bash
# Solace V7 Health Check Script

echo "Checking Solace V7 health..."

# Check if application is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Application is healthy"
else
    echo "❌ Application is not responding"
    exit 1
fi

# Check database
if curl -s http://localhost:3000/api/status | grep -q '"database":"healthy"'; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed"
fi
`
    };

    // Write scripts to disk
    for (const [filename, content] of Object.entries(scripts)) {
      const scriptPath = join(process.cwd(), filename);
      writeFileSync(scriptPath, content, 'utf8');

      // Make scripts executable on Unix systems
      if (process.platform !== 'win32') {
        try {
          execSync(`chmod +x ${scriptPath}`);
        } catch (error) {
          // Ignore chmod errors on some systems
        }
      }
    }

    console.log('✅ Startup scripts generated');
  }

  private async promptDatabaseConfig(): Promise<InstallOptions['database']> {
    // In a real implementation, this would use readline or inquirer
    // For now, return default config
    console.log('📝 Using default database configuration...');

    return {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'solace',
      username: 'solace',
      password: 'password'
    };
  }

  private isVersionCompatible(current: string, required: string): boolean {
    const currentParts = current.replace('v', '').split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < requiredParts.length; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }

    return true;
  }

  private generateAdminToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

export const installer = new Installer();