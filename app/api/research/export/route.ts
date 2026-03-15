import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { ResearchService } from '../../../../lib/services/researchService';
import { ResearchMetricType } from '../../../../types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const includeAnonymized = searchParams.get('anonymized') === 'true';

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use json or csv' }, { status: 400 });
  }

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

    // Check if user is admin (you might want to implement proper admin role checking)
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminCheck?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse dates
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const dateRange = {
      start: new Date(startDate).toISOString(),
      end: new Date(endDate).toISOString()
    };

    // Export research data
    const exportData = await ResearchService.exportResearchData({
      studyId: 'default', // Default study ID for now
      format: format as 'json' | 'csv',
      dateRange
    });

    if (!exportData) {
      return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
    }

    // Set appropriate headers
    const headers = new Headers();
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="solace-research-${timestamp}.json"`);
    } else {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="solace-research-${timestamp}.csv"`);
    }

    if (format === 'csv') {
      return new NextResponse(typeof exportData === 'string' ? exportData : (exportData.data as string), { headers });
    }

    return NextResponse.json(exportData, { headers });
  } catch (error) {
    console.error('Error in research data export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { metricType, data, metadata } = body as {
    metricType: ResearchMetricType;
    data: Record<string, any>;
    metadata?: Record<string, any>;
  };

  if (!metricType || !data) {
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

    // Record research metric
    const success = await ResearchService.recordResearchMetric({
      metricType,
      data,
      metadata: metadata || {},
      recordedBy: user.id
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording research metric:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}