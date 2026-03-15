// V8 AI-Assisted Emotional Support
// Lightweight AI assistant for immediate coping support

import { EmotionalReasoningEngine, EmotionalState } from './emotional-reasoning-engine';

export interface CopingSuggestion {
  id: string;
  category: 'breathing' | 'grounding' | 'perspective' | 'self_care' | 'resources';
  title: string;
  description: string;
  steps: string[];
  estimatedDuration: number; // minutes
  suitability: EmotionalState[];
}

export interface AIResponse {
  message: string;
  suggestions: CopingSuggestion[];
  urgency: 'low' | 'medium' | 'high';
  recommendCounselor: boolean;
  followUp: string[];
}

export class AIEmotionalAssistant {
  private static readonly COPING_STRATEGIES: CopingSuggestion[] = [
    {
      id: 'box_breathing',
      category: 'breathing',
      title: 'Box Breathing',
      description: 'A simple breathing technique to reduce anxiety and regain focus.',
      steps: [
        'Inhale slowly for 4 seconds',
        'Hold your breath for 4 seconds',
        'Exhale slowly for 4 seconds',
        'Hold your breath for 4 seconds',
        'Repeat 4-5 times'
      ],
      estimatedDuration: 2,
      suitability: ['distressed', 'high_risk']
    },
    {
      id: '5_4_3_2_1_grounding',
      category: 'grounding',
      title: '5-4-3-2-1 Grounding Technique',
      description: 'Use your senses to bring yourself back to the present moment.',
      steps: [
        'Name 5 things you can see',
        'Name 4 things you can touch',
        'Name 3 things you can hear',
        'Name 2 things you can smell',
        'Name 1 thing you can taste'
      ],
      estimatedDuration: 3,
      suitability: ['distressed', 'high_risk']
    },
    {
      id: 'perspective_shift',
      category: 'perspective',
      title: 'Perspective Shift',
      description: 'Consider alternative viewpoints on your current situation.',
      steps: [
        'Acknowledge your current feelings without judgment',
        'Consider how you might view this situation in 6 months',
        'Think of one small positive aspect',
        'Remind yourself that feelings are temporary',
        'Focus on what you can control right now'
      ],
      estimatedDuration: 5,
      suitability: ['recovering', 'distressed']
    },
    {
      id: 'self_care_check',
      category: 'self_care',
      title: 'Self-Care Check',
      description: 'Assess and address your basic needs.',
      steps: [
        'Have you eaten recently?',
        'Have you had enough water today?',
        'Have you slept adequately?',
        'Have you moved your body today?',
        'Is your environment comfortable?'
      ],
      estimatedDuration: 10,
      suitability: ['stable', 'recovering', 'distressed']
    },
    {
      id: 'progress_gratitude',
      category: 'perspective',
      title: 'Progress Gratitude',
      description: 'Recognize small steps of progress and healing.',
      steps: [
        'List 3 things you\'ve done well recently',
        'Acknowledge one emotion you\'ve processed',
        'Note one boundary you\'ve set',
        'Recognize one supportive person in your life',
        'Celebrate getting through today'
      ],
      estimatedDuration: 5,
      suitability: ['recovering', 'stable']
    }
  ];

  private static readonly CRISIS_RESOURCES = [
    'National Suicide Prevention Lifeline: 988 (US)',
    'Crisis Text Line: Text HOME to 741741',
    'International Association for Suicide Prevention: Find local resources at iasp.info',
    'Emergency Services: Call 911 (US) or your local emergency number'
  ];

  static async getSupportResponse(userId: string, userMessage: string): Promise<AIResponse> {
    const emotionalState = await this.analyzeUserState(userId, userMessage);
    const urgency = this.assessUrgency(emotionalState, userMessage);
    const suggestions = this.selectSuggestions(emotionalState, urgency);
    const message = this.generateSupportMessage(emotionalState, urgency);
    const recommendCounselor = this.shouldRecommendCounselor(urgency, emotionalState);
    const followUp = this.generateFollowUpQuestions(emotionalState);

    return {
      message,
      suggestions,
      urgency,
      recommendCounselor,
      followUp
    };
  }

  private static async analyzeUserState(userId: string, message: string): Promise<EmotionalState> {
    // Get current emotional state from reasoning engine
    const profile = await EmotionalReasoningEngine.getUserProfile(userId);
    let state = profile?.currentState || 'stable';

    // Adjust based on current message content
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'not worth living'];
    const distressKeywords = ['overwhelmed', 'breaking', 'can\'t cope', 'lost', 'alone'];
    const recoveryKeywords = ['better', 'progress', 'healing', 'hopeful', 'managing'];

    const messageLower = message.toLowerCase();

    if (crisisKeywords.some(keyword => messageLower.includes(keyword))) {
      state = 'high_risk';
    } else if (distressKeywords.some(keyword => messageLower.includes(keyword))) {
      state = state === 'stable' ? 'distressed' : state;
    } else if (recoveryKeywords.some(keyword => messageLower.includes(keyword))) {
      state = state === 'high_risk' ? 'distressed' : 'recovering';
    }

