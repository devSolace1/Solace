export interface AICompanionResponse {
  type: 'calming' | 'breathing' | 'journaling' | 'support';
  message: string;
  actions?: string[];
}

export class AICompanionService {
  private static readonly CALMING_RESPONSES = [
    "I hear that you're going through a difficult time. Remember that your feelings are valid, and it's okay to feel this way.",
    "Take a moment to breathe. You're not alone in this experience.",
    "Your emotions are important. Let's work through this together, one step at a time.",
    "It's brave of you to reach out. Healing takes time, but you're taking the first step."
  ];

  private static readonly BREATHING_EXERCISES = [
    "Try this breathing exercise: Inhale for 4 counts, hold for 4, exhale for 4. Repeat 5 times.",
    "Place one hand on your chest, one on your belly. Breathe deeply into your belly for 6 counts, then exhale slowly.",
    "Box breathing: Inhale 4, hold 4, exhale 4, hold 4. This can help calm your nervous system."
  ];

  private static readonly JOURNALING_PROMPTS = [
    "What are three things you're grateful for right now, even if they're small?",
    "If you could tell your future self one thing, what would it be?",
    "What emotions are you feeling right now? Can you describe them without judgment?",
    "What would you say to a friend who was feeling the way you do?"
  ];

  private static readonly SUPPORT_MESSAGES = [
    "You're showing great strength by being here. Recovery is a journey, not a destination.",
    "Every emotion you feel is part of healing. Allow yourself to feel without rushing.",
    "Your story matters. Your pain matters. You matter.",
    "Small steps forward are still progress. Be gentle with yourself."
  ];

  static generateResponse(userMessage: string, emotionalState?: any): AICompanionResponse {
    const lowerMessage = userMessage.toLowerCase();

    // Check for specific triggers
    if (lowerMessage.includes('breathe') || lowerMessage.includes('breathing') || lowerMessage.includes('panic')) {
      return {
        type: 'breathing',
        message: this.getRandomResponse(this.BREATHING_EXERCISES),
        actions: ['Try the breathing exercise above', 'Focus on your breath for the next minute']
      };
    }

    if (lowerMessage.includes('write') || lowerMessage.includes('journal')) {
      return {
        type: 'journaling',
        message: this.getRandomResponse(this.JOURNALING_PROMPTS),
        actions: ['Take 5 minutes to write about this prompt', 'Use your journal section to record your thoughts']
      };
    }

    // Default to calming/support based on emotional state
    if (emotionalState?.riskLevel === 'crisis' || emotionalState?.riskLevel === 'high') {
      return {
        type: 'calming',
        message: this.getRandomResponse(this.CALMING_RESPONSES),
        actions: ['Take deep breaths', 'Consider reaching out to emergency services if needed']
      };
    }

    return {
      type: 'support',
      message: this.getRandomResponse(this.SUPPORT_MESSAGES),
      actions: ['Continue sharing how you feel', 'Consider adding to your journal']
    };
  }

  private static getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static async sendCompanionMessage(sessionId: string, response: AICompanionResponse): Promise<void> {
    await fetch('/api/chat/companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: response.message,
        type: response.type,
        actions: response.actions
      })
    });
  }
}