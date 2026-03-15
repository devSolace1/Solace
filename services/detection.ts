import type { ChatMessage } from '../types';

export class DetectionService {
  private static readonly DATING_PATTERNS = [
    /\b(age|old)\b/i,
    /\bgender\b/i,
    /\bmeet\b/i,
    /\bdate\b/i,
    /\blove\b/i,
    /\bcrush\b/i,
    /\battractive\b/i,
    /\bhot\b/i,
    /\bsexy\b/i,
    /\bsocial media\b/i,
    /\binstagram\b/i,
    /\btwitter\b/i,
    /\bfacebook\b/i,
    /\bphone\b/i,
    /\bnumber\b/i,
    /\bemail\b/i,
  ];

  static detectSuspiciousContent(message: string): boolean {
    return this.DATING_PATTERNS.some(pattern => pattern.test(message));
  }

  static analyzeConversation(messages: ChatMessage[]): {
    flaggedMessages: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const flaggedMessages: string[] = [];
    let suspiciousCount = 0;

    for (const msg of messages) {
      if (this.detectSuspiciousContent(msg.content)) {
        flaggedMessages.push(msg.id);
        suspiciousCount++;
      }
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (suspiciousCount > 5) riskLevel = 'high';
    else if (suspiciousCount > 2) riskLevel = 'medium';

    return { flaggedMessages, riskLevel };
  }

  static shouldWarn(riskLevel: 'low' | 'medium' | 'high'): boolean {
    return riskLevel === 'high';
  }
}