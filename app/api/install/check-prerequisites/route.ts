// V7 Installer API Routes
// Backend endpoints for the installation process

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '18.0.0';

    const isCompatible = checkVersionCompatibility(nodeVersion, requiredVersion);

    if (!isCompatible) {
      return NextResponse.json(
        { error: `Node.js ${requiredVersion} or higher required. Current: ${nodeVersion}` },
        { status: 400 }
      );
    }

    // Check if .env exists
    const fs = require('fs');
    const envExists = fs.existsSync('.env');

    return NextResponse.json({
      nodeVersion,
      requiredVersion,
      compatible: isCompatible,
      envExists
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Prerequisites check failed' },
      { status: 500 }
    );
  }
}

function checkVersionCompatibility(current: string, required: string): boolean {
  const currentParts = current.replace('v', '').split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < requiredParts.length; i++) {
    if (currentParts[i] > requiredParts[i]) return true;
    if (currentParts[i] < requiredParts[i]) return false;
  }

  return true;
}