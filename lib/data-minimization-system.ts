// V9 Data Minimization Policy System
// Automated data retention and deletion management

import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export type DataCategory =
  | 'chat_messages'
  | 'mood_logs'
  | 'session_data'
  | 'panic_events'
  | 'recovery_metrics'
  | 'healing_guidance'
  | 'research_data'
  | 'analytics_events';

export type RetentionPolicy = {
  category: DataCategory;
  retentionPeriod: number; // days
  deletionMethod: 'hard_delete' | 'anonymize' | 'archive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  legalBasis?: string;
  exceptions?: string[];
};

export interface DataMinimizationConfig {
  policies: RetentionPolicy[];
  globalRetentionOverride?: number; // days
  anonymizationSalt: string;
  auditTrail: boolean;
  complianceMode: 'strict' | 'balanced' | 'permissive';
}

export interface DeletionBatch {
  id: string;
  category: DataCategory;
  recordCount: number;
  scheduledDeletion: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  auditLog: {
    initiatedBy: string;
    initiatedAt: string;
    completedAt?: string;
    recordsProcessed: number;
    recordsFailed: number;
  };
}

export interface DataRetentionReport {
  category: DataCategory;
  totalRecords: number;
  recordsEligibleForDeletion: number;
  recordsDeletedLastMonth: number;
  averageRetentionDays: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
  nextScheduledDeletion: string;
}

export class DataMinimizationSystem {
  private static instance: DataMinimizationSystem;

  // Default retention policies (GDPR compliant)
  private readonly DEFAULT_POLICIES: RetentionPolicy[] = [
    {
      category: 'chat_messages',
      retentionPeriod: 2555, // ~7 years for longitudinal research
      deletionMethod: 'anonymize',
      priority: 'high',
      legalBasis: 'GDPR_Art6_1f',
      exceptions: ['active_crisis', 'legal_hold']
    },
    {
      category: 'mood_logs',
      retentionPeriod: 2555,
      deletionMethod: 'anonymize',
      priority: 'high',
      legalBasis: 'GDPR_Art6_1f',
      exceptions: ['research_consent']
    },
    {
      category: 'session_data',
      retentionPeriod: 2555,
      deletionMethod: 'anonymize',
      priority: 'high',
      legalBasis: 'GDPR_Art6_1f',
      exceptions: ['active_crisis', 'legal_hold']
    },
    {
      category: 'panic_events',
      retentionPeriod: 2555,
      deletionMethod: 'anonymize',
      priority: 'critical',
      legalBasis: 'GDPR_Art6_1f',
      exceptions: ['active_crisis', 'legal_investigation']
    },
    {
      category: 'recovery_metrics',
      retentionPeriod: 2555,
      deletionMethod: 'anonymize',
      priority: 'high',
      legalBasis: 'GDPR_Art6_1f',
      exceptions: ['research_consent']
    },
    {
      category: 'healing_guidance',
      retentionPeriod: 1095, // 3 years
      deletionMethod: 'hard_delete',
      priority: 'medium',
      legalBasis: 'GDPR_Art6_1f'
    },
    {
      category: 'research_data',
      retentionPeriod: 2555,
      deletionMethod: 'anonymize',
      priority: 'high',
      legalBasis: 'GDPR_Art6_1a',
      exceptions: ['active_research', 'institutional_review']
    },
    {
      category: 'analytics_events',
      retentionPeriod: 365, // 1 year
      deletionMethod: 'hard_delete',
      priority: 'low',
      legalBasis: 'GDPR_Art6_1f'
    }
  ];

  private constructor() {}

  static getInstance(): DataMinimizationSystem {
    if (!DataMinimizationSystem.instance) {
      DataMinimizationSystem.instance = new DataMinimizationSystem();
    }
    return DataMinimizationSystem.instance;
  }

