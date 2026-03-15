// V9 Ethical Research Consent System
// User-controlled data sharing for research purposes

import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export type ConsentStatus = 'granted' | 'withdrawn' | 'pending' | 'expired';
export type DataCategory =
  | 'mood_data'
  | 'session_data'
  | 'recovery_data'
  | 'panic_data'
  | 'community_data'
  | 'conversation_data'
  | 'healing_data';

export interface ResearchConsent {
  userId: string;
  consentVersion: string;
  status: ConsentStatus;
  grantedAt?: string;
  withdrawnAt?: string;
  expiresAt?: string;
  dataCategories: DataCategory[];
  researchPurposes: string[];
  institutionRestrictions?: string[]; // Block specific institutions
  geographicRestrictions?: string[]; // Block specific countries/regions
  withdrawalRequested: boolean;
  withdrawalReason?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    consentFormVersion: string;
    legalBasis: string;
    dataRetentionPeriod: number; // days
    contactForWithdrawals: string;
  };
}

export interface ConsentUpdateRequest {
  userId: string;
  action: 'grant' | 'withdraw' | 'update_categories' | 'update_restrictions';
  dataCategories?: DataCategory[];
  researchPurposes?: string[];
  institutionRestrictions?: string[];
  geographicRestrictions?: string[];
  withdrawalReason?: string;
  consentVersion: string;
}

export interface ConsentValidationResult {
  isValid: boolean;
  consent?: ResearchConsent;
  errors: string[];
  warnings: string[];
}

export interface DataUsageRequest {
  researcherId: string;
  institution: string;
  researchPurpose: string;
  dataCategories: DataCategory[];
  geographicLocation?: string;
  requestedRecords: number;
  retentionPeriod: number; // days
}

export class EthicalResearchConsentSystem {
  private static instance: EthicalResearchConsentSystem;

  // Current consent form version - must be updated when terms change
  private readonly CURRENT_CONSENT_VERSION = 'v9.0.1';

  // Required consent elements for GDPR compliance
  private readonly REQUIRED_CONSENT_ELEMENTS = [
    'data_processing_purpose',
    'data_categories',
    'retention_period',
    'rights_to_withdraw',
    'data_sharing_restrictions',
    'anonymization_guarantees',
    'contact_information'
  ];

  private constructor() {}

  static getInstance(): EthicalResearchConsentSystem {
    if (!EthicalResearchConsentSystem.instance) {
      EthicalResearchConsentSystem.instance = new EthicalResearchConsentSystem();
    }
    return EthicalResearchConsentSystem.instance;
  }

  /**
   * Grant or update research consent
   */
  async updateConsent(request: ConsentUpdateRequest): Promise<ResearchConsent> {
    // Validate request
    const validation = await this.validateConsentRequest(request);
    if (!validation.isValid) {
      throw new Error(`Invalid consent request: ${validation.errors.join(', ')}`);
    }

    const adapter = db.getAdapter();
    const now = new Date().toISOString();

    if (request.action === 'grant') {
      // Insert new consent record
      const consent: ResearchConsent = {
        userId: request.userId,
        consentVersion: request.consentVersion,
        status: 'granted',
        grantedAt: now,
        expiresAt: this.calculateExpiryDate(),
        dataCategories: request.dataCategories || [],
        researchPurposes: request.researchPurposes || [],
        institutionRestrictions: request.institutionRestrictions || [],
        geographicRestrictions: request.geographicRestrictions || [],
        withdrawalRequested: false,
        metadata: {
          consentFormVersion: this.CURRENT_CONSENT_VERSION,
          legalBasis: 'GDPR_Art6_1a', // Consent
          dataRetentionPeriod: 2555, // ~7 years for longitudinal research
          contactForWithdrawals: 'privacy@solace-platform.org',
          ipAddress: request.metadata?.ipAddress,
          userAgent: request.metadata?.userAgent
        }
      };

      await adapter.query(`
        INSERT INTO research_consent_settings (
          user_id,
          allow_anonymous_research_data,
          consent_granted_at,
          consent_version,
          data_categories,
          research_purposes,
          institution_restrictions,
          geographic_restrictions,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET
          allow_anonymous_research_data = true,
          consent_granted_at = EXCLUDED.consent_granted_at,
          consent_version = EXCLUDED.consent_version,
          data_categories = EXCLUDED.data_categories,
          research_purposes = EXCLUDED.research_purposes,
          institution_restrictions = EXCLUDED.institution_restrictions,
          geographic_restrictions = EXCLUDED.geographic_restrictions,
          metadata = EXCLUDED.metadata
      `, [
        request.userId,
        true,
        now,
        request.consentVersion,
        JSON.stringify(request.dataCategories),
        JSON.stringify(request.researchPurposes),
        JSON.stringify(request.institutionRestrictions),
        JSON.stringify(request.geographicRestrictions),
        JSON.stringify(consent.metadata)
      ]);

      return consent;

    } else if (request.action === 'withdraw') {
      // Update consent to withdrawn
      await adapter.query(`
        UPDATE research_consent_settings
        SET
          allow_anonymous_research_data = false,
          withdrawal_requested_at = ?,
          withdrawal_reason = ?,
          metadata = jsonb_set(metadata, '{withdrawn_at}', ?)
        WHERE user_id = ?
      `, [
        now,
        request.withdrawalReason,
        JSON.stringify(now),
        request.userId
      ]);

      // Get updated consent
      return await this.getUserConsent(request.userId);

    } else if (request.action === 'update_categories') {
      // Update data categories
      await adapter.query(`
        UPDATE research_consent_settings
        SET
          data_categories = ?,
          metadata = jsonb_set(metadata, '{last_updated}', ?)
        WHERE user_id = ?
      `, [
        JSON.stringify(request.dataCategories),
        JSON.stringify(now),
        request.userId
      ]);

      return await this.getUserConsent(request.userId);
    }

    throw new Error(`Unsupported consent action: ${request.action}`);
  }

