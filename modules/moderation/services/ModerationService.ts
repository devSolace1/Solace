import { createClient } from '@supabase/supabase-js';
import type {
  Report,
  ModerationAction,
  ContentModeration,
  ModerationRule,
  ModerationStats,
  ModerationFilter,
  ModerationResult,
  AutoModerationResult,
  ReportType,
  ReportPriority,
  ModerationActionType,
  ContentType,
  ContentFlag
} from '../types';

export class ModerationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Submit a report
   */
  async submitReport(
    reporterId: string,
    reportType: ReportType,
    contentType: ContentType,
    reason: string,
    description?: string,
    reportedUserId?: string,
    reportedContentId?: string
  ): Promise<ModerationResult> {
    try {
      // Determine priority based on report type
      const priority = this.calculateReportPriority(reportType);

      const { data: report, error } = await this.supabase
        .from('moderation_reports_v5')
        .insert({
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reported_content_id: reportedContentId,
          content_type: contentType,
          report_type: reportType,
          reason,
          description,
          status: 'pending',
          priority
        })
        .select()
        .single();

      if (error) throw error;

      // Add to moderation queue
      await this.addToModerationQueue(report.id, priority);

      // Trigger immediate action for critical reports
      if (priority === 'critical' || priority === 'urgent') {
        await this.triggerImmediateAction(report);
      }

      return { success: true, report_id: report.id };
    } catch (error) {
      console.error('Failed to submit report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit report'
      };
    }
  }

  /**
   * Get reports for moderation
   */
  async getReports(filter: ModerationFilter = {}): Promise<Report[]> {
    let query = this.supabase
      .from('moderation_reports_v5')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter.status && filter.status.length > 0) {
      query = query.in('status', filter.status);
    }

    if (filter.priority && filter.priority.length > 0) {
      query = query.in('priority', filter.priority);
    }

    if (filter.type && filter.type.length > 0) {
      query = query.in('report_type', filter.type);
    }

    if (filter.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
    }

    if (filter.date_from) {
      query = query.gte('created_at', filter.date_from);
    }

    if (filter.date_to) {
      query = query.lte('created_at', filter.date_to);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1);
    }

    const { data: reports, error } = await query;
    if (error) throw error;

    return reports || [];
  }

  /**
   * Take moderation action
   */
  async takeModerationAction(
    reportId: string,
    moderatorId: string,
    actionType: ModerationActionType,
    reason: string,
    details?: Record<string, any>,
    duration?: number
  ): Promise<ModerationResult> {
    try {
      // Start transaction
      const { data: action, error: actionError } = await this.supabase
        .from('moderation_actions_v5')
        .insert({
          report_id: reportId,
          moderator_id: moderatorId,
          action_type: actionType,
          reason,
          details,
          duration
        })
        .select()
        .single();

      if (actionError) throw actionError;

      // Update report status
      const newStatus = this.getReportStatusFromAction(actionType);
      const { error: updateError } = await this.supabase
        .from('moderation_reports_v5')
        .update({
          status: newStatus,
          assigned_to: moderatorId,
          resolution: reason,
          updated_at: new Date().toISOString(),
          resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date().toISOString() : undefined
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Execute the action
      await this.executeModerationAction(action);

      // Remove from queue
      await this.removeFromModerationQueue(reportId);

      return { success: true, action_id: action.id };
    } catch (error) {
      console.error('Failed to take moderation action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to take moderation action'
      };
    }
  }

  /**
   * Auto-moderate content
   */
  async autoModerateContent(
    contentId: string,
    contentType: ContentType,
    content: string,
    metadata?: Record<string, any>
  ): Promise<AutoModerationResult> {
    try {
      const flags: ContentFlag[] = [];

      // Get active moderation rules
      const rules = await this.getActiveModerationRules();

      for (const rule of rules) {
        const ruleResult = await this.evaluateRule(rule, content, metadata);
        if (ruleResult.shouldFlag) {
          flags.push(...ruleResult.flags);
        }
      }

      // Calculate overall confidence and recommendation
      const shouldFlag = flags.length > 0;
      const averageConfidence = flags.length > 0
        ? flags.reduce((sum, flag) => sum + flag.confidence, 0) / flags.length
        : 0;

      const recommendedAction = this.determineRecommendedAction(flags);

      // Store moderation result
      await this.storeContentModeration(contentId, contentType, flags, shouldFlag);

      return {
        content_id: contentId,
        should_flag: shouldFlag,
        flags,
        recommended_action: recommendedAction,
        confidence: averageConfidence
      };
    } catch (error) {
      console.error('Auto-moderation failed:', error);
      return {
        content_id: contentId,
        should_flag: false,
        flags: [],
        confidence: 0
      };
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<ModerationStats> {
    const { data: stats, error } = await this.supabase
      .rpc('get_moderation_stats');

    if (error) throw error;
    return stats;
  }

  /**
   * Get active moderation rules
   */
  async getActiveModerationRules(): Promise<ModerationRule[]> {
    const { data: rules, error } = await this.supabase
      .from('moderation_rules_v5')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return rules || [];
  }

  /**
   * Create or update moderation rule
   */
  async upsertModerationRule(rule: Omit<ModerationRule, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await this.supabase
      .from('moderation_rules_v5')
      .upsert({
        ...rule,
        updated_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string): Promise<ModerationAction[]> {
    const { data: actions, error } = await this.supabase
      .from('moderation_actions_v5')
      .select(`
        *,
        moderation_reports_v5!inner (
          reported_user_id
        )
      `)
      .eq('moderation_reports_v5.reported_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return actions || [];
  }

  /**
   * Private helper methods
   */
  private calculateReportPriority(reportType: ReportType): ReportPriority {
    const priorityMap: Record<ReportType, ReportPriority> = {
      suicide_threat: 'critical',
      self_harm: 'critical',
      harassment: 'high',
      hate_speech: 'high',
      bullying: 'high',
      inappropriate_content: 'medium',
      privacy_violation: 'medium',
      spam: 'low',
      misinformation: 'medium',
      other: 'low'
    };

    return priorityMap[reportType] || 'medium';
  }

  private getReportStatusFromAction(actionType: ModerationActionType): Report['status'] {
    switch (actionType) {
      case 'dismiss':
        return 'dismissed';
      case 'escalate':
        return 'escalated';
      default:
        return 'resolved';
    }
  }

  private async addToModerationQueue(reportId: string, priority: ReportPriority): Promise<void> {
    const { error } = await this.supabase
      .from('moderation_queue_v5')
      .insert({
        report_id: reportId,
        priority,
        queued_at: new Date().toISOString()
      });

    if (error) console.error('Failed to add to moderation queue:', error);
  }

  private async removeFromModerationQueue(reportId: string): Promise<void> {
    const { error } = await this.supabase
      .from('moderation_queue_v5')
      .delete()
      .eq('report_id', reportId);

    if (error) console.error('Failed to remove from moderation queue:', error);
  }

  private async triggerImmediateAction(report: Report): Promise<void> {
    // For critical reports, send immediate notifications to moderators
    // This would integrate with the notification service
    console.log('Triggering immediate action for critical report:', report.id);
  }

  private async executeModerationAction(action: ModerationAction): Promise<void> {
    // Execute the actual moderation action based on type
    switch (action.action_type) {
      case 'delete_content':
        await this.deleteContent(action.details?.content_id, action.details?.content_type);
        break;
      case 'mute':
      case 'ban':
        await this.applyUserRestriction(action.details?.user_id, action.action_type, action.duration);
        break;
      case 'restrict_feature':
        await this.restrictUserFeature(action.details?.user_id, action.details?.feature);
        break;
      // Add more action types as needed
    }
  }

  private async deleteContent(contentId: string, contentType: ContentType): Promise<void> {
    // Delete content based on type
    const tableMap: Record<ContentType, string> = {
      chat_message: 'chat_messages_v5',
      journal_entry: 'journal_entries_v5',
      mood_checkin: 'mood_checkins_v5',
      support_room_post: 'support_room_posts_v5',
      user_profile: 'user_profiles_v5',
      panic_alert: 'panic_alerts_v5'
    };

    const table = tableMap[contentType];
    if (table) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('id', contentId);

      if (error) console.error('Failed to delete content:', error);
    }
  }

  private async applyUserRestriction(userId: string, restrictionType: string, duration?: number): Promise<void> {
    const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null;

    const { error } = await this.supabase
      .from('user_restrictions_v5')
      .upsert({
        user_id: userId,
        restriction_type: restrictionType,
        expires_at: expiresAt,
        applied_at: new Date().toISOString()
      });

    if (error) console.error('Failed to apply user restriction:', error);
  }

  private async restrictUserFeature(userId: string, feature: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_feature_restrictions_v5')
      .upsert({
        user_id: userId,
        feature,
        restricted_at: new Date().toISOString()
      });

    if (error) console.error('Failed to restrict user feature:', error);
  }

  private async evaluateRule(
    rule: ModerationRule,
    content: string,
    metadata?: Record<string, any>
  ): Promise<{ shouldFlag: boolean; flags: ContentFlag[] }> {
    // This is a simplified rule evaluation - in practice, you'd have more sophisticated logic
    const flags: ContentFlag[] = [];

    switch (rule.rule_type) {
      case 'keyword_filter':
        const keywords = rule.conditions.keywords || [];
        for (const keyword of keywords) {
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            flags.push({
              type: rule.conditions.flag_type || 'inappropriate',
              severity: rule.conditions.severity || 'medium',
              confidence: rule.conditions.confidence || 0.8,
              details: { matched_keyword: keyword }
            });
          }
        }
        break;
      // Add more rule types as needed
    }

    return {
      shouldFlag: flags.length > 0,
      flags
    };
  }

  private determineRecommendedAction(flags: ContentFlag[]): ModerationActionType | undefined {
    const highestSeverity = flags.reduce((max, flag) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[flag.severity] > severityOrder[max] ? flag.severity : max;
    }, 'low' as const);

    switch (highestSeverity) {
      case 'critical':
        return 'ban';
      case 'high':
        return 'delete_content';
      case 'medium':
        return 'warn';
      default:
        return undefined;
    }
  }

  private async storeContentModeration(
    contentId: string,
    contentType: ContentType,
    flags: ContentFlag[],
    shouldFlag: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('content_moderation_v5')
      .upsert({
        content_id: contentId,
        content_type: contentType,
        moderation_status: shouldFlag ? 'flagged' : 'approved',
        flags,
        moderated_at: new Date().toISOString()
      });

    if (error) console.error('Failed to store content moderation:', error);
  }
}