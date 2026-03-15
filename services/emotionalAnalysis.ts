export interface EmotionalAnalysis {
  sadness: number;
  distress: number;
  riskLevel: 'low' | 'medium' | 'high' | 'crisis';
}

export class EmotionalAnalysisService {
  private static readonly SADNESS_KEYWORDS = [
    'sad', 'depressed', 'heartbroken', 'lonely', 'empty', 'lost', 'broken', 'cry', 'tears',
    'grief', 'mourning', 'despair', 'hopeless', 'worthless', 'alone', 'abandoned'
  ];

  private static readonly DISTRESS_KEYWORDS = [
    'anxious', 'stressed', 'overwhelmed', 'panic', 'scared', 'afraid', 'worried', 'tense',
    'nervous', 'uncomfortable', 'troubled', 'disturbed', 'upset', 'agitated'
  ];

  private static readonly CRISIS_PATTERNS = [
    /\b(kill myself|suicide|end it all)\b/i,
    /\b(self harm|cut myself|hurt myself)\b/i,
    /\b(can't go on|give up|no point)\b/i,
    /\b(panic attack|can't breathe|chest hurts)\b/i
  ];

  static analyzeMessage(content: string): EmotionalAnalysis {
    const lowerContent = content.toLowerCase();

    // Count keyword matches
    const sadnessMatches = this.SADNESS_KEYWORDS.filter(keyword =>
      lowerContent.includes(keyword)
    ).length;

    const distressMatches = this.DISTRESS_KEYWORDS.filter(keyword =>
      lowerContent.includes(keyword)
    ).length;

    // Calculate scores (normalized)
    const totalWords = content.split(/\s+/).length;
    const sadnessScore = Math.min(sadnessMatches / Math.max(totalWords * 0.1, 1), 1);
    const distressScore = Math.min(distressMatches / Math.max(totalWords * 0.1, 1), 1);

    // Check for crisis patterns
    const hasCrisis = this.CRISIS_PATTERNS.some(pattern => pattern.test(content));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'crisis' = 'low';
    if (hasCrisis) {
      riskLevel = 'crisis';
    } else if (sadnessScore > 0.5 || distressScore > 0.5) {
      riskLevel = 'high';
    } else if (sadnessScore > 0.2 || distressScore > 0.2) {
      riskLevel = 'medium';
    }

    return {
      sadness: sadnessScore,
      distress: distressScore,
      riskLevel
    };
  }

  static async storeEmotionalSignal(
    sessionId: string,
    messageId: string,
    analysis: EmotionalAnalysis
  ): Promise<void> {
    await fetch('/api/emotional/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messageId,
        sadnessScore: analysis.sadness,
        distressScore: analysis.distress,
        riskLevel: analysis.riskLevel
      })
    });
  }
}