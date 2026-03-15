import { createClient } from '@supabase/supabase-js';
import type {
  SupportCircle,
  CircleMembership,
  CirclePost,
  CircleReply,
  CircleEvent,
  EventAttendance,
  CircleResource,
  CircleModeration,
  CircleStats,
  CircleSearchFilters,
  CircleResult,
  CircleCategory,
  CircleVisibility,
  CircleRole,
  PostType,
  EventType,
  AttendanceStatus,
  ResourceType,
  ModerationAction
} from './types';

export class SupportCircleService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Create a new support circle
   */
  async createCircle(
    name: string,
    description: string,
    category: CircleCategory,
    visibility: CircleVisibility,
    createdBy: string,
    maxMembers: number = 50,
    rules: string[] = [],
    tags: string[] = []
  ): Promise<CircleResult> {
    try {
      const circleRules = rules.map((rule, index) => ({
        rule,
        is_required: true,
        priority: index + 1
      }));

      const { data: circle, error } = await this.supabase
        .from('support_circles_v5')
        .insert({
          name,
          description,
          category,
          visibility,
          created_by: createdBy,
          max_members: maxMembers,
          current_members: 1, // Creator is first member
          is_active: true,
          rules: circleRules,
          tags
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await this.addMember(circle.id, createdBy, 'admin');

      return { success: true, circle_id: circle.id };
    } catch (error) {
      console.error('Failed to create support circle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create support circle'
      };
    }
  }

  /**
   * Search support circles
   */
  async searchCircles(filters: CircleSearchFilters = {}): Promise<SupportCircle[]> {
    let query = this.supabase
      .from('support_circles_v5')
      .select('*')
      .eq('is_active', true)
      .order('current_members', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.visibility && filters.visibility.length > 0) {
      query = query.in('visibility', filters.visibility);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.min_members) {
      query = query.gte('current_members', filters.min_members);
    }

    if (filters.max_members) {
      query = query.lte('current_members', filters.max_members);
    }

    if (filters.has_moderator !== undefined) {
      if (filters.has_moderator) {
        query = query.not('moderator_id', 'is', null);
      } else {
        query = query.is('moderator_id', null);
      }
    }

    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
    }

    const { data: circles, error } = await query;
    if (error) throw error;

    return circles || [];
  }

  /**
   * Join a support circle
   */
  async joinCircle(circleId: string, userId: string): Promise<CircleResult> {
    try {
      // Check if circle exists and has space
      const { data: circle, error: circleError } = await this.supabase
        .from('support_circles_v5')
        .select('*')
        .eq('id', circleId)
        .single();

      if (circleError) throw circleError;

      if (circle.current_members >= circle.max_members) {
        return { success: false, error: 'Circle is full' };
      }

      if (circle.visibility === 'private') {
        return { success: false, error: 'This circle requires an invitation' };
      }

      // Check if user is already a member
      const { data: existingMember } = await this.supabase
        .from('circle_memberships_v5')
        .select('*')
        .eq('circle_id', circleId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return { success: false, error: 'Already a member of this circle' };
      }

      // Add member
      const success = await this.addMember(circleId, userId, 'member');
      if (!success) {
        return { success: false, error: 'Failed to join circle' };
      }

      // Update member count
      await this.supabase
        .from('support_circles_v5')
        .update({ current_members: circle.current_members + 1 })
        .eq('id', circleId);

      // Log activity
      await this.logActivity(circleId, userId, 'joined_circle');

      return { success: true };
    } catch (error) {
      console.error('Failed to join circle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join circle'
      };
    }
  }

  /**
   * Leave a support circle
   */
  async leaveCircle(circleId: string, userId: string): Promise<boolean> {
    try {
      // Remove membership
      const { error: membershipError } = await this.supabase
        .from('circle_memberships_v5')
        .update({ is_active: false })
        .eq('circle_id', circleId)
        .eq('user_id', userId);

      if (membershipError) throw membershipError;

      // Update member count
      await this.supabase.rpc('decrement_circle_members', { circle_id: circleId });

      // Log activity
      await this.logActivity(circleId, userId, 'left_circle');

      return true;
    } catch (error) {
      console.error('Failed to leave circle:', error);
      return false;
    }
  }

  /**
   * Create a post in a circle
   */
  async createPost(
    circleId: string,
    authorId: string,
    content: string,
    postType: PostType = 'discussion',
    title?: string,
    isAnonymous: boolean = false,
    attachments?: any[]
  ): Promise<CircleResult> {
    try {
      // Check if user is a member
      const isMember = await this.isMember(circleId, authorId);
      if (!isMember) {
        return { success: false, error: 'Not a member of this circle' };
      }

      const { data: post, error } = await this.supabase
        .from('circle_posts_v5')
        .insert({
          circle_id: circleId,
          author_id: authorId,
          title,
          content,
          post_type: postType,
          attachments,
          is_pinned: false,
          is_anonymous: isAnonymous,
          reply_count: 0,
          like_count: 0,
          report_count: 0,
          moderation_status: 'approved'
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.logActivity(circleId, authorId, 'created_post', post.id);

      return { success: true, post_id: post.id };
    } catch (error) {
      console.error('Failed to create post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      };
    }
  }

  /**
   * Create a reply to a post
   */
  async createReply(
    postId: string,
    authorId: string,
    content: string,
    isAnonymous: boolean = false
  ): Promise<CircleResult> {
    try {
      // Get post to check circle membership
      const { data: post, error: postError } = await this.supabase
        .from('circle_posts_v5')
        .select('circle_id')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Check if user is a member
      const isMember = await this.isMember(post.circle_id, authorId);
      if (!isMember) {
        return { success: false, error: 'Not a member of this circle' };
      }

      const { data: reply, error } = await this.supabase
        .from('circle_replies_v5')
        .insert({
          post_id: postId,
          author_id: authorId,
          content,
          is_anonymous: isAnonymous,
          like_count: 0,
          report_count: 0,
          moderation_status: 'approved'
        })
        .select()
        .single();

      if (error) throw error;

      // Update reply count
      await this.supabase.rpc('increment_post_replies', { post_id: postId });

      // Log activity
      await this.logActivity(post.circle_id, authorId, 'created_reply', reply.id);

      return { success: true };
    } catch (error) {
      console.error('Failed to create reply:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create reply'
      };
    }
  }

  /**
   * Get circle posts
   */
  async getCirclePosts(circleId: string, userId?: string, limit: number = 20): Promise<CirclePost[]> {
    // Check if user can view posts
    const canView = await this.canViewCircle(circleId, userId);
    if (!canView) {
      return [];
    }

    const { data: posts, error } = await this.supabase
      .from('circle_posts_v5')
      .select('*')
      .eq('circle_id', circleId)
      .eq('moderation_status', 'approved')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return posts || [];
  }

  /**
   * Create a circle event
   */
  async createEvent(
    circleId: string,
    organizerId: string,
    title: string,
    description: string,
    eventType: EventType,
    startTime: string,
    endTime: string,
    location?: any,
    maxAttendees?: number
  ): Promise<CircleResult> {
    try {
      // Check if user has permission to create events
      const role = await this.getUserRole(circleId, organizerId);
      if (!['admin', 'moderator', 'organizer'].includes(role)) {
        return { success: false, error: 'Insufficient permissions' };
      }

      const { data: event, error } = await this.supabase
        .from('circle_events_v5')
        .insert({
          circle_id: circleId,
          title,
          description,
          event_type: eventType,
          start_time: startTime,
          end_time: endTime,
          location,
          max_attendees: maxAttendees,
          current_attendees: 0,
          organizer_id: organizerId,
          is_cancelled: false
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, event_id: event.id };
    } catch (error) {
      console.error('Failed to create event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event'
      };
    }
  }

  /**
   * Get user's circles
   */
  async getUserCircles(userId: string): Promise<SupportCircle[]> {
    const { data: circles, error } = await this.supabase
      .from('circle_memberships_v5')
      .select(`
        support_circles_v5 (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('support_circles_v5.is_active', true);

    if (error) throw error;
    return circles?.map(c => c.support_circles_v5) || [];
  }

  /**
   * Get circle statistics
   */
  async getCircleStats(): Promise<CircleStats> {
    const { data: stats, error } = await this.supabase
      .rpc('get_circle_stats');

    if (error) throw error;
    return stats;
  }

  /**
   * Moderate content
   */
  async moderateContent(
    circleId: string,
    contentId: string,
    contentType: 'post' | 'reply' | 'resource',
    moderatorId: string,
    action: ModerationAction,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if user is moderator/admin
      const role = await this.getUserRole(circleId, moderatorId);
      if (!['admin', 'moderator'].includes(role)) {
        return false;
      }

      const { error } = await this.supabase
        .from('circle_moderation_v5')
        .insert({
          circle_id: circleId,
          content_id: contentId,
          content_type: contentType,
          moderator_id: moderatorId,
          action,
          reason
        });

      if (error) throw error;

      // Execute the moderation action
      await this.executeModerationAction(contentId, contentType, action);

      return true;
    } catch (error) {
      console.error('Failed to moderate content:', error);
      return false;
    }
  }

  /**
   * Get recommended circles for user
   */
  async getRecommendedCircles(userId: string, limit: number = 5): Promise<SupportCircle[]> {
    // This would use a recommendation algorithm based on user profile, activity, etc.
    // For now, return popular circles in similar categories
    const { data: recommendations, error } = await this.supabase
      .rpc('get_recommended_circles', { user_id: userId, limit });

    if (error) throw error;
    return recommendations || [];
  }

  /**
   * Private helper methods
   */
  private async addMember(circleId: string, userId: string, role: CircleRole): Promise<boolean> {
    const { error } = await this.supabase
      .from('circle_memberships_v5')
      .insert({
        circle_id: circleId,
        user_id: userId,
        role,
        is_active: true,
        notification_preferences: {
          new_posts: true,
          new_members: true,
          events: true,
          announcements: true,
          mentions: true
        }
      });

    return !error;
  }

  private async isMember(circleId: string, userId: string): Promise<boolean> {
    const { data: membership, error } = await this.supabase
      .from('circle_memberships_v5')
      .select('*')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return !error && !!membership;
  }

  private async canViewCircle(circleId: string, userId?: string): Promise<boolean> {
    const { data: circle, error } = await this.supabase
      .from('support_circles_v5')
      .select('visibility')
      .eq('id', circleId)
      .single();

    if (error) return false;

    if (circle.visibility === 'public') return true;
    if (!userId) return false;

    return await this.isMember(circleId, userId);
  }

  private async getUserRole(circleId: string, userId: string): Promise<CircleRole> {
    const { data: membership, error } = await this.supabase
      .from('circle_memberships_v5')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return error ? 'member' : membership.role;
  }

  private async logActivity(
    circleId: string,
    userId: string,
    activityType: string,
    contentId?: string,
    details?: any
  ): Promise<void> {
    const { error } = await this.supabase
      .from('circle_activity_v5')
      .insert({
        circle_id: circleId,
        user_id: userId,
        activity_type: activityType,
        content_id: contentId,
        details
      });

    if (error) console.error('Failed to log activity:', error);
  }

  private async executeModerationAction(
    contentId: string,
    contentType: 'post' | 'reply' | 'resource',
    action: ModerationAction
  ): Promise<void> {
    const tableMap = {
      post: 'circle_posts_v5',
      reply: 'circle_replies_v5',
      resource: 'circle_resources_v5'
    };

    const table = tableMap[contentType];
    if (!table) return;

    switch (action) {
      case 'delete':
        await this.supabase.from(table).delete().eq('id', contentId);
        break;
      case 'pin':
        await this.supabase.from(table).update({ is_pinned: true }).eq('id', contentId);
        break;
      case 'unpin':
        await this.supabase.from(table).update({ is_pinned: false }).eq('id', contentId);
        break;
      case 'approve':
        await this.supabase.from(table).update({ moderation_status: 'approved' }).eq('id', contentId);
        break;
      case 'reject':
        await this.supabase.from(table).update({ moderation_status: 'rejected' }).eq('id', contentId);
        break;
      // Add more actions as needed
    }
  }
}