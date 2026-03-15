#!/usr/bin/env node

// Solace V7 Backup CLI
// Command-line interface for backup operations

import { backupManager } from './backup.ts';

async function main() {
  const command = process.argv[2];
  const options = process.argv.slice(3);

  switch (command) {
    case 'create':
      await createBackup(options);
      break;

    case 'restore':
      await restoreBackup(options);
      break;

    case 'list':
      await listBackups();
      break;

    case 'cleanup':
      await cleanupBackups(options);
      break;

    default:
      showHelp();
      break;
  }
}

async function createBackup(options: string[]) {
  const includeDatabase = !options.includes('--no-db');
  const includeConfig = !options.includes('--no-config');
  const includeUploads = !options.includes('--no-uploads');
  const includeLogs = !options.includes('--no-logs');
  const compression = options.includes('--compress');

  console.log('🚀 Creating Solace backup...');

  try {
    const backupPath = await backupManager.createBackup({
      includeDatabase,
      includeConfig,
      includeUploads,
      includeLogs,
      compression
    });

    console.log(`✅ Backup created: ${backupPath}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

async function restoreBackup(options: string[]) {
  if (options.length === 0) {
    console.error('❌ Please specify backup path or name');
    process.exit(1);
  }

  const backupName = options[0];
  console.log(`🔄 Restoring backup: ${backupName}`);

  try {
    await backupManager.restoreBackup(backupName);
    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

async function listBackups() {
  try {
    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      console.log('📂 No backups found');
      return;
    }

    console.log('📦 Available backups:');
    backups.forEach(backup => {
      console.log(`  - ${backup}`);
    });
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    process.exit(1);
  }
}

async function cleanupBackups(options: string[]) {
  const keepDays = parseInt(options.find(opt => opt.startsWith('--days='))?.split('=')[1] || '30');

  console.log(`🧹 Cleaning up backups older than ${keepDays} days...`);

  try {
    await backupManager.cleanupOldBackups(keepDays);
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log('Solace V7 Backup CLI');
  console.log('===================');
  console.log('');
  console.log('Usage: node scripts/backup.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  create    Create a new backup');
  console.log('  restore   Restore from backup');
  console.log('  list      List available backups');
  console.log('  cleanup   Remove old backups');
  console.log('');
  console.log('Create options:');
  console.log('  --no-db       Exclude database');
  console.log('  --no-config   Exclude configuration');
  console.log('  --no-uploads  Exclude uploads');
  console.log('  --no-logs     Exclude logs');
  console.log('  --compress    Compress backup');
  console.log('');
  console.log('Cleanup options:');
  console.log('  --days=N      Keep backups for N days (default: 30)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/backup.js create');
  console.log('  node scripts/backup.js create --compress --no-logs');
  console.log('  node scripts/backup.js restore backups/solace-backup-2024-01-01');
  console.log('  node scripts/backup.js list');
  console.log('  node scripts/backup.js cleanup --days=7');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}