import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../lib/supabaseServer';

export async function GET() {
  const supabase = getSupabaseServer();

  try {
    // Basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: false,
        api: true
      }
    };

    // Check database connectivity
    if (supabase) {
      try {
        const { error } = await supabase.from('users').select('count').limit(1).single();
        checks.checks.database = !error;
      } catch (dbError) {
        checks.checks.database = false;
        checks.status = 'degraded';
      }
    } else {
      checks.checks.database = false;
      checks.status = 'unhealthy';
    }

    // If database is down, mark overall status as unhealthy
    if (!checks.checks.database) {
      checks.status = 'unhealthy';
    }

    const statusCode = checks.status === 'healthy' ? 200 :
                      checks.status === 'degraded' ? 200 : 503;

    return NextResponse.json(checks, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed'
    }, { status: 503 });
  }
}