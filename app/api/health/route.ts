// Health check endpoint
// Basic health check for load balancers and monitoring

import { NextResponse } from 'next/server';
import { db } from '../../../database/adapter';
import { configManager } from '../../../config/manager';

export async function GET() {
  try {
    const config = configManager.getConfig();

    // Check database health
    let databaseHealthy = false;
    try {
      databaseHealthy = await db.healthCheck();
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check if platform is configured
    const platformConfigured = !!(config.platform && config.platform.name);

    // Check if admin token exists
    const adminConfigured = !!(config.platform && config.platform.adminToken);

    const isHealthy = databaseHealthy && platformConfigured;

    const status = isHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      version: '7.0.0',
      checks: {
        database: databaseHealthy ? 'healthy' : 'unhealthy',
        platform: platformConfigured ? 'configured' : 'not_configured',
        admin: adminConfigured ? 'configured' : 'not_configured'
      }
    }, {
      status: isHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}