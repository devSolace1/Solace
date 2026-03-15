import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { PlatformMonitoringService } from '../../../../lib/services/platformMonitoringService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'health';
  const timeframe = searchParams.get('timeframe') || '24h';

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user and check admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminCheck?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    let result;

    switch (type) {
      case 'health':
        result = await PlatformMonitoringService.getHealthStatus();
        break;
      case 'metrics':
        result = await PlatformMonitoringService.getMetricsSummary(timeframe);
        break;
      case 'alerts':
        result = await PlatformMonitoringService.getActiveAlerts();
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in platform monitoring:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { metricType, value, metadata } = body as {
    metricType: string;
    value: number;
    metadata?: Record<string, any>;
  };

  if (!metricType || value === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Record metric
    const success = await PlatformMonitoringService.recordMetric({
      metricType,
      value,
      metadata: metadata || {},
      recordedBy: user.id
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording platform metric:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}