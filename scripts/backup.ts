// Solace V7 Backup System
// Automated database and configuration backups

import { existsSync, mkdirSync, writeFileSync, createReadStream, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export interface BackupOptions {
  includeDatabase?: boolean;
  includeConfig?: boolean;
  includeUploads?: boolean;
  includeLogs?: boolean;
  compression?: boolean;
  destination?: string;
}

export class BackupManager {
  private backupDir: string;

  constructor() {
    this.backupDir = join(process.cwd(), 'backups');
    this.ensureBackupDir();
  }

  async createBackup(options: BackupOptions = {}): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `solace-backup-${timestamp}`;
    const backupPath = join(this.backupDir, backupName);

    console.log(`📦 Creating backup: ${backupName}`);

    try {
      // Create backup directory
      mkdirSync(backupPath, { recursive: true });

      // Backup database
      if (options.includeDatabase !== false) {
        await this.backupDatabase(backupPath);
      }

      // Backup configuration
      if (options.includeConfig !== false) {
        await this.backupConfiguration(backupPath);
      }

      // Backup uploads
      if (options.includeUploads !== false) {
        await this.backupUploads(backupPath);
      }

      // Backup logs
      if (options.includeLogs !== false) {
        await this.backupLogs(backupPath);
      }

      // Create manifest
      await this.createManifest(backupPath, options);

      // Compress if requested
      if (options.compression) {
        return await this.compressBackup(backupPath, backupName);
      }

      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    console.log(`🔄 Restoring backup: ${backupPath}`);

    try {
      // Decompress if needed
      const actualPath = backupPath.endsWith('.tar.gz') || backupPath.endsWith('.zip')
        ? await this.decompressBackup(backupPath)
        : backupPath;

      // Restore database
      if (existsSync(join(actualPath, 'database.sql'))) {
        await this.restoreDatabase(actualPath);
      }

      // Restore configuration
      if (existsSync(join(actualPath, 'config'))) {
        await this.restoreConfiguration(actualPath);
      }

      // Restore uploads
      if (existsSync(join(actualPath, 'uploads'))) {
        await this.restoreUploads(actualPath);
      }

      console.log('✅ Backup restored successfully');

    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const fs = require('fs');
      const items = fs.readdirSync(this.backupDir);
      return items.filter((item: string) => item.startsWith('solace-backup-'));
    } catch (error) {
      return [];
    }
  }

  async cleanupOldBackups(keepDays: number = 30): Promise<void> {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    for (const backup of backups) {
      const backupPath = join(this.backupDir, backup);
      try {
        const stats = require('fs').statSync(backupPath);
        if (stats.mtime < cutoffDate) {
          require('fs').rmSync(backupPath, { recursive: true, force: true });
          console.log(`🗑️  Removed old backup: ${backup}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not remove backup ${backup}:`, error);
      }
    }
  }

  private ensureBackupDir(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private async backupDatabase(backupPath: string): Promise<void> {
    console.log('💾 Backing up database...');

    const config = configManager.getConfig();
    const adapter = db.getAdapter();

    if (adapter.constructor.name === 'PostgreSQLAdapter') {
      // PostgreSQL dump
      const dumpCommand = `pg_dump --host=${config.database.host} --port=${config.database.port} --username=${config.database.username} --dbname=${config.database.database} --no-password --format=custom --compress=9 --file=${join(backupPath, 'database.dump')}`;

      // Set password environment variable
      const env = { ...process.env, PGPASSWORD: config.database.password };
      execSync(dumpCommand, { env, stdio: 'inherit' });

    } else if (adapter.constructor.name === 'MySQLAdapter') {
      // MySQL dump
      const dumpCommand = `mysqldump --host=${config.database.host} --port=${config.database.port} --user=${config.database.username} --password=${config.database.password} ${config.database.database} > ${join(backupPath, 'database.sql')}`;

      execSync(dumpCommand, { stdio: 'inherit' });
    }

    console.log('✅ Database backup completed');
  }

  private async backupConfiguration(backupPath: string): Promise<void> {
    console.log('⚙️  Backing up configuration...');

    const configDir = join(backupPath, 'config');
    mkdirSync(configDir, { recursive: true });

    // Copy .env file
    if (existsSync('.env')) {
      require('fs').copyFileSync('.env', join(configDir, '.env'));
    }

    // Copy config files
    if (existsSync('config.json')) {
      require('fs').copyFileSync('config.json', join(configDir, 'config.json'));
    }

    console.log('✅ Configuration backup completed');
  }

  private async backupUploads(backupPath: string): Promise<void> {
    console.log('📁 Backing up uploads...');

    const uploadsDir = 'uploads';
    if (existsSync(uploadsDir)) {
      const backupUploadsDir = join(backupPath, 'uploads');
      mkdirSync(backupUploadsDir, { recursive: true });

      // Copy uploads directory
      execSync(`cp -r ${uploadsDir}/* ${backupUploadsDir}/`, { stdio: 'inherit' });
    }

    console.log('✅ Uploads backup completed');
  }

  private async backupLogs(backupPath: string): Promise<void> {
    console.log('📋 Backing up logs...');

    const logsDir = 'logs';
    if (existsSync(logsDir)) {
      const backupLogsDir = join(backupPath, 'logs');
      mkdirSync(backupLogsDir, { recursive: true });

      // Copy logs directory
      execSync(`cp -r ${logsDir}/* ${backupLogsDir}/`, { stdio: 'inherit' });
    }

    console.log('✅ Logs backup completed');
  }

  private async createManifest(backupPath: string, options: BackupOptions): Promise<void> {
    const manifest = {
      version: '7.0.0',
      timestamp: new Date().toISOString(),
      platform: configManager.getConfig().platform,
      options,
      contents: []
    };

    // Check what was backed up
    const fs = require('fs');
    const items = fs.readdirSync(backupPath);

    for (const item of items) {
      const itemPath = join(backupPath, item);
      const stats = fs.statSync(itemPath);

      manifest.contents.push({
        name: item,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    }

    writeFileSync(
      join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  private async compressBackup(backupPath: string, backupName: string): Promise<string> {
    console.log('🗜️  Compressing backup...');

    const archivePath = join(this.backupDir, `${backupName}.tar.gz`);

    // Create compressed archive
    execSync(`tar -czf ${archivePath} -C ${dirname(backupPath)} ${backupName}`, { stdio: 'inherit' });

    // Remove uncompressed directory
    require('fs').rmSync(backupPath, { recursive: true, force: true });

    console.log('✅ Backup compressed');
    return archivePath;
  }

  private async decompressBackup(archivePath: string): Promise<string> {
    console.log('📦 Decompressing backup...');

    const extractPath = archivePath.replace('.tar.gz', '').replace('.zip', '');

    if (archivePath.endsWith('.tar.gz')) {
      execSync(`tar -xzf ${archivePath} -C ${this.backupDir}`, { stdio: 'inherit' });
    } else if (archivePath.endsWith('.zip')) {
      execSync(`unzip ${archivePath} -d ${this.backupDir}`, { stdio: 'inherit' });
    }

    console.log('✅ Backup decompressed');
    return extractPath;
  }

  private async restoreDatabase(backupPath: string): Promise<void> {
    console.log('💾 Restoring database...');

    const config = configManager.getConfig();
    const dumpFile = join(backupPath, 'database.dump');
    const sqlFile = join(backupPath, 'database.sql');

    if (existsSync(dumpFile)) {
      // PostgreSQL restore
      const restoreCommand = `pg_restore --host=${config.database.host} --port=${config.database.port} --username=${config.database.username} --dbname=${config.database.database} --no-password --clean --if-exists ${dumpFile}`;

      const env = { ...process.env, PGPASSWORD: config.database.password };
      execSync(restoreCommand, { env, stdio: 'inherit' });

    } else if (existsSync(sqlFile)) {
      // MySQL restore
      const restoreCommand = `mysql --host=${config.database.host} --port=${config.database.port} --user=${config.database.username} --password=${config.database.password} ${config.database.database} < ${sqlFile}`;

      execSync(restoreCommand, { stdio: 'inherit' });
    }

    console.log('✅ Database restored');
  }

  private async restoreConfiguration(backupPath: string): Promise<void> {
    console.log('⚙️  Restoring configuration...');

    const configDir = join(backupPath, 'config');

    // Restore .env file
    const envFile = join(configDir, '.env');
    if (existsSync(envFile)) {
      require('fs').copyFileSync(envFile, '.env');
    }

    // Restore config.json
    const configFile = join(configDir, 'config.json');
    if (existsSync(configFile)) {
      require('fs').copyFileSync(configFile, 'config.json');
    }

    console.log('✅ Configuration restored');
  }

  private async restoreUploads(backupPath: string): Promise<void> {
    console.log('📁 Restoring uploads...');

    const uploadsDir = join(backupPath, 'uploads');
    if (existsSync(uploadsDir)) {
      const targetDir = 'uploads';
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      execSync(`cp -r ${uploadsDir}/* ${targetDir}/`, { stdio: 'inherit' });
    }

    console.log('✅ Uploads restored');
  }
}

export const backupManager = new BackupManager();