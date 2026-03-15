import { RateLimitResult, SpamCheckResult, RateLimitActionType, SpamPatternSeverity } from '../../types';
import { getSupabaseServer } from '../supabaseServer';

export class SecurityService {
  private static readonly RATE_LIMITS = {
    message_send: { windowMinutes: 1, maxRequests: 30 },
    session_start: { windowMinutes: 5, maxRequests: 3 },
    api_request: { windowMinutes: 1, maxRequests: 100 },
    login_attempt: { windowMinutes: 15, maxRequests: 5 }
  };

  static async checkRateLimit(
    identifier: string,
    actionType: RateLimitActionType
  ): Promise<RateLimitResult> {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { allowed: true }; // Allow if database unavailable
    }

    const limits = this.RATE_LIMITS[actionType];
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - (windowStart.getMinutes() % limits.windowMinutes));

    try {
      // Check current count
      const { data: existing } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('identifier', identifier)
        .eq('action_type', actionType)
        .gte('window_start', windowStart.toISOString())
        .single();

      const currentCount = existing?.request_count || 0;

      if (currentCount >= limits.maxRequests) {
        const resetTime = new Date(windowStart);
        resetTime.setMinutes(resetTime.getMinutes() + limits.windowMinutes);

        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: resetTime.toISOString()
        };
      }

      // Update or insert rate limit record
      const { error } = await supabase
        .from('rate_limits')
        .upsert({
          identifier,
          action_type: actionType,
          window_start: windowStart.toISOString(),
          request_count: currentCount + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'identifier,action_type,window_start'
        });

      if (error) {
        console.error('Rate limit update error:', error);
        return { allowed: true }; // Allow on error
      }

      return {
        allowed: true,
        remainingRequests: limits.maxRequests - currentCount - 1
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow on error
    }
  }

  static async checkSpam(content: string, userId?: string, ipHash?: string): Promise<SpamCheckResult> {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { isSpam: false };
    }

    try {
      // Check content hash
      const contentHash = this.hashContent(content);
      const { data: hashMatch } = await supabase
        .from('spam_patterns')
        .select('severity')
        .eq('pattern_type', 'content_hash')
        .eq('pattern_value', contentHash)
        .eq('is_active', true)
        .single();

      if (hashMatch) {
        await this.incrementSpamDetection('content_hash', contentHash);
        return {
          isSpam: true,
          severity: hashMatch.severity as SpamPatternSeverity,
          reason: 'Duplicate content detected'
        };
      }

      // Check IP address if provided
      if (ipHash) {
        const { data: ipMatch } = await supabase
          .from('spam_patterns')
          .select('severity')
          .eq('pattern_type', 'ip_address')
          .eq('pattern_value', ipHash)
          .eq('is_active', true)
          .single();

        if (ipMatch) {
          await this.incrementSpamDetection('ip_address', ipHash);
          return {
            isSpam: true,
            severity: ipMatch.severity as SpamPatternSeverity,
            reason: 'IP address flagged'
          };
        }
      }

      // Check for spam patterns in content
      const spamPatterns = [
        /\b(?:viagra|casino|lottery|winner)\b/i,
        /(?:http|https|www\.)\S+/i, // URLs
        /\b\d{10,}\b/, // Long numbers (potentially phone numbers)
        /(.)\1{4,}/, // Repeated characters
      ];

      for (const pattern of spamPatterns) {
        if (pattern.test(content)) {
          return {
            isSpam: true,
            severity: 'medium',
            reason: 'Content pattern matches spam criteria'
          };
        }
      }

      return { isSpam: false };
    } catch (error) {
      console.error('Spam check error:', error);
      return { isSpam: false }; // Allow on error
    }
  }

  static sanitizeInput(input: string): string {
    if (!input) return input;

    return input
      // Remove potentially dangerous HTML/script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Limit length
      .substring(0, 10000);
  }

  static validateMessage(message: string): { valid: boolean; reason?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, reason: 'Message cannot be empty' };
    }

    if (message.length > 10000) {
      return { valid: false, reason: 'Message too long (max 10000 characters)' };
    }

    // Check for excessive caps
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.8 && message.length > 10) {
      return { valid: false, reason: 'Too many capital letters' };
    }

    return { valid: true };
  }

  private static hashContent(content: string): string {
    // Simple hash for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private static async incrementSpamDetection(patternType: string, patternValue: string): Promise<void> {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      await supabase
        .from('spam_patterns')
        .update({
          detection_count: supabase.raw('detection_count + 1'),
          last_detected_at: new Date().toISOString()
        })
        .eq('pattern_type', patternType)
        .eq('pattern_value', patternValue);
    } catch (error) {
      console.error('Failed to increment spam detection:', error);
    }
  }
}