    return state;
  }

  private static assessUrgency(state: EmotionalState, message: string): 'low' | 'medium' | 'high' {
    const crisisIndicators = [
      'suicide', 'kill', 'die', 'end it', 'not worth living',
      'harm myself', 'hurt myself', 'can\'t go on'
    ];

    const highDistressIndicators = [
      'emergency', 'crisis', 'breakdown', 'losing control',
      'can\'t breathe', 'panic attack', 'overwhelmed'
    ];

    const messageLower = message.toLowerCase();

    if (crisisIndicators.some(indicator => messageLower.includes(indicator))) {
      return 'high';
    }

    if (state === 'high_risk' || highDistressIndicators.some(indicator => messageLower.includes(indicator))) {
      return 'high';
    }

    if (state === 'distressed') {
      return 'medium';
    }

    return 'low';
  }

  private static selectSuggestions(state: EmotionalState, urgency: 'low' | 'medium' | 'high'): CopingSuggestion[] {
    let suitableStrategies = this.COPING_STRATEGIES.filter(strategy =>
      strategy.suitability.includes(state)
    );

    // Prioritize based on urgency
    if (urgency === 'high') {
      suitableStrategies = suitableStrategies.filter(s =>
        s.category === 'breathing' || s.category === 'grounding'
      );
    }

    // Return 2-3 most relevant suggestions
    return suitableStrategies.slice(0, 3);
  }

  private static generateSupportMessage(state: EmotionalState, urgency: 'low' | 'medium' | 'high'): string {
    const messages = {
      high: {
        stable: "I hear that you're going through a difficult time. While I'm here to help, this sounds urgent. Please consider reaching out to a crisis hotline or emergency services immediately.",
        recovering: "I understand you're experiencing significant distress. Let's focus on immediate coping strategies while connecting you with professional support.",
        distressed: "I'm here with you during this crisis. Please use the breathing techniques below and know that help is available 24/7.",
        high_risk: "This sounds like an emergency situation. Please call emergency services (911 in the US) or a crisis hotline immediately. I'm here to support you, but you need immediate professional help."
      },
      medium: {
        stable: "I can sense you're feeling overwhelmed. Let's work through some coping strategies together.",
        recovering: "It's normal to have setbacks during recovery. Here are some techniques that might help you regain your balance.",
        distressed: "I hear how much pain you're in right now. These techniques can help you manage the intensity of your emotions.",
        high_risk: "Your safety is the most important thing. Please use these immediate coping strategies while we get you connected to professional help."
      },
      low: {
        stable: "I'm glad you're reaching out. Even when things are going well, it's good to have coping strategies ready.",
        recovering: "Recovery is a journey with ups and downs. Here are some tools that might support you today.",
        distressed: "It's brave of you to reach out when you're struggling. Let's explore some ways to help you feel more grounded.",
        high_risk: "I want to acknowledge how difficult this must be for you. While these strategies can help, please consider professional support as well."
      }
    };

    return messages[urgency][state];
  }

  private static shouldRecommendCounselor(urgency: 'low' | 'medium' | 'high', state: EmotionalState): boolean {
    return urgency === 'high' || state === 'high_risk' || state === 'distressed';
  }

  private static generateFollowUpQuestions(state: EmotionalState): string[] {
    const questions = {
      stable: [
        "What's one thing that usually helps you feel better?",
        "Is there someone you can reach out to right now?",
        "What are you noticing about your breathing?"
      ],
      recovering: [
        "How have you been coping with challenges lately?",
        "What's one small step you could take right now?",
        "What support have you found helpful in the past?"
      ],
      distressed: [
        "Are you in a safe place right now?",
        "What's the most overwhelming part of this moment?",
        "Is there something specific triggering these feelings?"
      ],
      high_risk: [
        "Are you able to keep yourself safe right now?",
        "Have you reached out to emergency services?",
        "Can you tell me more about what's leading you to feel this way?"
      ]
    };

    return questions[state];
  }

  static getCrisisResources(): string[] {
    return [...this.CRISIS_RESOURCES];
  }

  static async logAIInteraction(userId: string, interaction: {
    userMessage: string;
    aiResponse: AIResponse;
    timestamp: string;
  }): Promise<void> {
    // Log for analytics and improvement
    // In a real implementation, this would store in database
    console.log(`AI Interaction logged for user ${userId}:`, {
      userMessageLength: interaction.userMessage.length,
      suggestionsProvided: interaction.aiResponse.suggestions.length,
      urgency: interaction.aiResponse.urgency,
      recommendedCounselor: interaction.aiResponse.recommendCounselor
    });
  }

  static validateResponse(response: AIResponse): boolean {
    // Ensure response meets safety standards
    const hasValidMessage = response.message.length > 10;
    const hasAppropriateSuggestions = response.suggestions.length > 0;
    const hasCrisisResources = response.urgency === 'high';

    return hasValidMessage && hasAppropriateSuggestions && (!hasCrisisResources || response.message.includes('emergency'));
  }
}