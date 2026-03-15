// Support Circle types for V5 modular architecture
export interface SupportCircle {
  id: string;
  name: string;
  description: string;
  category: CircleCategory;
  visibility: CircleVisibility;
  created_by: string;
  moderator_id?: string;
  max_members: number;
  current_members: number;
  is_active: boolean;
  rules: CircleRule[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CircleMembership {
  id: string;
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
  is_active: boolean;
  last_activity: string;
  notification_preferences: CircleNotificationPrefs;
}

export interface CirclePost {
  id: string;
  circle_id: string;
  author_id: string;
  title?: string;
  content: string;
  post_type: PostType;
  attachments?: PostAttachment[];
  is_pinned: boolean;
  is_anonymous: boolean;
  reply_count: number;
  like_count: number;
  report_count: number;
  moderation_status: PostModerationStatus;
  moderated_by?: string;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CircleReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_anonymous: boolean;
  like_count: number;
  report_count: number;
  moderation_status: PostModerationStatus;
  moderated_by?: string;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CircleEvent {
  id: string;
  circle_id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  location?: EventLocation;
  max_attendees?: number;
  current_attendees: number;
  organizer_id: string;
  is_cancelled: boolean;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  joined_at: string;
}

export interface CircleResource {
  id: string;
  circle_id: string;
  title: string;
  description: string;
  resource_type: ResourceType;
  content: string;
  attachments?: ResourceAttachment[];
  is_pinned: boolean;
  view_count: number;
  like_count: number;
  created_by: string;
  created_at: string;
}

export interface CircleModeration {
  id: string;
  circle_id: string;
  content_id: string;
  content_type: 'post' | 'reply' | 'resource';
  moderator_id: string;
  action: ModerationAction;
  reason: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface CircleStats {
  total_circles: number;
  active_circles: number;
  total_members: number;
  total_posts: number;
  total_events: number;
  circles_by_category: Record<CircleCategory, number>;
  engagement_rate: number;
  average_members_per_circle: number;
}

export interface CircleSearchFilters {
  category?: CircleCategory[];
  visibility?: CircleVisibility[];
  tags?: string[];
  min_members?: number;
  max_members?: number;
  has_moderator?: boolean;
  is_active?: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CircleCategory =
  | 'anxiety'
  | 'depression'
  | 'ptsd'
  | 'ocd'
  | 'eating_disorders'
  | 'addiction'
  | 'grief'
  | 'relationships'
  | 'lgbtq'
  | 'youth'
  | 'elders'
  | 'general'
  | 'peer_support'
  | 'professional_led';

export type CircleVisibility =
  | 'public'
  | 'private'
  | 'invite_only'
  | 'moderated';

export type CircleRole =
  | 'member'
  | 'moderator'
  | 'admin'
  | 'organizer';

export type PostType =
  | 'discussion'
  | 'question'
  | 'experience'
  | 'resource'
  | 'announcement'
  | 'support_request';

export type PostModerationStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'flagged'
  | 'under_review';

export type EventType =
  | 'meeting'
  | 'workshop'
  | 'support_session'
  | 'social'
  | 'educational'
  | 'peer_support';

export type AttendanceStatus =
  | 'attending'
  | 'maybe'
  | 'not_attending'
  | 'waitlist';

export type ResourceType =
  | 'article'
  | 'guide'
  | 'worksheet'
  | 'video'
  | 'audio'
  | 'link'
  | 'document';

export type ModerationAction =
  | 'approve'
  | 'reject'
  | 'delete'
  | 'edit'
  | 'pin'
  | 'unpin'
  | 'move'
  | 'warn'
  | 'ban_member';

export interface CircleRule {
  id: string;
  rule: string;
  is_required: boolean;
  priority: number;
}

export interface CircleNotificationPrefs {
  new_posts: boolean;
  new_members: boolean;
  events: boolean;
  announcements: boolean;
  mentions: boolean;
}

export interface PostAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  url: string;
  thumbnail_url?: string;
}

export interface ResourceAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  url: string;
}

export interface EventLocation {
  type: 'virtual' | 'physical' | 'hybrid';
  virtual_link?: string;
  physical_address?: string;
  instructions?: string;
}

export interface CircleActivity {
  id: string;
  circle_id: string;
  user_id: string;
  activity_type: ActivityType;
  content_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export type ActivityType =
  | 'joined_circle'
  | 'left_circle'
  | 'created_post'
  | 'created_reply'
  | 'liked_post'
  | 'attended_event'
  | 'viewed_resource'
  | 'moderation_action';

export interface CircleRecommendation {
  circle_id: string;
  user_id: string;
  score: number;
  reasons: string[];
  recommended_at: string;
}

export interface CircleResult {
  success: boolean;
  circle_id?: string;
  post_id?: string;
  event_id?: string;
  error?: string;
}