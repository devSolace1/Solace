import { createClient } from '@supabase/supabase-js';
import type {
  CrisisAlert,
  CrisisResponder,
  CrisisResponse,
  EmergencyContact,
  CrisisResource,
  CrisisProtocol,
  CrisisAssessment,
  CrisisStats,
  CrisisResult,
  CrisisAlertType,
  CrisisSeverity,
  CrisisLocation,
  ContactMethod,
  ResponseType
} from '../types';

export class PanicService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Trigger a crisis alert (panic button)
   */
  async triggerCrisisAlert(
    userId: string,
    alertType: CrisisAlertType,
    severity: CrisisSeverity = 'high',
    description?: string,
    location?: CrisisLocation
  ): Promise<CrisisResult> {
    try {
      // Determine severity and protocol based on alert type
      const finalSeverity = this.calculateSeverity(alertType, severity);

      // Get applicable crisis protocol
      const protocol = await this.getApplicableProtocol(alertType, finalSeverity);

      // Create crisis alert
      const { data: alert, error: alertError } = await this.supabase
        .from('crisis_alerts_v5')
        .insert({
          user_id: userId,
          alert_type: alertType,
          severity: finalSeverity,
          location,
          description,
          emergency_contacts_notified: false,
          authorities_notified: false,
          status: 'active',
          follow_up_required: true
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Execute immediate actions based on protocol
      const actionResults = await this.executeProtocolActions(alert, protocol);

      // Notify emergency contacts if appropriate
      if (finalSeverity === 'critical' || finalSeverity === 'immediate') {
        await this.notifyEmergencyContacts(userId, alert);
      }

      // Dispatch responders
      const responderResults = await this.dispatchResponders(alert, protocol);

      return {
        success: true,
        alert_id: alert.id,
        responders_notified: responderResults.respondersNotified,
        estimated_response_time: responderResults.estimatedResponseTime
      };
    } catch (error) {
      console.error('Failed to trigger crisis alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger crisis alert'
      };
    }
  }

  /**
   * Get user's emergency contacts
   */
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    const { data: contacts, error } = await this.supabase
      .from('emergency_contacts_v5')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return contacts || [];
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(
    userId: string,
    name: string,
    relationship: string,
    phoneNumber: string,
    email?: string,
    isPrimary: boolean = false
  ): Promise<boolean> {
    try {
      // If setting as primary, unset other primary contacts
      if (isPrimary) {
        await this.supabase
          .from('emergency_contacts_v5')
          .update({ is_primary: false })
          .eq('user_id', userId);
      }

      const { error } = await this.supabase
        .from('emergency_contacts_v5')
        .insert({
          user_id: userId,
          name,
          relationship,
          phone_number: phoneNumber,
          email,
          is_primary: isPrimary,
          notification_preference: 'immediate'
        });

      return !error;
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      return false;
    }
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    contactId: string,
    userId: string,
    updates: Partial<Omit<EmergencyContact, 'id' | 'user_id'>>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('emergency_contacts_v5')
      .update(updates)
      .eq('id', contactId)
      .eq('user_id', userId);

    return !error;
  }

  /**
   * Remove emergency contact
   */
  async removeEmergencyContact(contactId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('emergency_contacts_v5')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    return !error;
  }

  /**
   * Get available crisis resources
   */
  async getCrisisResources(
    category?: string,
    language?: string,
    available24_7: boolean = false
  ): Promise<CrisisResource[]> {
    let query = this.supabase
      .from('crisis_resources_v5')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (language) {
      query = query.contains('languages', [language]);
    }

    if (available24_7) {
      query = query.eq('availability', '24_7');
    }

    const { data: resources, error } = await query;
    if (error) throw error;

    return resources || [];
  }

  /**
   * Get available responders
   */
  async getAvailableResponders(specialty?: string, language?: string): Promise<CrisisResponder[]> {
    let query = this.supabase
      .from('crisis_responders_v5')
      .select('*')
      .eq('is_available', true)
      .order('response_time_minutes', { ascending: true })
      .order('rating', { ascending: false });

    if (specialty) {
      query = query.contains('specialties', [specialty]);
    }

    if (language) {
      query = query.contains('languages', [language]);
    }

    const { data: responders, error } = await query;
    if (error) throw error;

    return responders || [];
  }

  /**
   * Start crisis response
   */
  async startCrisisResponse(
    alertId: string,
    responderId: string,
    responseType: ResponseType,
    contactMethod: ContactMethod,
    message?: string
  ): Promise<CrisisResult> {
    try {
      const { data: response, error } = await this.supabase
        .from('crisis_responses_v5')
        .insert({
          alert_id: alertId,
          responder_id: responderId,
          response_type: responseType,
          message,
          contact_method: contactMethod,
          status: 'initiated'
        })
        .select()
        .single();

      if (error) throw error;

      // Update alert status
      await this.supabase
        .from('crisis_alerts_v5')
        .update({
          status: 'responding',
          responder_id: responderId
        })
        .eq('id', alertId);

      return { success: true, response_id: response.id };
    } catch (error) {
      console.error('Failed to start crisis response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start crisis response'
      };
    }
  }

  /**
   * Complete crisis response
   */
  async completeCrisisResponse(
    responseId: string,
    alertId: string,
    notes?: string,
    followUpRequired: boolean = false
  ): Promise<boolean> {
    try {
      // Update response
      const { error: responseError } = await this.supabase
        .from('crisis_responses_v5')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes
        })
        .eq('id', responseId);

      if (responseError) throw responseError;

      // Update alert
      const { error: alertError } = await this.supabase
        .from('crisis_alerts_v5')
        .update({
          status: followUpRequired ? 'follow_up_needed' : 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
          follow_up_required: followUpRequired
        })
        .eq('id', alertId);

      if (alertError) throw alertError;

      return true;
    } catch (error) {
      console.error('Failed to complete crisis response:', error);
      return false;
    }
  }

  /**
   * Create crisis assessment
   */
  async createCrisisAssessment(
    userId: string,
    assessmentType: string,
    responses: Record<string, any>,
    assessedBy?: string
  ): Promise<string | null> {
    try {
      // Calculate risk level based on responses
      const riskLevel = this.calculateRiskLevel(responses);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskLevel, responses);

      const { data: assessment, error } = await this.supabase
        .from('crisis_assessments_v5')
        .insert({
          user_id: userId,
          assessment_type: assessmentType,
          responses,
          risk_level: riskLevel,
          recommendations,
          assessed_by: assessedBy
        })
        .select()
        .single();

      if (error) throw error;

      // If high risk, trigger appropriate protocol
      if (riskLevel === 'high' || riskLevel === 'severe' || riskLevel === 'extreme') {
        await this.triggerCrisisAlert(
          userId,
          'mental_health_crisis',
          this.riskLevelToSeverity(riskLevel),
          'Assessment indicated high risk'
        );
      }

      return assessment.id;
    } catch (error) {
      console.error('Failed to create crisis assessment:', error);
      return null;
    }
  }

  /**
   * Get crisis statistics
   */
  async getCrisisStats(): Promise<CrisisStats> {
    const { data: stats, error } = await this.supabase
      .rpc('get_crisis_stats');

    if (error) throw error;
    return stats;
  }

  /**
   * Get user's crisis history
   */
  async getUserCrisisHistory(userId: string): Promise<CrisisAlert[]> {
    const { data: alerts, error } = await this.supabase
      .from('crisis_alerts_v5')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return alerts || [];
  }

  /**
   * Private helper methods
   */
  private calculateSeverity(alertType: CrisisAlertType, baseSeverity: CrisisSeverity): CrisisSeverity {
    // Escalate severity based on alert type
    const escalationMap: Record<CrisisAlertType, CrisisSeverity> = {
      panic_button: 'immediate',
      suicidal_thoughts: 'critical',
      self_harm: 'critical',
      mental_health_crisis: 'high',
      emotional_distress: 'medium',
      substance_abuse: 'high',
      domestic_violence: 'critical',
      sexual_assault: 'critical',
      other: baseSeverity
    };

    return escalationMap[alertType] || baseSeverity;
  }

  private async getApplicableProtocol(alertType: CrisisAlertType, severity: CrisisSeverity): Promise<CrisisProtocol | null> {
    // Get the most appropriate protocol based on alert type and severity
    const { data: protocols, error } = await this.supabase
      .from('crisis_protocols_v5')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: false }); // Higher severity protocols first

    if (error) return null;

    // Find protocol that matches the criteria
    return protocols?.find(protocol =>
      protocol.trigger_conditions.some(condition =>
        this.matchesTriggerCondition(condition, alertType, severity)
      )
    ) || null;
  }

  private matchesTriggerCondition(condition: any, alertType: CrisisAlertType, severity: CrisisSeverity): boolean {
    // Simplified condition matching - in practice, this would be more sophisticated
    return condition.conditions.alert_type === alertType ||
           condition.conditions.severity === severity;
  }

  private async executeProtocolActions(alert: CrisisAlert, protocol: CrisisProtocol | null): Promise<any> {
    if (!protocol) return { actionsExecuted: 0 };

    let actionsExecuted = 0;

    for (const action of protocol.immediate_actions) {
      try {
        await this.executeCrisisAction(action, alert);
        actionsExecuted++;
      } catch (error) {
        console.error('Failed to execute crisis action:', error);
      }
    }

    return { actionsExecuted };
  }

  private async executeCrisisAction(action: any, alert: CrisisAlert): Promise<void> {
    switch (action.type) {
      case 'notify_contacts':
        await this.notifyEmergencyContacts(alert.user_id, alert);
        break;
      case 'alert_authorities':
        await this.alertAuthorities(alert);
        break;
      case 'dispatch_responder':
        await this.dispatchResponders(alert, null);
        break;
      case 'send_resources':
        // Send crisis resources to user
        break;
    }
  }

  private async notifyEmergencyContacts(userId: string, alert: CrisisAlert): Promise<void> {
    const contacts = await this.getEmergencyContacts(userId);

    for (const contact of contacts) {
      if (contact.notification_preference === 'immediate') {
        // In a real implementation, this would send actual notifications
        console.log(`Notifying emergency contact: ${contact.name} for alert ${alert.id}`);
      }
    }

    // Update alert
    await this.supabase
      .from('crisis_alerts_v5')
      .update({ emergency_contacts_notified: true })
      .eq('id', alert.id);
  }

  private async alertAuthorities(alert: CrisisAlert): Promise<void> {
    // In a real implementation, this would integrate with emergency services
    console.log(`Alerting authorities for crisis alert: ${alert.id}`);

    await this.supabase
      .from('crisis_alerts_v5')
      .update({ authorities_notified: true })
      .eq('id', alert.id);
  }

  private async dispatchResponders(alert: CrisisAlert, protocol: CrisisProtocol | null): Promise<any> {
    const responders = await this.getAvailableResponders();
    let respondersNotified = 0;
    let estimatedResponseTime = 0;

    // Notify top responders based on protocol or default to 2
    const respondersToNotify = protocol?.immediate_actions.find(a => a.type === 'dispatch_responder')
      ?.parameters.count || 2;

    for (let i = 0; i < Math.min(respondersToNotify, responders.length); i++) {
      const responder = responders[i];
      // In a real implementation, this would send notifications to responders
      console.log(`Dispatching responder ${responder.id} for alert ${alert.id}`);
      respondersNotified++;
      estimatedResponseTime = Math.max(estimatedResponseTime, responder.response_time_minutes);
    }

    return { respondersNotified, estimatedResponseTime };
  }

  private calculateRiskLevel(responses: Record<string, any>): string {
    // Simplified risk calculation - in practice, this would use clinical assessment tools
    let riskScore = 0;

    // Check for high-risk indicators
    if (responses.suicidal_thoughts === 'yes') riskScore += 3;
    if (responses.self_harm === 'yes') riskScore += 3;
    if (responses.harm_others === 'yes') riskScore += 2;
    if (responses.substance_abuse === 'severe') riskScore += 2;
    if (responses.support_system === 'none') riskScore += 1;

    if (riskScore >= 5) return 'extreme';
    if (riskScore >= 3) return 'severe';
    if (riskScore >= 2) return 'high';
    if (riskScore >= 1) return 'moderate';
    return 'low';
  }

  private generateRecommendations(riskLevel: string, responses: Record<string, any>): any[] {
    const recommendations = [];

    switch (riskLevel) {
      case 'extreme':
      case 'severe':
        recommendations.push({
          type: 'immediate_action',
          priority: 'urgent',
          title: 'Immediate Professional Help Required',
          description: 'Based on your responses, immediate professional intervention is recommended.',
          actions: ['Call emergency services', 'Contact crisis hotline', 'Go to nearest emergency room'],
          resources: ['emergency_services', 'crisis_hotline']
        });
        break;
      case 'high':
        recommendations.push({
          type: 'professional_help',
          priority: 'high',
          title: 'Professional Support Recommended',
          description: 'Consider reaching out to a mental health professional.',
          actions: ['Contact therapist or counselor', 'Call crisis hotline', 'Speak with trusted person'],
          resources: ['counseling', 'crisis_hotline']
        });
        break;
      case 'moderate':
        recommendations.push({
          type: 'resource_access',
          priority: 'medium',
          title: 'Support Resources Available',
          description: 'Consider these resources for additional support.',
          actions: ['Access online resources', 'Join support group', 'Practice self-care'],
          resources: ['online_resource', 'support_group']
        });
        break;
    }

    return recommendations;
  }

  private riskLevelToSeverity(riskLevel: string): CrisisSeverity {
    switch (riskLevel) {
      case 'extreme':
        return 'immediate';
      case 'severe':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
        return 'medium';
      default:
        return 'low';
    }
  }
}