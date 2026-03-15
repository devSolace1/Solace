import { createClient } from '@supabase/supabase-js';
import type {
  AnalyticsEvent,
  AnalyticsSession,
  AnalyticsMetric,
  AnalyticsReport,
  UserAnalytics,
  PlatformAnalytics,
  AnalyticsFilter,
  AnalyticsResult,
  PrivacySettings,
  AnalyticsEventType,
  DeviceInfo,
  LocationInfo,
  DateRange
} from '../types';

export class AnalyticsService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    eventType: AnalyticsEventType,
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<AnalyticsResult> {
    try {
      // Check privacy settings if user is logged in
      if (userId) {
        const privacySettings = await this.getUserPrivacySettings(userId);
        if (!privacySettings.analytics_enabled) {
          return { success: false, error: 'Analytics disabled by user' };
        }
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || this.generateSessionId();

      // Get device and location info (anonymized)
      const deviceInfo = this.getDeviceInfo();
      const locationInfo = await this.getLocationInfo();

      const { data: event, error } = await this.supabase
        .from('analytics_events_v5')
        .insert({
          user_id: userId,
          session_id: finalSessionId,
          event_type: eventType,
          event_name: eventName,
          properties: this.sanitizeProperties(properties),
          user_agent: navigator.userAgent,
          ip_hash: this.hashIP(), // Anonymized IP hashing
          device_info: deviceInfo,
          location_info: locationInfo
        })
        .select()
        .single();

      if (error) throw error;

      // Update session if it exists
      if (userId || sessionId) {
        await this.updateSessionActivity(finalSessionId, userId);
      }

      return { success: true, event_id: event.id };
    } catch (error) {
      console.error('Failed to track event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track event'
      };
    }
  }

  /**
   * Start a new analytics session
   */
  async startSession(userId?: string, referrer?: string): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = this.getDeviceInfo();
      const locationInfo = await this.getLocationInfo();

      const { error } = await this.supabase
        .from('analytics_sessions_v5')
        .insert({
          id: sessionId,
          user_id: userId,
          start_time: new Date().toISOString(),
          page_views: 1,
          events_count: 1,
          device_info: deviceInfo,
          location_info: locationInfo,
          referrer,
          user_agent: navigator.userAgent,
          is_active: true
        });

      if (error) throw error;

      // Track session start event
      await this.trackEvent('engagement', 'session_start', { session_id: sessionId }, userId, sessionId);

      return sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      return this.generateSessionId(); // Return a fallback session ID
    }
  }

  /**
   * End an analytics session
   */
  async endSession(sessionId: string): Promise<boolean> {
    try {
      const { data: session, error: fetchError } = await this.supabase
        .from('analytics_sessions_v5')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const endTime = new Date().toISOString();
      const duration = session.start_time
        ? Math.floor((new Date(endTime).getTime() - new Date(session.start_time).getTime()) / 1000)
        : 0;

      const { error: updateError } = await this.supabase
        .from('analytics_sessions_v5')
        .update({
          end_time: endTime,
          duration,
          is_active: false
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Track session end event
      await this.trackEvent('engagement', 'session_end', {
        session_id: sessionId,
        duration
      }, session.user_id, sessionId);

      return true;
    } catch (error) {
      console.error('Failed to end session:', error);
      return false;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, dateRange?: DateRange): Promise<UserAnalytics> {
    const { data: analytics, error } = await this.supabase
      .rpc('get_user_analytics', {
        user_id: userId,
        start_date: dateRange?.start_date,
        end_date: dateRange?.end_date
      });

    if (error) throw error;
    return analytics;
  }

  /**
   * Get platform analytics (admin only)
   */
  async getPlatformAnalytics(dateRange?: DateRange): Promise<PlatformAnalytics> {
    const { data: analytics, error } = await this.supabase
      .rpc('get_platform_analytics', {
        start_date: dateRange?.start_date,
        end_date: dateRange?.end_date
      });

    if (error) throw error;
    return analytics;
  }

  /**
   * Get analytics events
   */
  async getAnalyticsEvents(filter: AnalyticsFilter = {}): Promise<AnalyticsEvent[]> {
    let query = this.supabase
      .from('analytics_events_v5')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filter.event_type && filter.event_type.length > 0) {
      query = query.in('event_type', filter.event_type);
    }

    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    if (filter.session_id) {
      query = query.eq('session_id', filter.session_id);
    }

    if (filter.date_range) {
      query = query
        .gte('timestamp', filter.date_range.start_date)
        .lte('timestamp', filter.date_range.end_date);
    }

    if (filter.properties) {
      // Note: This is a simplified filter - in practice, you'd need more complex querying
      Object.entries(filter.properties).forEach(([key, value]) => {
        query = query.contains('properties', { [key]: value });
      });
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    return events || [];
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    reportType: string,
    dateRange: DateRange,
    customMetrics?: string[]
  ): Promise<AnalyticsReport> {
    const { data: report, error } = await this.supabase
      .rpc('generate_analytics_report', {
        report_type: reportType,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        custom_metrics: customMetrics
      });

    if (error) throw error;
    return report;
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<Omit<PrivacySettings, 'user_id' | 'updated_at'>>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('analytics_privacy_settings_v5')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Get user privacy settings
   */
  async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    const { data: settings, error } = await this.supabase
      .from('analytics_privacy_settings_v5')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Return default privacy settings
      return {
        user_id: userId,
        analytics_enabled: true,
        location_tracking: false,
        device_info_tracking: true,
        behavioral_tracking: true,
        data_retention_days: 365,
        export_data_allowed: true,
        updated_at: new Date().toISOString()
      };
    }

    return settings;
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<any> {
    const privacySettings = await this.getUserPrivacySettings(userId);
    if (!privacySettings.export_data_allowed) {
      throw new Error('Data export not allowed by user');
    }

    const [events, sessions, analytics] = await Promise.all([
      this.getAnalyticsEvents({ user_id: userId }),
      this.supabase.from('analytics_sessions_v5').select('*').eq('user_id', userId),
      this.getUserAnalytics(userId)
    ]);

    return {
      user_id: userId,
      export_date: new Date().toISOString(),
      privacy_settings: privacySettings,
      analytics_events: events,
      sessions: sessions.data,
      user_analytics: analytics
    };
  }

  /**
   * Delete user data (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<boolean> {
    try {
      // Delete in order: events, sessions, privacy settings
      await Promise.all([
        this.supabase.from('analytics_events_v5').delete().eq('user_id', userId),
        this.supabase.from('analytics_sessions_v5').delete().eq('user_id', userId),
        this.supabase.from('analytics_privacy_settings_v5').delete().eq('user_id', userId)
      ]);

      return true;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      return false;
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data: deletedCount, error } = await this.supabase
      .rpc('cleanup_analytics_data', { cutoff_date: cutoffDate.toISOString() });

    if (error) throw error;
    return deletedCount || 0;
  }

  /**
   * Private helper methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /Tablet|iPad/i.test(ua);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    let deviceType: DeviceInfo['device_type'] = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    // Parse browser and OS info
    const browserInfo = this.parseUserAgent(ua);

    return {
      device_type: deviceType,
      os: browserInfo.os,
      os_version: browserInfo.osVersion,
      browser: browserInfo.browser,
      browser_version: browserInfo.browserVersion,
      screen_resolution: `${screen.width}x${screen.height}`,
      is_mobile: isMobile,
      is_touch_device: isTouch
    };
  }

  private async getLocationInfo(): Promise<LocationInfo | undefined> {
    try {
      // Get timezone and language
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;

      // Note: For privacy, we don't collect actual location data
      // In a real implementation, you might use IP geolocation with user consent
      return {
        timezone,
        language
      };
    } catch (error) {
      return undefined;
    }
  }

  private parseUserAgent(ua: string): { os: string; osVersion: string; browser: string; browserVersion: string } {
    // Simplified user agent parsing
    let os = 'Unknown';
    let osVersion = 'Unknown';
    let browser = 'Unknown';
    let browserVersion = 'Unknown';

    // OS detection
    if (ua.includes('Windows')) {
      os = 'Windows';
      const match = ua.match(/Windows NT (\d+\.\d+)/);
      if (match) osVersion = match[1];
    } else if (ua.includes('Mac OS X')) {
      os = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
      const match = ua.match(/Android (\d+\.\d+)/);
      if (match) osVersion = match[1];
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
      const match = ua.match(/OS (\d+[._]\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
    }

    // Browser detection
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
      const match = ua.match(/Edg\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    }

    return { os, osVersion, browser, browserVersion };
  }

  private hashIP(): string | undefined {
    // In a real implementation, you'd hash the IP address for anonymity
    // For now, we'll skip this to avoid privacy concerns in development
    return undefined;
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    // Remove or anonymize sensitive data
    const sanitized = { ...properties };

    // Remove potential PII
    const sensitiveKeys = ['password', 'email', 'phone', 'address', 'name', 'ssn', 'credit_card'];
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  private async updateSessionActivity(sessionId: string, userId?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_session_activity', {
          session_id: sessionId,
          user_id: userId
        });

      if (error) console.error('Failed to update session activity:', error);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }
}