import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { CrisisDetectionService } from '../../../../lib/services/crisisDetectionService';
import { SecurityService } from '../../../../lib/services/securityService';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, alertType, detectionMethod, riskIndicators } = body as {
    sessionId: string;
    alertType?: string;
    detectionMethod: string;
    riskIndicators?: Record<string, any>;
  };

  if (!sessionId || !detectionMethod) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get session and user info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('participant_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Determine alert type and severity if not provided
    let finalAlertType: string | undefined = alertType;
    let severity: string = 'medium';

    if (!finalAlertType && riskIndicators?.message) {
      const detection = CrisisDetectionService.detectCrisis(riskIndicators.message);
      if (detection.detected) {
        finalAlertType = detection.alertType;
        severity = detection.severity || 'medium';
      }
    }

    if (!finalAlertType) {
      return NextResponse.json({ error: 'No crisis detected' }, { status: 400 });
    }

    // Create crisis alert
    const { data: alert, error: alertError } = await supabase
      .from('crisis_alerts_v4')
      .insert({
        session_id: sessionId,
        user_id: session.participant_id,
        alert_type: finalAlertType,
        severity,
        detection_method: detectionMethod,
        risk_indicators: riskIndicators || {},
        status: 'active'
      })
      .select()
      .single();

    if (alertError) {
      console.error('Error creating crisis alert:', alertError);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    // Check if escalation is needed
    const shouldEscalate = CrisisDetectionService.shouldEscalate({
      detected: true,
      alertType: finalAlertType as any,
      severity: severity as any,
      indicators: riskIndicators || {}
    });

    if (shouldEscalate) {
      // Find available counselor with crisis training
      const { data: counselors, error: counselorError } = await supabase
        .from('counselor_profiles')
        .select('user_id')
        .eq('verification_status', 'verified')
        .eq('crisis_training', true)
        .eq('emergency_training', true);

      if (!counselorError && counselors && counselors.length > 0) {
        // Assign first available counselor
        await supabase
          .from('crisis_alerts_v4')
          .update({
            assigned_counselor_id: counselors[0].user_id,
            status: 'escalated',
            escalated_at: new Date().toISOString()
          })
          .eq('id', alert.id);
      }
    }

    // Notify moderators (in production, this would trigger notifications)
    if (severity === 'critical' || shouldEscalate) {
      await supabase
        .from('crisis_alerts_v4')
        .update({ moderator_notified: true })
        .eq('id', alert.id);
    }

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        alertType: alert.alert_type,
        severity: alert.severity,
        status: alert.status,
        escalated: shouldEscalate
      }
    });
  } catch (error) {
    console.error('Error in crisis alert creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let query = supabase
      .from('crisis_alerts_v4')
      .select(`
        id,
        session_id,
        user_id,
        alert_type,
        severity,
        status,
        detection_method,
        assigned_counselor_id,
        moderator_notified,
        created_at,
        escalated_at,
        resolved_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Error fetching crisis alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Error in crisis alerts fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { alertId, status, assignedCounselorId, resolutionNotes } = body as {
    alertId: string;
    status?: string;
    assignedCounselorId?: string;
    resolutionNotes?: string;
  };

  if (!alertId) {
    return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (assignedCounselorId) {
      updateData.assigned_counselor_id = assignedCounselorId;
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }

    const { data: alert, error } = await supabase
      .from('crisis_alerts_v4')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error updating crisis alert:', error);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Error in crisis alert update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}