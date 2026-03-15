// Configure platform settings
import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '../../../../config/manager';

export async function POST(request: NextRequest) {
  try {
    const { dbConfig, platformConfig } = await request.json();

    const config = configManager.loadConfig();

    // Update database configuration
    config.database = {
      ...config.database,
      ...dbConfig
    };

    // Update platform settings
    config.platform = {
      ...config.platform,
      ...platformConfig
    };

    // Save configuration
    configManager.updateConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Configuration failed' },
      { status: 500 }
    );
  }
}