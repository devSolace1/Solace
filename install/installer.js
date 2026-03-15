#!/usr/bin/env node

// Solace V7 CLI Installer
// Command-line interface for automated installation

import { installer } from './installer.ts';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function runCLIInstallation() {
  console.log('🚀 Solace V7 CLI Installer');
  console.log('========================\n');

  try {
    // Database configuration
    console.log('Database Configuration:');
    const dbType = await question('Database type (postgresql/mysql) [postgresql]: ') || 'postgresql';
    const dbHost = await question('Database host [localhost]: ') || 'localhost';
    const dbPort = parseInt(await question(`Database port [${dbType === 'postgresql' ? '5432' : '3306'}]: `) || (dbType === 'postgresql' ? '5432' : '3306').toString());
    const dbName = await question('Database name [solace]: ') || 'solace';
    const dbUser = await question('Database username [solace]: ') || 'solace';
    const dbPass = await question('Database password: ') || '';

    if (!dbPass) {
      console.log('❌ Database password is required');
      process.exit(1);
    }

    // Platform configuration
    console.log('\nPlatform Configuration:');
    const platformName = await question('Platform name [Solace]: ') || 'Solace';

    // Features
    console.log('\nAvailable Features:');
    console.log('1. Anonymous Chat Support');
    console.log('2. Counselor Matching');
    console.log('3. Panic Button');
    console.log('4. Mood Tracking');
    console.log('5. Support Circles');
    console.log('6. Analytics Dashboard');
    console.log('7. Journaling');
    console.log('8. Content Moderation');

    const featuresInput = await question('Select features (comma-separated numbers) [all]: ') || '1,2,3,4,5,6,7,8';
    const selectedFeatures = featuresInput.split(',').map(n => parseInt(n.trim()) - 1);
    const allFeatures = [
      'anonymous_chat', 'counselor_matching', 'panic_button', 'mood_tracking',
      'support_circles', 'analytics', 'journal', 'moderation'
    ];
    const enabledFeatures = selectedFeatures.map(i => allFeatures[i]).filter(Boolean);

    // Admin configuration
    console.log('\nAdmin Configuration:');
    const adminEmail = await question('Admin email (optional): ') || '';
    const generateToken = (await question('Generate admin token? (y/n) [y]: ') || 'y').toLowerCase() === 'y';

    // Run installation
    const options = {
      database: {
        type: dbType as 'postgresql' | 'mysql',
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUser,
        password: dbPass
      },
      admin: {
        email: adminEmail,
        generateToken
      },
      platform: {
        name: platformName,
        features: enabledFeatures
      }
    };

    await installer.runInstallation(options);

  } catch (error) {
    console.error('\n❌ Installation failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLIInstallation();
}

export { runCLIInstallation };