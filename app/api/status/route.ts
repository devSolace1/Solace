// Status endpoint
// Detailed platform status for admin dashboard and monitoring

import { NextResponse } from 'next/server';
import { db } from '../../../database/adapter';
import { configManager } from '../../../config/manager';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const config = configManager.getConfig();

    // Database status
    let databaseStatus = { status: 'unknown', details: {} };
    try {
      const isHealthy = await db.healthCheck();
      databaseStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          type: config.database?.type || 'unknown',
          host: config.database?.host || 'unknown',
          connected: isHealthy
        }
      };
    } catch (error) {
      databaseStatus = {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Platform configuration status
    const platformStatus = {
      configured: !!(config.platform && config.platform.name),
      name: config.platform?.name || 'Not configured',
      version: '7.0.0',
      features: config.platform?.features || [],
      adminConfigured: !!(config.platform && config.platform.adminToken)
    };

    // File system status
    const fsStatus = {
      envFile: existsSync('.env'),
      configFile: existsSync('config.json'),
      installDir: existsSync('install'),
      logs: {
        available: existsSync('logs'),
        size: existsSync('logs') ? getDirectorySize('logs') : 0
      }
    };

    // System information
    const systemStatus = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    // Overall status
    const isHealthy = databaseStatus.status === 'healthy' && platformStatus.configured;
    const status = isHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      platform: platformStatus,
      database: databaseStatus,
      filesystem: fsStatus,
      system: systemStatus
    }, {
      status: isHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Status check failed'
    }, {
      status: 500
    });
  }
}

function getDirectorySize(dirPath: string): number {
  try {
    let totalSize = 0;
    const items = require('fs').readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  } catch (error) {
    return 0;
  }
}