  /**
   * Execute data minimization across all categories
   */
  async executeDataMinimization(dryRun: boolean = false): Promise<{
    batches: DeletionBatch[];
    summary: {
      totalRecordsProcessed: number;
      totalRecordsDeleted: number;
      categoriesProcessed: number;
      executionTime: number;
    };
  }> {
    const startTime = Date.now();
    const config = await this.getMinimizationConfig();
    const batches: DeletionBatch[] = [];

    for (const policy of config.policies) {
      try {
        const batch = await this.processCategoryDeletion(policy, dryRun);
        if (batch.recordCount > 0) {
          batches.push(batch);
        }
      } catch (error) {
        console.error(`Failed to process category ${policy.category}:`, error);
        // Continue with other categories
      }
    }

    const summary = {
      totalRecordsProcessed: batches.reduce((sum, b) => sum + b.recordCount, 0),
      totalRecordsDeleted: batches.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.auditLog.recordsProcessed, 0),
      categoriesProcessed: batches.length,
      executionTime: Date.now() - startTime
    };

    // Log the minimization execution
    await this.logMinimizationExecution(batches, summary, dryRun);

    return { batches, summary };
  }

  /**
   * Get data retention report for compliance monitoring
   */
  async generateRetentionReport(): Promise<DataRetentionReport[]> {
    const config = await this.getMinimizationConfig();
    const reports: DataRetentionReport[] = [];

    for (const policy of config.policies) {
      const report = await this.generateCategoryReport(policy);
      reports.push(report);
    }

    return reports;
  }

  /**
   * Update retention policy for a data category
   */
  async updateRetentionPolicy(
    category: DataCategory,
    updates: Partial<Omit<RetentionPolicy, 'category'>>
  ): Promise<RetentionPolicy> {
    const config = await this.getMinimizationConfig();
    const policyIndex = config.policies.findIndex(p => p.category === category);

    if (policyIndex === -1) {
      throw new Error(`Policy not found for category: ${category}`);
    }

    // Validate updates
    await this.validatePolicyUpdates(updates);

    // Update policy
    config.policies[policyIndex] = { ...config.policies[policyIndex], ...updates };

    // Save updated config
    await this.saveMinimizationConfig(config);

    // Log policy change
    await this.logPolicyChange(category, updates);

    return config.policies[policyIndex];
  }

  /**
   * Handle user data deletion request (right to erasure)
   */
  async processUserDataDeletion(
    userId: string,
    reason: 'withdrawal' | 'gdpr_request' | 'account_deletion',
    immediate: boolean = false
  ): Promise<{
    categoriesProcessed: DataCategory[];
    recordsDeleted: number;
    completionTime: string;
    auditReference: string;
  }> {
    const auditReference = this.generateAuditReference();

    // Log the deletion request
    await this.logDeletionRequest(userId, reason, auditReference);

    const categoriesProcessed: DataCategory[] = [];
    let totalRecordsDeleted = 0;

    // Process each data category
    for (const category of Object.values(this.getAllCategories())) {
      try {
        const recordsDeleted = await this.deleteUserDataFromCategory(userId, category, immediate);
        if (recordsDeleted > 0) {
          categoriesProcessed.push(category);
          totalRecordsDeleted += recordsDeleted;
        }
      } catch (error) {
        console.error(`Failed to delete ${category} data for user ${userId}:`, error);
        // Continue with other categories
      }
    }

    const completionTime = new Date().toISOString();

    // Log completion
    await this.logDeletionCompletion(userId, categoriesProcessed, totalRecordsDeleted, completionTime, auditReference);

    return {
      categoriesProcessed,
      recordsDeleted: totalRecordsDeleted,
      completionTime,
      auditReference
    };
  }

  /**
   * Anonymize data instead of deleting (for research purposes)
   */
  async anonymizeDataCategory(
    category: DataCategory,
    olderThanDays: number = 2555
  ): Promise<{
    recordsAnonymized: number;
    anonymizationMethod: string;
    auditReference: string;
  }> {
    const auditReference = this.generateAuditReference();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const adapter = db.getAdapter();
    let recordsAnonymized = 0;
    let anonymizationMethod = 'hash_replacement';

    try {
      switch (category) {
        case 'chat_messages':
          const messages = await adapter.query(`
            SELECT id, content FROM messages
            WHERE created_at < ? AND content NOT LIKE 'ANONYMIZED_%'
          `, [cutoffDate.toISOString()]);

          for (const message of messages) {
            const anonymizedContent = await this.anonymizeTextContent(message.content);
            await adapter.query(`
              UPDATE messages SET content = ? WHERE id = ?
            `, [`ANONYMIZED_${anonymizedContent}`, message.id]);
          }
          recordsAnonymized = messages.length;
          break;

        case 'mood_logs':
          // Mood logs are already anonymous, just mark as anonymized
          const moodLogs = await adapter.query(`
            SELECT COUNT(*) as count FROM emotion_logs
            WHERE logged_at < ? AND research_consent = true
          `, [cutoffDate.toISOString()]);

          recordsAnonymized = moodLogs[0].count;
          break;

        // Add other categories as needed
        default:
          throw new Error(`Anonymization not implemented for category: ${category}`);
      }

      // Log anonymization
      await this.logAnonymization(category, recordsAnonymized, auditReference);

    } catch (error) {
      console.error(`Failed to anonymize ${category}:`, error);
      throw error;
    }

    return {
      recordsAnonymized,
      anonymizationMethod,
      auditReference
    };
  }

  // Private methods

  private async getMinimizationConfig(): Promise<DataMinimizationConfig> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT config_data FROM system_config WHERE config_key = 'data_minimization'
    `);

    if (result.length === 0) {
      // Return default config
      return {
        policies: this.DEFAULT_POLICIES,
        anonymizationSalt: this.generateAnonymizationSalt(),
        auditTrail: true,
        complianceMode: 'balanced'
      };
    }

    return JSON.parse(result[0].config_data);
  }

  private async saveMinimizationConfig(config: DataMinimizationConfig): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO system_config (config_key, config_data, updated_at)
      VALUES ('data_minimization', ?, ?)
      ON CONFLICT (config_key) DO UPDATE SET
        config_data = EXCLUDED.config_data,
        updated_at = EXCLUDED.updated_at
    `, [JSON.stringify(config), new Date().toISOString()]);
  }

  private async processCategoryDeletion(policy: RetentionPolicy, dryRun: boolean): Promise<DeletionBatch> {
    const batchId = this.generateBatchId();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    const adapter = db.getAdapter();

    // Count eligible records
    const countQuery = this.getCountQueryForCategory(policy.category, cutoffDate);
    const countResult = await adapter.query(countQuery.query, countQuery.params);
    const recordCount = countResult[0].count;

    if (recordCount === 0) {
      return {
        id: batchId,
        category: policy.category,
        recordCount: 0,
        scheduledDeletion: new Date().toISOString(),
        status: 'completed',
        auditLog: {
          initiatedBy: 'system',
          initiatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          recordsProcessed: 0,
          recordsFailed: 0
        }
      };
    }

    if (dryRun) {
      return {
        id: batchId,
        category: policy.category,
        recordCount,
        scheduledDeletion: new Date().toISOString(),
        status: 'pending',
        auditLog: {
          initiatedBy: 'system',
          initiatedAt: new Date().toISOString(),
          recordsProcessed: 0,
          recordsFailed: 0
        }
      };
    }

    // Execute deletion
    const deleteQuery = this.getDeleteQueryForCategory(policy.category, cutoffDate);
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      if (policy.deletionMethod === 'hard_delete') {
        const result = await adapter.query(deleteQuery.query, deleteQuery.params);
        recordsProcessed = result.affectedRows || recordCount;
      } else if (policy.deletionMethod === 'anonymize') {
        await this.anonymizeDataCategory(policy.category, policy.retentionPeriod);
        recordsProcessed = recordCount;
      }
      // Archive method would move data to archive tables
    } catch (error) {
      console.error(`Deletion failed for ${policy.category}:`, error);
      recordsFailed = recordCount;
    }

    const status = recordsFailed === 0 ? 'completed' : 'failed';

    return {
      id: batchId,
      category: policy.category,
      recordCount,
      scheduledDeletion: new Date().toISOString(),
      status,
      errorMessage: recordsFailed > 0 ? 'Partial deletion failure' : undefined,
      auditLog: {
        initiatedBy: 'system',
        initiatedAt: new Date().toISOString(),
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        recordsProcessed,
        recordsFailed
      }
    };
  }

  private getCountQueryForCategory(category: DataCategory, cutoffDate: Date): { query: string; params: any[] } {
    const cutoff = cutoffDate.toISOString();

    switch (category) {
      case 'chat_messages':
        return {
          query: 'SELECT COUNT(*) as count FROM messages WHERE created_at < ?',
          params: [cutoff]
        };

      case 'mood_logs':
        return {
          query: 'SELECT COUNT(*) as count FROM emotion_logs WHERE logged_at < ?',
          params: [cutoff]
        };

      case 'session_data':
        return {
          query: 'SELECT COUNT(*) as count FROM session_metrics WHERE started_at < ?',
          params: [cutoff]
        };

      case 'panic_events':
        return {
          query: 'SELECT COUNT(*) as count FROM panic_events WHERE triggered_at < ?',
          params: [cutoff]
        };

      case 'recovery_metrics':
        return {
          query: 'SELECT COUNT(*) as count FROM clinical_recovery_metrics WHERE calculated_at < ?',
          params: [cutoff]
        };

      case 'healing_guidance':
        return {
          query: 'SELECT COUNT(*) as count FROM healing_guidance_interactions WHERE suggested_at < ?',
          params: [cutoff]
        };

      case 'research_data':
        return {
          query: 'SELECT COUNT(*) as count FROM research_exports WHERE exported_at < ?',
          params: [cutoff]
        };

      case 'analytics_events':
        return {
          query: 'SELECT COUNT(*) as count FROM analytics_events WHERE created_at < ?',
          params: [cutoff]
        };

      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  private getDeleteQueryForCategory(category: DataCategory, cutoffDate: Date): { query: string; params: any[] } {
    const cutoff = cutoffDate.toISOString();

    switch (category) {
      case 'chat_messages':
        return {
          query: 'DELETE FROM messages WHERE created_at < ?',
          params: [cutoff]
        };

      case 'mood_logs':
        return {
          query: 'DELETE FROM emotion_logs WHERE logged_at < ?',
          params: [cutoff]
        };

      case 'session_data':
        return {
          query: 'DELETE FROM session_metrics WHERE started_at < ?',
          params: [cutoff]
        };

      case 'panic_events':
        return {
          query: 'DELETE FROM panic_events WHERE triggered_at < ?',
          params: [cutoff]
        };

      case 'recovery_metrics':
        return {
          query: 'DELETE FROM clinical_recovery_metrics WHERE calculated_at < ?',
          params: [cutoff]
        };

      case 'healing_guidance':
        return {
          query: 'DELETE FROM healing_guidance_interactions WHERE suggested_at < ?',
          params: [cutoff]
        };

      case 'research_data':
        return {
          query: 'DELETE FROM research_exports WHERE exported_at < ?',
          params: [cutoff]
        };

      case 'analytics_events':
        return {
          query: 'DELETE FROM analytics_events WHERE created_at < ?',
          params: [cutoff]
        };

      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  private async generateCategoryReport(policy: RetentionPolicy): Promise<DataRetentionReport> {
    const adapter = db.getAdapter();
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get total records
    const totalQuery = this.getCountQueryForCategory(policy.category, new Date(0));
    const totalResult = await adapter.query(totalQuery.query, totalQuery.params);
    const totalRecords = totalResult[0].count;

    // Get eligible for deletion
    const eligibleQuery = this.getCountQueryForCategory(policy.category, cutoffDate);
    const eligibleResult = await adapter.query(eligibleQuery.query, eligibleQuery.params);
    const eligibleRecords = eligibleResult[0].count;

    // Get deleted last month (from audit logs)
    const deletedLastMonth = await this.getDeletedCountLastMonth(policy.category);

    // Calculate average retention
    const avgRetention = await this.calculateAverageRetention(policy.category);

    // Determine compliance status
    const complianceStatus = this.determineComplianceStatus(eligibleRecords, policy);

    return {
      category: policy.category,
      totalRecords,
      recordsEligibleForDeletion: eligibleRecords,
      recordsDeletedLastMonth: deletedLastMonth,
      averageRetentionDays: avgRetention,
      complianceStatus,
      nextScheduledDeletion: this.getNextScheduledDeletion(policy)
    };
  }

  private async validatePolicyUpdates(updates: Partial<RetentionPolicy>): Promise<void> {
    if (updates.retentionPeriod && updates.retentionPeriod < 30) {
      throw new Error('Retention period must be at least 30 days');
    }

    if (updates.retentionPeriod && updates.retentionPeriod > 3650) { // 10 years
      throw new Error('Retention period cannot exceed 10 years');
    }
  }

  private async deleteUserDataFromCategory(userId: string, category: DataCategory, immediate: boolean): Promise<number> {
    const adapter = db.getAdapter();
    let deletedCount = 0;

    switch (category) {
      case 'chat_messages':
        const messageResult = await adapter.query(
          'DELETE FROM messages WHERE sender_id = ?',
          [userId]
        );
        deletedCount = messageResult.affectedRows || 0;
        break;

      case 'mood_logs':
        const moodResult = await adapter.query(
          'DELETE FROM emotion_logs WHERE user_id = ?',
          [userId]
        );
        deletedCount = moodResult.affectedRows || 0;
        break;

      case 'session_data':
        const sessionResult = await adapter.query(
          'DELETE FROM session_metrics WHERE user_id = ?',
          [userId]
        );
        deletedCount = sessionResult.affectedRows || 0;
        break;

      case 'panic_events':
        const panicResult = await adapter.query(
          'DELETE FROM panic_events WHERE user_id = ?',
          [userId]
        );
        deletedCount = panicResult.affectedRows || 0;
        break;

      case 'recovery_metrics':
        const recoveryResult = await adapter.query(
          'DELETE FROM clinical_recovery_metrics WHERE user_id = ?',
          [userId]
        );
        deletedCount = recoveryResult.affectedRows || 0;
        break;

      case 'healing_guidance':
        const guidanceResult = await adapter.query(
          'DELETE FROM healing_guidance_interactions WHERE user_id = ?',
          [userId]
        );
        deletedCount = guidanceResult.affectedRows || 0;
        break;

      // Add other categories as needed
    }

    return deletedCount;
  }

  private async anonymizeTextContent(content: string): Promise<string> {
    // Simple anonymization - replace personal information
    // In production, this would use more sophisticated NLP
    return content
      .replace(/\b\d{10,}\b/g, '[PHONE_NUMBER]') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
      .replace(/\b\d{5}(-\d{4})?\b/g, '[ZIPCODE]'); // ZIP codes
  }

  private getAllCategories(): DataCategory[] {
    return [
      'chat_messages', 'mood_logs', 'session_data', 'panic_events',
      'recovery_metrics', 'healing_guidance', 'research_data', 'analytics_events'
    ];
  }

  private generateAuditReference(): string {
    return `DM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnonymizationSalt(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  // Placeholder methods for audit logging
  private async logMinimizationExecution(batches: DeletionBatch[], summary: any, dryRun: boolean): Promise<void> {
    // Implementation would log to audit table
  }

  private async logPolicyChange(category: DataCategory, updates: any): Promise<void> {
    // Implementation would log policy changes
  }

  private async logDeletionRequest(userId: string, reason: string, auditReference: string): Promise<void> {
    // Implementation would log deletion requests
  }

  private async logDeletionCompletion(userId: string, categories: DataCategory[], recordsDeleted: number, completionTime: string, auditReference: string): Promise<void> {
    // Implementation would log completion
  }

  private async logAnonymization(category: DataCategory, recordsAnonymized: number, auditReference: string): Promise<void> {
    // Implementation would log anonymization
  }

  private async getDeletedCountLastMonth(category: DataCategory): Promise<number> {
    // Implementation would query audit logs
    return 0;
  }

  private async calculateAverageRetention(category: DataCategory): Promise<number> {
    // Implementation would calculate average retention
    return 365; // Placeholder
  }

  private determineComplianceStatus(eligibleRecords: number, policy: RetentionPolicy): 'compliant' | 'warning' | 'violation' {
    if (eligibleRecords === 0) return 'compliant';
    if (eligibleRecords < 100) return 'warning';
    return 'violation';
  }

  private getNextScheduledDeletion(policy: RetentionPolicy): string {
    // Schedule deletions based on priority
    const now = new Date();
    switch (policy.priority) {
      case 'critical': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Daily
      case 'high': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Weekly
      case 'medium': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Monthly
      default: return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // Quarterly
    }
  }
}

export const dataMinimizationSystem = DataMinimizationSystem.getInstance();