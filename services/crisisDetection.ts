export interface CrisisAlert {
  type: 'self_harm' | 'suicidal' | 'despair' | 'panic';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class CrisisDetectionService {
  private static readonly CRISIS_PATTERNS = [
    {
      pattern: /\b(suicide|kill myself|end it all|want to die)\b/i,
      type: 'suicidal' as const,
      severity: 'critical' as const
    },
    {
      pattern: /\b(self harm|cut myself|hurt myself|burn myself)\b/i,
      type: 'self_harm' as const,
      severity: 'high' as const
    },
    {
      pattern: /\b(can't go on|no point|give up|hopeless)\b/i,
      type: 'despair' as const,
      severity: 'high' as const
    },
    {
      pattern: /\b(panic attack|can't breathe|chest pain|heart racing)\b/i,
      type: 'panic' as const,
      severity: 'medium' as const
    }
  ];

  static detectCrisis(content: string): CrisisAlert | null {
    for (const { pattern, type, severity } of this.CRISIS_PATTERNS) {
      if (pattern.test(content)) {
        return { type, severity };
      }
    }
    return null;
  }

  static async createCrisisAlert(
    sessionId: string,
    userId: string,
    alert: CrisisAlert
  ): Promise<void> {
    await fetch('/api/crisis/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        alertType: alert.type,
        severity: alert.severity
      })
    });
  }
}