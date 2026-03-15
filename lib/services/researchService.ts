import { ResearchDataExportRequest, ResearchDataExportResponse, ResearchMetricType } from '../../types';
import { getSupabaseServer } from '../supabaseServer';

export class ResearchService {
  static async exportResearchData(request: ResearchDataExportRequest): Promise<ResearchDataExportResponse | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      let query = supabase
        .from('research_metrics')
        .select('*')
        .eq('study_id', request.studyId)
        .eq('approved_by_institution', true);

      if (request.metricTypes && request.metricTypes.length > 0) {
        query = query.in('metric_type', request.metricTypes);
      }

      if (request.dateRange) {
        query = query
          .gte('collection_date', request.dateRange.start)
          .lte('collection_date', request.dateRange.end);
      }

      const { data: metrics, error } = await query.order('collection_date');

      if (error) {
        console.error('Error fetching research metrics:', error);
        return null;
      }

      if (!metrics || metrics.length === 0) {
        return {
          studyId: request.studyId,
          exportedAt: new Date().toISOString(),
          recordCount: 0,
          data: []
        };
      }

      // Format data based on request
      const formattedData = request.format === 'csv'
        ? this.convertToCSV(metrics)
        : metrics;

      return {
        studyId: request.studyId,
        exportedAt: new Date().toISOString(),
        recordCount: metrics.length,
        data: formattedData
      };
    } catch (error) {
      console.error('Error exporting research data:', error);
      return null;
    }
  }

  static async collectMoodTrends(studyId: string, dateRange?: { start: string; end: string }) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      let query = supabase
        .from('mood_logs')
        .select('user_id, mood, stress_level, created_at');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: moodLogs, error } = await query;

      if (error || !moodLogs) return;

      // Group by date and calculate trends
      const trendsByDate: Record<string, any> = {};

      for (const log of moodLogs) {
        const date = log.created_at.split('T')[0];
        const participantId = this.anonymizeParticipantId(log.user_id);

        if (!trendsByDate[date]) {
          trendsByDate[date] = {
            date,
            total_entries: 0,
            avg_mood: 0,
            avg_stress: 0,
            mood_distribution: {},
            participants: new Set()
          };
        }

        trendsByDate[date].total_entries++;
        trendsByDate[date].avg_mood += log.mood || 0;
        trendsByDate[date].avg_stress += log.stress_level || 0;
        trendsByDate[date].participants.add(participantId);

        // Mood distribution
        const moodKey = log.mood?.toString() || 'unknown';
        trendsByDate[date].mood_distribution[moodKey] =
          (trendsByDate[date].mood_distribution[moodKey] || 0) + 1;
      }

      // Calculate averages and insert metrics
      for (const [date, data] of Object.entries(trendsByDate)) {
        const trendData = data as any;
        trendData.avg_mood = trendData.avg_mood / trendData.total_entries;
        trendData.avg_stress = trendData.avg_stress / trendData.total_entries;
        trendData.unique_participants = trendData.participants.size;
        delete trendData.participants;

        await this.insertResearchMetric({
          study_id: studyId,
          metric_type: 'mood_trend',
          anonymous_participant_id: 'aggregate', // Aggregate data
          data: trendData,
          collection_date: date
        });
      }
    } catch (error) {
      console.error('Error collecting mood trends:', error);
    }
  }

  static async collectSessionMetrics(studyId: string, dateRange?: { start: string; end: string }) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      let sessionsQuery = supabase
        .from('sessions')
        .select(`
          id,
          participant_id,
          counselor_id,
          status,
          created_at,
          ended_at,
          messages(count)
        `);

      if (dateRange) {
        sessionsQuery = sessionsQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: sessions, error } = await sessionsQuery;

      if (error || !sessions) return;

      // Group by date
      const metricsByDate: Record<string, any> = {};

      for (const session of sessions) {
        const date = session.created_at.split('T')[0];
        const participantId = this.anonymizeParticipantId(session.participant_id);

        if (!metricsByDate[date]) {
          metricsByDate[date] = {
            date,
            total_sessions: 0,
            completed_sessions: 0,
            avg_duration_minutes: 0,
            total_messages: 0,
            unique_participants: new Set(),
            session_durations: []
          };
        }

        metricsByDate[date].total_sessions++;
        metricsByDate[date].unique_participants.add(participantId);

        if (session.status === 'ended' && session.ended_at) {
          metricsByDate[date].completed_sessions++;
          const duration = (new Date(session.ended_at).getTime() - new Date(session.created_at).getTime()) / (1000 * 60);
          metricsByDate[date].session_durations.push(duration);
        }

        metricsByDate[date].total_messages += session.messages?.[0]?.count || 0;
      }

      // Calculate averages and insert metrics
      for (const [date, data] of Object.entries(metricsByDate)) {
        const metricData = data as any;

        if (metricData.session_durations.length > 0) {
          metricData.avg_duration_minutes =
            metricData.session_durations.reduce((a: number, b: number) => a + b, 0) / metricData.session_durations.length;
        }

        metricData.unique_participants = metricData.unique_participants.size;
        delete metricData.session_durations;

        await this.insertResearchMetric({
          study_id: studyId,
          metric_type: 'session_duration',
          anonymous_participant_id: 'aggregate',
          data: metricData,
          collection_date: date
        });
      }
    } catch (error) {
      console.error('Error collecting session metrics:', error);
    }
  }

  static async collectEngagementMetrics(studyId: string, dateRange?: { start: string; end: string }) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      // Collect various engagement metrics
      const metrics = [
        { type: 'session_started', table: 'analytics_events', field: 'event_type' },
        { type: 'mood_logged', table: 'analytics_events', field: 'event_type' },
        { type: 'journal_entry', table: 'analytics_events', field: 'event_type' },
        { type: 'support_circle_participation', table: 'support_room_messages_v4', field: null }
      ];

      for (const metric of metrics) {
        let query: any = supabase.from(metric.table);

        if (metric.field) {
          query = query.select('created_at').eq(metric.field, metric.type);
        } else {
          query = query.select('created_at');
        }

        if (dateRange) {
          query = query
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);
        }

        const { data, error } = await query;

        if (error || !data) continue;

        // Group by date
        const dailyCounts: Record<string, number> = {};
        for (const record of data) {
          const date = record.created_at.split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }

        // Insert daily metrics
        for (const [date, count] of Object.entries(dailyCounts)) {
          await this.insertResearchMetric({
            study_id: studyId,
            metric_type: metric.type as ResearchMetricType,
            anonymous_participant_id: 'aggregate',
            data: { date, count, metric_type: metric.type },
            collection_date: date
          });
        }
      }
    } catch (error) {
      console.error('Error collecting engagement metrics:', error);
    }
  }

  private static async insertResearchMetric(metric: {
    study_id: string;
    metric_type: ResearchMetricType;
    anonymous_participant_id: string;
    data: any;
    collection_date: string;
  }) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      await supabase
        .from('research_metrics')
        .insert({
          study_id: metric.study_id,
          metric_type: metric.metric_type,
          anonymous_participant_id: metric.anonymous_participant_id,
          data: metric.data,
          collection_date: metric.collection_date,
          approved_by_institution: false // Requires manual approval
        });
    } catch (error) {
      console.error('Error inserting research metric:', error);
    }
  }

  static async recordResearchMetric(payload: {
    metricType: ResearchMetricType;
    data: Record<string, any>;
    metadata?: Record<string, any>;
    recordedBy?: string;
    studyId?: string;
    collectionDate?: string;
  }): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('research_metrics')
        .insert({
          study_id: payload.studyId || 'default',
          metric_type: payload.metricType,
          anonymous_participant_id: payload.recordedBy ? payload.recordedBy : 'unknown',
          data: {
            ...payload.data,
            metadata: payload.metadata || {}
          },
          collection_date: payload.collectionDate || new Date().toISOString(),
          approved_by_institution: false
        });

      if (error) {
        console.error('Error recording research metric:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording research metric:', error);
      return false;
    }
  }

  private static anonymizeParticipantId(userId: string): string {
    // Create a consistent hash for the user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  static async approveResearchMetrics(studyId: string, metricIds: string[]): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('research_metrics')
        .update({ approved_by_institution: true })
        .eq('study_id', studyId)
        .in('id', metricIds);

      return !error;
    } catch (error) {
      console.error('Error approving research metrics:', error);
      return false;
    }
  }

  static async getAvailableStudies(): Promise<Array<{ studyId: string; description?: string; metricsCount: number }>> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('research_metrics')
        .select('study_id, data')
        .eq('approved_by_institution', true);

      if (error || !data) return [];

      const studies: Record<string, { count: number; description?: string }> = {};

      for (const metric of data) {
        if (!studies[metric.study_id]) {
          studies[metric.study_id] = { count: 0 };
        }
        studies[metric.study_id].count++;

        // Extract description from data if available
        if (metric.data?.study_description) {
          studies[metric.study_id].description = metric.data.study_description;
        }
      }

      return Object.entries(studies).map(([studyId, info]) => ({
        studyId,
        description: info.description,
        metricsCount: info.count
      }));
    } catch (error) {
      console.error('Error getting available studies:', error);
      return [];
    }
  }
}