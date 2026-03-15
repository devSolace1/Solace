// Run automated installation
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { dbConfig, platformConfig, adminEmail, generateAdminToken } = await request.json();

    const options = {
      database: dbConfig,
      platform: platformConfig,
      admin: {
        email: adminEmail,
        generateToken: generateAdminToken
      }
    };

    await installer.runInstallation(options);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Installation failed' },
      { status: 500 }
    );
  }
}