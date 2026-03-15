// V8 Global Analytics Dashboard API
// Anonymous activity patterns and platform insights

import { NextRequest, NextResponse } from 'next/server';
import { analyticsManager } from '../../../../lib/analytics-manager';
import { auth } from '../../../../lib/auth';
import { distributedManager } from '../../../../lib/distributed-manager';

export async function GET(request: NextRequest) {
  try {
    // Verify counselor/admin access
    const user = await auth.getCurrentUser(request);
    if (!user || !['counselor', 'moderator'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as 'day' | 'week' | 'month') || 'week';
    const includeFederation = searchParams.get('federation') === 'true';

    // Get comprehensive dashboard data
    const dashboardData = await analyticsManager.getGlobalDashboardData();

    // Add federation data if requested and enabled
    let federationData = null;
    if (includeFederation && distributedManager.isFederationEnabled()) {
      federationData = {
        nodeStatuses: distributedManager.getAllNodeStatuses(),
        trustedNodes: distributedManager.getTrustedNodes(),
        federationHealth: dashboardData.performance.federationHealth
      };
    }

    // Structure response with privacy-preserving aggregations
    const response = {
      timestamp: new Date().toISOString(),
      nodeId: distributedManager.getNodeConfig().nodeId,
      timeRange,
      summary: {
        totalActiveUsers: dashboardData.activity.reduce((sum, m) => sum + m.activeUsers, 0) / dashboardData.activity.length,
        totalActiveCounselors: dashboardData.activity.reduce((sum, m) => sum + m.activeCounselors, 0) / dashboardData.activity.length,
        averageSessionDuration: dashboardData.activity.reduce((sum, m) => sum + m.averageSessionDuration, 0) / dashboardData.activity.length,
        totalPanicAlerts: dashboardData.activity.reduce((sum, m) => sum + m.panicAlerts, 0),
        totalMoodLogs: dashboardData.activity.reduce((sum, m) => sum + m.moodLogs, 0),
        totalRoomMessages: dashboardData.activity.reduce((sum, m) => sum + m.roomMessages, 0),
        totalAIInteractions: dashboardData.activity.reduce((sum, m) => sum + m.aiInteractions, 0)
      },
      userJourney: dashboardData.userJourney,
      emotionalHealth: dashboardData.emotionalHealth,
      performance: dashboardData.performance,
      alerts: dashboardData.activeAlerts,
      activityTrends: dashboardData.activity.map(metric => ({
        timestamp: metric.timestamp,
        activeUsers: metric.activeUsers,
        activeCounselors: metric.activeCounselors,
        sessions: metric.totalSessions,
        panicAlerts: metric.panicAlerts,
        aiInteractions: metric.aiInteractions
      })),
      federation: federationData,
      insights: generateInsights(dashboardData)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics data' },
      { status: 500 }
    );
  }
}

// Generate actionable insights from the data
function generateInsights(data: any) {
  const insights = [];

  // User engagement insights
  if (data.userJourney.averageSessionsPerUser < 2) {
    insights.push({
      type: 'engagement',
      priority: 'medium',
      title: 'Low Session Frequency',
      description: `Users average ${data.userJourney.averageSessionsPerUser.toFixed(1)} sessions per week. Consider outreach strategies.`,
      recommendation: 'Implement gentle check-in reminders and improve onboarding flow.'
    });
  }

  // Emotional health insights
  if (data.emotionalHealth.averageMoodScore < 5) {
    insights.push({
      type: 'emotional_health',
      priority: 'high',
      title: 'Concerning Mood Trends',
      description: `Average mood score is ${data.emotionalHealth.averageMoodScore.toFixed(1)}/10, indicating widespread distress.`,
      recommendation: 'Increase counselor availability and promote community room participation.'
    });
  }

  // Panic alert insights
  if (data.emotionalHealth.panicFrequency > 5) {
    insights.push({
      type: 'crisis',
      priority: 'critical',
      title: 'High Crisis Frequency',
      description: `${data.emotionalHealth.panicFrequency.toFixed(1)} panic alerts per day detected.`,
      recommendation: 'Immediate review of crisis response protocols and counselor training.'
    });
  }

  // AI utilization insights
  if (data.emotionalHealth.aiAssistanceUsage > data.emotionalHealth.counselorInterventionRate * 2) {
    insights.push({
      type: 'ai_utilization',
      priority: 'low',
      title: 'High AI Reliance',
      description: 'AI assistance is being used significantly more than counselor interventions.',
      recommendation: 'Monitor AI response quality and ensure human counselors remain primary support.'
    });
  }

  // Performance insights
  if (data.performance.averageResponseTime > 5000) {
    insights.push({
      type: 'performance',
      priority: 'medium',
      title: 'Slow Response Times',
      description: `Average response time is ${(data.performance.averageResponseTime / 1000).toFixed(1)}s.`,
      recommendation: 'Optimize database queries and consider infrastructure scaling.'
    });
  }

  // Retention insights
  if (data.userJourney.userRetention.day7 < 0.3) {
    insights.push({
      type: 'retention',
      priority: 'high',
      title: 'Poor User Retention',
      description: `Only ${(data.userJourney.userRetention.day7 * 100).toFixed(1)}% of users return after 7 days.`,
      recommendation: 'Review user experience, add engagement features, and improve support quality.'
    });
  }

  // Recovery insights
  if (data.emotionalHealth.recoveryRate < 0.5) {
    insights.push({
      type: 'recovery',
      priority: 'medium',
      title: 'Low Recovery Success',
      description: `Only ${(data.emotionalHealth.recoveryRate * 100).toFixed(1)}% of users show mood improvement.`,
      recommendation: 'Enhance recovery tracking features and provide more targeted support.'
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Export detailed metrics for specific analysis
export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request);
    if (!user || user.role !== 'moderator') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { metricType, timeRange, filters } = body;

    let result;

    switch (metricType) {
      case 'activity':
        result = await analyticsManager.getActivityMetrics(timeRange || 'week');
        break;

      case 'user_journey':
        result = await analyticsManager.getUserJourneyMetrics(timeRange || 'week');
        break;

      case 'emotional_health':
        result = await analyticsManager.getEmotionalHealthMetrics(timeRange || 'week');
        break;

      case 'performance':
        result = await analyticsManager.getPlatformPerformanceMetrics();
        break;

      case 'alerts':
        result = await analyticsManager.getActiveAlerts();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      metricType,
      timeRange: timeRange || 'week',
      data: result,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Detailed analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to load detailed metrics' },
      { status: 500 }
    );
  }
}