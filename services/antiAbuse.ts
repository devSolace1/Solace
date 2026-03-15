export interface AbuseFlag {
  type: 'romantic' | 'sexual' | 'predatory' | 'spam';
  severity: 'low' | 'medium' | 'high';
}

export class AntiAbuseService {
  private static readonly ROMANTIC_PATTERNS = [
    /\b(love you|falling for you|my love)\b/i,
    /\b(date|dating|relationship|boyfriend|girlfriend)\b/i,
    /\b(kiss|hug|cuddle|hold you)\b/i,
    /\b(meet up|see you|hang out)\b/i
  ];

  private static readonly SEXUAL_PATTERNS = [
    /\b(sex|sexual|naked|nude|bed)\b/i,
    /\b(aroused|turned on|horny)\b/i,
    /\b(touch|caress|intimate)\b/i
  ];

  private static readonly PREDATORY_PATTERNS = [
    /\b(age|old|young|teen|kid)\b/i,
    /\b(phone number|address|location)\b/i,
    /\b(secret|don't tell|private)\b/i,
    /\b(social media|instagram|facebook|snapchat)\b/i
  ];

  private static readonly SPAM_PATTERNS = [
    /\b(buy|sell|purchase|money|cash)\b/i,
    /\b(website|link|url|click here)\b/i,
    /\b(free|guarantee|promise|instant)\b/i
  ];

  static detectAbuse(content: string): AbuseFlag | null {
    // Check romantic
    if (this.ROMANTIC_PATTERNS.some(pattern => pattern.test(content))) {
      return { type: 'romantic', severity: 'medium' };
    }

    // Check sexual
    if (this.SEXUAL_PATTERNS.some(pattern => pattern.test(content))) {
      return { type: 'sexual', severity: 'high' };
    }

    // Check predatory
    if (this.PREDATORY_PATTERNS.some(pattern => pattern.test(content))) {
      return { type: 'predatory', severity: 'high' };
    }

    // Check spam
    if (this.SPAM_PATTERNS.some(pattern => pattern.test(content))) {
      return { type: 'spam', severity: 'low' };
    }

    return null;
  }

  static async flagMessage(
    messageId: string,
    sessionId: string,
    flag: AbuseFlag
  ): Promise<void> {
    await fetch('/api/moderation/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        sessionId,
        flagType: flag.type,
        severity: flag.severity
      })
    });
  }

  static getWarningMessage(flag: AbuseFlag): string {
    switch (flag.type) {
      case 'romantic':
        return "Please remember this is a support space. Romantic advances are not appropriate here.";
      case 'sexual':
        return "Sexual content is not allowed in this support environment.";
      case 'predatory':
        return "Sharing personal information or asking for others' details violates our safety guidelines.";
      case 'spam':
        return "Please keep conversations focused on emotional support.";
      default:
        return "Your message may violate our community guidelines.";
    }
  }
}