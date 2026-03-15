import { CrisisDetectionResult, CrisisAlertType, CrisisAlertSeverity } from '../types';

export class CrisisDetectionService {
  private static readonly CRISIS_KEYWORDS = {
    self_harm: [
      'kill myself', 'end it all', 'not worth living', 'better off dead',
      'want to die', 'suicide', 'self harm', 'cut myself', 'hurt myself'
    ],
    suicidal_ideation: [
      'suicidal', 'suicide attempt', 'plan to kill', 'end my life',
      'no reason to live', 'thinking of suicide', 'suicidal thoughts'
    ],
    extreme_distress: [
      'can\'t go on', 'breaking point', 'falling apart', 'losing control',
      'overwhelmed', 'hopeless', 'desperate', 'at my limit', 'breaking down'
    ],
    panic_attack: [
      'panic attack', 'heart racing', 'can\'t breathe', 'chest tight',
      'dizzy', 'passing out', 'freaking out', 'losing it'
    ],
    emotional_crisis: [
      'emotional crisis', 'mental breakdown', 'losing my mind',
      'can\'t cope', 'overwhelmed emotionally', 'emotional pain'
    ]
  };

  private static readonly SEVERITY_WEIGHTS = {
    self_harm: 10,
    suicidal_ideation: 9,
    extreme_distress: 6,
    panic_attack: 7,
    emotional_crisis: 5
  };

  static detectCrisis(message: string): CrisisDetectionResult {
    const indicators: Record<string, any> = {};
    let maxSeverity: CrisisAlertSeverity = 'low';
    let detectedType: CrisisAlertType | undefined;

    // Check each crisis type
    for (const [type, keywords] of Object.entries(this.CRISIS_KEYWORDS)) {
      const matches = keywords.filter(keyword =>
        message.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        const crisisType = type as CrisisAlertType;
        indicators[crisisType] = {
          matches,
          count: matches.length,
          weight: this.SEVERITY_WEIGHTS[crisisType]
        };

        // Determine severity based on matches and weights
        if (this.SEVERITY_WEIGHTS[crisisType] >= 9) {
          maxSeverity = 'critical';
          detectedType = crisisType;
        } else if (this.SEVERITY_WEIGHTS[crisisType] >= 7 && maxSeverity !== 'critical') {
          maxSeverity = 'high';
          if (!detectedType) detectedType = crisisType;
        } else if (this.SEVERITY_WEIGHTS[crisisType] >= 5 && maxSeverity === 'low') {
          maxSeverity = 'medium';
          if (!detectedType) detectedType = crisisType;
        }
      }
    }

    // Additional pattern detection
    if (message.includes('!!!') || message.match(/[!]{3,}/)) {
      indicators.urgency_signals = { exclamation_marks: true };
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    if (message.length > 500 && message.includes('please help')) {
      indicators.long_distress_message = true;
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    const detected = Object.keys(indicators).length > 0;

    return {
      detected,
      alertType: detectedType,
      severity: maxSeverity,
      indicators
    };
  }

  static shouldEscalate(result: CrisisDetectionResult): boolean {
    return result.detected && (
      result.severity === 'critical' ||
      result.severity === 'high' ||
      (result.severity === 'medium' && this.hasMultipleIndicators(result))
    );
  }

  private static hasMultipleIndicators(result: CrisisDetectionResult): boolean {
    return Object.keys(result.indicators).length > 1;
  }

  static getRecommendedActions(result: CrisisDetectionResult): string[] {
    const actions: string[] = [];

    if (!result.detected) return actions;

    switch (result.severity) {
      case 'critical':
        actions.push('Immediate counselor assignment');
        actions.push('Moderator notification');
        actions.push('Priority session matching');
        actions.push('Emergency contact consideration');
        break;
      case 'high':
        actions.push('Priority counselor assignment');
        actions.push('Moderator notification');
        actions.push('Enhanced monitoring');
        break;
      case 'medium':
        actions.push('Counselor assignment with crisis training');
        actions.push('Session monitoring');
        break;
      case 'low':
        actions.push('Standard counselor assignment');
        actions.push('General monitoring');
        break;
    }

    return actions;
  }
}