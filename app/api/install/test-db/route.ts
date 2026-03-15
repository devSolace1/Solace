// Test database connection
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../database/adapter';

export async function POST(request: NextRequest) {
  try {
    const dbConfig = await request.json();

    // Initialize database with provided config
    await db.initialize(dbConfig);

    // Test connection
    const isHealthy = await db.healthCheck();

    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Database connection test failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database test failed' },
      { status: 500 }
    );
  }
}