  /**
   * Get user's current research consent status
   */
  async getUserConsent(userId: string): Promise<ResearchConsent | null> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM research_consent_settings WHERE user_id = ?
    `, [userId]);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const now = new Date();
    const expiresAt = row.consent_granted_at ? new Date(row.consent_granted_at) : null;
    if (expiresAt) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 7); // 7 year retention
    }

    let status: ConsentStatus = 'pending';
    if (row.allow_anonymous_research_data && row.consent_granted_at) {
      if (row.withdrawal_requested_at) {
        status = 'withdrawn';
      } else if (expiresAt && now > expiresAt) {
        status = 'expired';
      } else {
        status = 'granted';
      }
    }

    return {
      userId: row.user_id,
      consentVersion: row.consent_version || 'v9.0',
      status,
      grantedAt: row.consent_granted_at,
      withdrawnAt: row.withdrawal_requested_at,
      expiresAt: expiresAt?.toISOString(),
      dataCategories: row.data_categories ? JSON.parse(row.data_categories) : [],
      researchPurposes: row.research_purposes ? JSON.parse(row.research_purposes) : [],
      institutionRestrictions: row.institution_restrictions ? JSON.parse(row.institution_restrictions) : [],
      geographicRestrictions: row.geographic_restrictions ? JSON.parse(row.geographic_restrictions) : [],
      withdrawalRequested: !!row.withdrawal_requested_at,
      withdrawalReason: row.withdrawal_reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  /**
   * Validate if data usage is permitted for a research request
   */
  async validateDataUsage(request: DataUsageRequest): Promise<ConsentValidationResult> {
    const result: ConsentValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if researcher institution is restricted
    const restrictedInstitutions = await this.getRestrictedInstitutions();
    if (restrictedInstitutions.includes(request.institution)) {
      result.isValid = false;
      result.errors.push(`Institution "${request.institution}" is restricted from data access`);
    }

    // Check geographic restrictions
    if (request.geographicLocation) {
      const restrictedRegions = await this.getRestrictedGeographicRegions();
      if (restrictedRegions.includes(request.geographicLocation)) {
        result.isValid = false;
        result.errors.push(`Geographic region "${request.geographicLocation}" is restricted`);
      }
    }

    // Validate research purpose alignment
    const allowedPurposes = await this.getAllowedResearchPurposes();
    const hasValidPurpose = request.researchPurposes.some(purpose =>
      allowedPurposes.includes(purpose)
    );

    if (!hasValidPurpose) {
      result.warnings.push('Research purpose may not align with granted consent categories');
    }

    // Check data category permissions
    const allowedCategories = await this.getAllowedDataCategories();
    const unauthorizedCategories = request.dataCategories.filter(cat =>
      !allowedCategories.includes(cat)
    );

    if (unauthorizedCategories.length > 0) {
      result.isValid = false;
      result.errors.push(`Unauthorized data categories: ${unauthorizedCategories.join(', ')}`);
    }

    // Check retention period compliance
    const maxRetention = await this.getMaxRetentionPeriod();
    if (request.retentionPeriod > maxRetention) {
      result.isValid = false;
      result.errors.push(`Retention period exceeds maximum allowed: ${maxRetention} days`);
    }

    return result;
  }

  /**
   * Get consent statistics for platform monitoring
   */
  async getConsentStatistics(): Promise<{
    totalUsers: number;
    consentedUsers: number;
    withdrawnUsers: number;
    consentRate: number;
    averageCategories: number;
    topPurposes: string[];
    topRestrictions: string[];
  }> {
    const adapter = db.getAdapter();

    const stats = await adapter.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN allow_anonymous_research_data = true THEN 1 END) as consented_users,
        COUNT(CASE WHEN withdrawal_requested_at IS NOT NULL THEN 1 END) as withdrawn_users,
        AVG(CASE WHEN data_categories IS NOT NULL THEN json_array_length(data_categories) ELSE 0 END) as avg_categories
      FROM research_consent_settings
    `);

    const row = stats[0];

    // Get top research purposes
    const purposes = await adapter.query(`
      SELECT json_array_elements_text(research_purposes) as purpose, COUNT(*) as count
      FROM research_consent_settings
      WHERE research_purposes IS NOT NULL
      GROUP BY purpose
      ORDER BY count DESC
      LIMIT 5
    `);

    // Get top restrictions
    const restrictions = await adapter.query(`
      SELECT json_array_elements_text(institution_restrictions) as restriction, COUNT(*) as count
      FROM research_consent_settings
      WHERE institution_restrictions IS NOT NULL
      GROUP BY restriction
      ORDER BY count DESC
      LIMIT 5
    `);

    return {
      totalUsers: parseInt(row.total_users),
      consentedUsers: parseInt(row.consented_users),
      withdrawnUsers: parseInt(row.withdrawn_users),
      consentRate: row.total_users > 0 ? (row.consented_users / row.total_users) * 100 : 0,
      averageCategories: parseFloat(row.avg_categories) || 0,
      topPurposes: purposes.map(p => p.purpose),
      topRestrictions: restrictions.map(r => r.restriction)
    };
  }

  /**
   * Process consent withdrawal requests
   */
  async processWithdrawalRequest(userId: string, reason: string): Promise<void> {
    const adapter = db.getAdapter();

    // Mark all user's data as excluded from research
    await adapter.query(`
      UPDATE emotion_logs SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE session_metrics SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE clinical_recovery_metrics SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE panic_events SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE support_circle_participation SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE conversation_patterns SET research_consent = false WHERE user_id = ?
    `, [userId]);

    await adapter.query(`
      UPDATE healing_guidance_interactions SET research_consent = false WHERE user_id = ?
    `, [userId]);

    // Update consent status
    await this.updateConsent({
      userId,
      action: 'withdraw',
      withdrawalReason: reason,
      consentVersion: this.CURRENT_CONSENT_VERSION
    });

    // Log withdrawal for audit trail
    await this.logConsentEvent(userId, 'withdrawal_processed', { reason });
  }

  /**
   * Validate consent request parameters
   */
  private async validateConsentRequest(request: ConsentUpdateRequest): Promise<ConsentValidationResult> {
    const result: ConsentValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check consent version
    if (request.consentVersion !== this.CURRENT_CONSENT_VERSION) {
      result.warnings.push(`Consent version mismatch. Current: ${this.CURRENT_CONSENT_VERSION}, Provided: ${request.consentVersion}`);
    }

    // Validate data categories
    const validCategories: DataCategory[] = [
      'mood_data', 'session_data', 'recovery_data', 'panic_data',
      'community_data', 'conversation_data', 'healing_data'
    ];

    if (request.dataCategories) {
      const invalidCategories = request.dataCategories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        result.isValid = false;
        result.errors.push(`Invalid data categories: ${invalidCategories.join(', ')}`);
      }
    }

    // Validate research purposes
    if (request.researchPurposes) {
      const validPurposes = [
        'mental_health_research', 'psychological_studies', 'intervention_effectiveness',
        'recovery_patterns', 'peer_support_analysis', 'crisis_prevention'
      ];

      const invalidPurposes = request.researchPurposes.filter(purpose => !validPurposes.includes(purpose));
      if (invalidPurposes.length > 0) {
        result.warnings.push(`Uncommon research purposes: ${invalidPurposes.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Calculate consent expiry date (7 years from grant date)
   */
  private calculateExpiryDate(): string {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 7);
    return expiry.toISOString();
  }

  /**
   * Get globally restricted institutions
   */
  private async getRestrictedInstitutions(): Promise<string[]> {
    // This would be configurable through admin settings
    return ['restricted_institution_1', 'restricted_institution_2'];
  }

  /**
   * Get globally restricted geographic regions
   */
  private async getRestrictedGeographicRegions(): Promise<string[]> {
    // This would be configurable through admin settings
    return ['restricted_region_1'];
  }

  /**
   * Get allowed research purposes
   */
  private async getAllowedResearchPurposes(): Promise<string[]> {
    return [
      'mental_health_research', 'psychological_studies', 'intervention_effectiveness',
      'recovery_patterns', 'peer_support_analysis', 'crisis_prevention'
    ];
  }

  /**
   * Get allowed data categories
   */
  private async getAllowedDataCategories(): Promise<DataCategory[]> {
    return [
      'mood_data', 'session_data', 'recovery_data', 'panic_data',
      'community_data', 'conversation_data', 'healing_data'
    ];
  }

  /**
   * Get maximum retention period
   */
  private async getMaxRetentionPeriod(): Promise<number> {
    return 2555; // ~7 years
  }

  /**
   * Log consent-related events for audit trail
   */
  private async logConsentEvent(userId: string, eventType: string, details: any): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO admin_actions (
        admin_id,
        action_type,
        target_user_id,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      'system', // System-generated
      `consent_${eventType}`,
      userId,
      JSON.stringify(details),
      new Date().toISOString()
    ]);
  }
}

export const ethicalResearchConsentSystem = EthicalResearchConsentSystem.getInstance();