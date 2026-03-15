// Panic/Crisis types for V5 modular architecture
export interface CrisisAlert {
  id: string;
  user_id: string;
  alert_type: CrisisAlertType;
  severity: CrisisSeverity;
  location?: CrisisLocation;
  description?: string;
  emergency_contacts_notified: boolean;
  authorities_notified: boolean;
  status: CrisisStatus;
  response_time?: number; // in minutes
  responder_id?: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  follow_up_required: boolean;
}

export interface CrisisLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  place_name?: string;
  shared: boolean; // Whether user consented to share location
}

export interface CrisisResponder {
  id: string;
  user_id: string;
  responder_type: ResponderType;
  is_available: boolean;
  specialties: CrisisSpecialty[];
  response_time_minutes: number;
  contact_methods: ContactMethod[];
  languages: string[];
  rating: number;
  total_responses: number;
  last_active: string;
}

export interface CrisisResponse {
  id: string;
  alert_id: string;
  responder_id: string;
  response_type: ResponseType;
  message?: string;
  contact_method: ContactMethod;
  status: ResponseStatus;
  started_at: string;
  completed_at?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
  is_primary: boolean;
  notification_preference: NotificationPreference;
  last_notified?: string;
}

export interface CrisisResource {
  id: string;
  name: string;
  type: ResourceType;
  category: CrisisCategory;
  description: string;
  contact_info: ContactInfo;
  availability: Availability;
  languages: string[];
  is_active: boolean;
  priority: number;
  response_time_minutes: number;
}

export interface CrisisProtocol {
  id: string;
  name: string;
  trigger_conditions: TriggerCondition[];
  severity: CrisisSeverity;
  immediate_actions: CrisisAction[];
  escalation_steps: EscalationStep[];
  follow_up_procedures: FollowUpProcedure[];
  is_active: boolean;
}

export interface CrisisAssessment {
  id: string;
  user_id: string;
  assessment_type: AssessmentType;
  responses: Record<string, any>;
  risk_level: RiskLevel;
  recommendations: CrisisRecommendation[];
  assessed_by?: string;
  created_at: string;
  follow_up_date?: string;
}

export interface CrisisRecommendation {
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actions: string[];
  resources: string[]; // Resource IDs
  timeframe: string;
}

export interface CrisisStats {
  total_alerts: number;
  active_alerts: number;
  resolved_alerts: number;
  average_response_time: number;
  alerts_by_type: Record<CrisisAlertType, number>;
  alerts_by_severity: Record<CrisisSeverity, number>;
  responder_utilization: Record<string, number>;
  success_rate: number;
}

export type CrisisAlertType =
  | 'panic_button'
  | 'suicidal_thoughts'
  | 'self_harm'
  | 'mental_health_crisis'
  | 'emotional_distress'
  | 'substance_abuse'
  | 'domestic_violence'
  | 'sexual_assault'
  | 'other';

export type CrisisSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'immediate';

export type CrisisStatus =
  | 'active'
  | 'responding'
  | 'resolved'
  | 'escalated'
  | 'cancelled'
  | 'follow_up_needed';

export type ResponderType =
  | 'counselor'
  | 'crisis_specialist'
  | 'peer_supporter'
  | 'hotline_operator'
  | 'emergency_services';

export type CrisisSpecialty =
  | 'suicide_prevention'
  | 'domestic_violence'
  | 'sexual_assault'
  | 'substance_abuse'
  | 'lgbtq_crisis'
  | 'youth_crisis'
  | 'elder_crisis'
  | 'general_crisis';

export type ContactMethod =
  | 'chat'
  | 'voice_call'
  | 'video_call'
  | 'text_message'
  | 'email';

export type ResponseType =
  | 'immediate_support'
  | 'resource_referral'
  | 'professional_help'
  | 'safety_planning'
  | 'follow_up';

export type ResponseStatus =
  | 'initiated'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type NotificationPreference =
  | 'immediate'
  | 'within_hour'
  | 'daily_summary'
  | 'never';

export type ResourceType =
  | 'hotline'
  | 'crisis_center'
  | 'counseling'
  | 'hospital'
  | 'support_group'
  | 'online_resource'
  | 'emergency_services';

export type CrisisCategory =
  | 'suicide_prevention'
  | 'mental_health'
  | 'substance_abuse'
  | 'domestic_violence'
  | 'sexual_assault'
  | 'general_crisis'
  | 'youth_services'
  | 'elder_services';

export type Availability =
  | '24_7'
  | 'business_hours'
  | 'weekdays'
  | 'weekends'
  | 'limited';

export type AssessmentType =
  | 'initial_crisis'
  | 'risk_assessment'
  | 'safety_planning'
  | 'follow_up';

export type RiskLevel =
  | 'low'
  | 'moderate'
  | 'high'
  | 'severe'
  | 'extreme';

export type RecommendationType =
  | 'immediate_action'
  | 'professional_help'
  | 'safety_plan'
  | 'resource_access'
  | 'follow_up'
  | 'monitoring';

export interface TriggerCondition {
  type: 'keyword' | 'behavior' | 'threshold' | 'combination';
  conditions: Record<string, any>;
  operator: 'AND' | 'OR';
}

export interface CrisisAction {
  type: 'notify_contacts' | 'alert_authorities' | 'dispatch_responder' | 'send_resources';
  priority: number;
  parameters: Record<string, any>;
}

export interface EscalationStep {
  condition: string;
  action: CrisisAction;
  timeout_minutes: number;
}

export interface FollowUpProcedure {
  type: 'check_in' | 'assessment' | 'resource_followup' | 'professional_referral';
  timing: string; // e.g., "24 hours", "1 week"
  responsible_party: string;
  template?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  additional_info?: Record<string, any>;
}

export interface CrisisResult {
  success: boolean;
  alert_id?: string;
  response_id?: string;
  error?: string;
  responders_notified?: number;
  estimated_response_time?: number;
}