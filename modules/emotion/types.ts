// Emotion Module Types
export interface EmotionEntry {
  id: string;
  user_id: string;
  emotion_type: string;
  intensity: number; // 1-10 scale
  context?: string;
  triggers?: string[];
  coping_strategies?: string[];
  created_at: string;
  updated_at?: string;
}

export interface MoodCheckIn {
  id: string;
  user_id: string;
  overall_mood: number; // 1-10 scale
  emotions: EmotionEntry[];
  energy_level: number; // 1-10 scale
  sleep_quality: number; // 1-10 scale
  stress_level: number; // 1-10 scale
  notes?: string;
  created_at: string;
}

export interface EmotionalTrend {
  date: string;
  average_mood: number;
  dominant_emotion: string;
  entry_count: number;
  stress_average: number;
  energy_average: number;
}

export interface RecoveryInsight {
  period: 'week' | 'month';
  mood_improvement: number;
  consistency_score: number; // How consistent are check-ins
  top_emotions: string[];
  recommended_actions: string[];
  risk_indicators: string[];
}

export interface CopingStrategy {
  id: string;
  name: string;
  description: string;
  category: 'breathing' | 'grounding' | 'distraction' | 'social' | 'physical' | 'creative';
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number; // minutes
  tags: string[];
  is_recommended: boolean;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood_before: number;
  mood_after?: number;
  emotions: string[];
  tags: string[];
  is_private: boolean;
  created_at: string;
  updated_at?: string;
}