// Create admin access
import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '../../../../config/manager';

export async function POST(request: NextRequest) {
  try {
    const { email, generateToken } = await request.json();

    const config = configManager.getConfig();

    let adminToken = config.platform.adminToken;

    if (generateToken && !adminToken) {
      adminToken = require('crypto').randomBytes(32).toString('hex');

      configManager.updateConfig({
        platform: {
          ...config.platform,
          adminToken
        }
      });
    }

    return NextResponse.json({
      success: true,
      adminToken: generateToken ? adminToken : undefined
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin creation failed' },
      { status: 500 }
    );
  }
}