import { CrisisResource, CrisisResourceCategory, CrisisResourceAccessLevel } from '../../types';
import { getSupabaseServer } from '../supabaseServer';

export class CrisisResourcesService {
  // Pre-defined crisis resources (can be expanded)
  private static readonly DEFAULT_RESOURCES: Array<Omit<CrisisResource, 'id' | 'viewCount' | 'helpfulCount' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'Coping with Heartbreak',
      category: 'coping_strategies',
      contentType: 'article',
      content: `
# Coping with Heartbreak

Heartbreak is a deeply painful experience that affects us emotionally, physically, and mentally. Here are some evidence-based strategies to help you navigate this difficult time:

## Immediate Steps
1. **Allow yourself to grieve** - It's normal to feel intense sadness, anger, or confusion
2. **Practice self-compassion** - Be kind to yourself during this vulnerable time
3. **Limit contact** - Give yourself space from your ex-partner to process your emotions

## Daily Practices
- **Exercise regularly** - Physical activity releases endorphins and reduces stress
- **Maintain routines** - Keep up with work, meals, and sleep schedules
- **Connect with friends** - Share your feelings with trusted people
- **Journal your thoughts** - Writing can help process emotions

## Long-term Healing
- **Seek professional help** if needed - Therapists can provide valuable support
- **Focus on personal growth** - Use this time to rediscover yourself
- **Be patient** - Healing takes time, and that's okay

Remember: Your feelings are valid, and healing is a journey, not a destination.
      `,
      summary: 'Evidence-based strategies for coping with the emotional pain of heartbreak.',
      tags: ['heartbreak', 'grief', 'emotional pain', 'coping'],
      isActive: true,
      accessLevel: 'public'
    },
    {
      title: '4-7-8 Breathing Exercise',
      category: 'breathing_exercises',
      contentType: 'exercise',
      content: `
# 4-7-8 Breathing Exercise

This simple breathing technique, developed by Dr. Andrew Weil, can help reduce anxiety and promote relaxation.

## How to Practice:
1. **Inhale quietly** through your nose for 4 seconds
2. **Hold your breath** for 7 seconds
3. **Exhale completely** through your mouth for 8 seconds, making a "whoosh" sound
4. **Repeat** the cycle 4 times

## Benefits:
- Reduces anxiety and stress
- Helps with insomnia
- Promotes relaxation
- Can be done anywhere, anytime

## Tips:
- Place the tip of your tongue against the ridge behind your front teeth
- Keep your breath quiet and controlled
- Practice daily for best results

This exercise takes only a few minutes but can significantly reduce stress levels.
      `,
      summary: 'A simple breathing technique to reduce anxiety and promote relaxation.',
      tags: ['breathing', 'anxiety', 'relaxation', 'stress'],
      isActive: true,
      accessLevel: 'public'
    },
    {
      title: 'Grounding Techniques for Emotional Distress',
      category: 'stress_reduction',
      contentType: 'guide',
      content: `
# Grounding Techniques for Emotional Distress

When emotions feel overwhelming, grounding techniques can help bring you back to the present moment.

## 5-4-3-2-1 Technique
**Name 5 things you can see**
**Name 4 things you can touch**
**Name 3 things you can hear**
**Name 2 things you can smell**
**Name 1 thing you can taste**

## Physical Grounding
- Hold ice cubes in your hands
- Take a cold shower
- Stomp your feet on the ground
- Drink a glass of water slowly

## Mental Grounding
- Recite a favorite poem or song lyrics
- Count backwards from 100 by 7s
- Describe your surroundings in detail
- Use positive affirmations

## When to Use
These techniques are most helpful when you feel:
- Disconnected from reality
- Overwhelmed by emotions
- Having a panic attack
- Experiencing flashbacks

Practice these techniques regularly so they become automatic during difficult moments.
      `,
      summary: 'Practical techniques to help you stay present and grounded during emotional distress.',
      tags: ['grounding', 'mindfulness', 'panic', 'stress'],
      isActive: true,
      accessLevel: 'public'
    },
    {
      title: 'Emergency Contacts and Hotlines',
      category: 'emergency_contacts',
      contentType: 'article',
      content: `
# Emergency Contacts and Crisis Hotlines

If you're experiencing a mental health crisis, help is available 24/7.

## National Crisis Hotlines

### United States
- **National Suicide Prevention Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **National Domestic Violence Hotline**: 1-800-799-7233

### United Kingdom
- **Samaritans**: 116 123
- **Shout**: Text SHOUT to 85258

### Canada
- **Canada Suicide Prevention Service**: 988
- **Crisis Services Canada**: 988

### Australia
- **Lifeline**: 13 11 14
- **Beyond Blue**: 1300 22 4636

## International Resources
- **Befrienders Worldwide**: Find local helplines at befrienders.org
- **International Association for Suicide Prevention**: iasp.info

## When to Seek Emergency Help
Call emergency services (911/999/000) if you or someone else is:
- In immediate danger
- Having thoughts of self-harm
- Experiencing a mental health emergency

## Remember
These services are confidential and staffed by trained professionals. Reaching out for help is a sign of strength, not weakness.
      `,
      summary: 'Important emergency contacts and crisis hotlines for immediate support.',
      tags: ['emergency', 'hotlines', 'crisis', 'support'],
      isActive: true,
      accessLevel: 'public'
    }
  ];

  static async getResources(
    category?: CrisisResourceCategory,
    accessLevel: CrisisResourceAccessLevel = 'public',
    userAuthenticated = false
  ): Promise<CrisisResource[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      let query = supabase
        .from('crisis_resources')
        .select('*')
        .eq('is_active', true);

      // Access level filtering
      if (accessLevel === 'public') {
        query = query.eq('access_level', 'public');
      } else if (accessLevel === 'authenticated' && userAuthenticated) {
        query = query.in('access_level', ['public', 'authenticated']);
      } else if (accessLevel === 'crisis_only' && userAuthenticated) {
        query = query.in('access_level', ['public', 'authenticated', 'crisis_only']);
      } else {
        // No access
        return [];
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching crisis resources:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching crisis resources:', error);
      return [];
    }
  }

  static async getResourceById(id: string): Promise<CrisisResource | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('crisis_resources')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching crisis resource:', error);
        return null;
      }

      // Increment view count
      await supabase
        .from('crisis_resources')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);

      return data;
    } catch (error) {
      console.error('Error fetching crisis resource:', error);
      return null;
    }
  }

  static async markHelpful(resourceId: string): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('crisis_resources')
        .update({ helpful_count: supabase.raw('helpful_count + 1') })
        .eq('id', resourceId);

      if (error) {
        console.error('Error marking resource as helpful:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking resource as helpful:', error);
      return false;
    }
  }

  static async searchResources(query: string, category?: CrisisResourceCategory): Promise<CrisisResource[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      let searchQuery = supabase
        .from('crisis_resources')
        .select('*')
        .eq('is_active', true)
        .eq('access_level', 'public'); // Only search public resources

      if (category) {
        searchQuery = searchQuery.eq('category', category);
      }

      // Simple text search (in production, use full-text search)
      if (query) {
        searchQuery = searchQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`);
      }

      const { data, error } = await searchQuery
        .order('helpful_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error searching resources:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error searching resources:', error);
      return [];
    }
  }

  static async initializeDefaultResources(): Promise<void> {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      // Check if resources already exist
      const { count, error: countError } = await supabase
        .from('crisis_resources')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error checking existing resources:', countError);
        return;
      }

      if (count && count > 0) {
        return; // Resources already exist
      }

      // Insert default resources
      const resourcesToInsert = this.DEFAULT_RESOURCES.map(resource => ({
        ...resource,
        view_count: 0,
        helpful_count: 0
      }));

      const { error } = await supabase
        .from('crisis_resources')
        .insert(resourcesToInsert);

      if (error) {
        console.error('Error initializing default resources:', error);
      } else {
        console.log('Default crisis resources initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing default resources:', error);
    }
  }

  static async getResourceStats(): Promise<{
    totalResources: number;
    totalViews: number;
    totalHelpful: number;
    categoryBreakdown: Record<string, number>;
  } | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('crisis_resources')
        .select('category, view_count, helpful_count');

      if (error) {
        console.error('Error fetching resource stats:', error);
        return null;
      }

      const stats = {
        totalResources: data.length,
        totalViews: data.reduce((sum, r) => sum + (r.view_count || 0), 0),
        totalHelpful: data.reduce((sum, r) => sum + (r.helpful_count || 0), 0),
        categoryBreakdown: {} as Record<string, number>
      };

      // Category breakdown
      for (const resource of data) {
        stats.categoryBreakdown[resource.category] =
          (stats.categoryBreakdown[resource.category] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('Error calculating resource stats:', error);
      return null;
    }
  }

  static getCategories(): Array<{ value: CrisisResourceCategory; label: string; description: string }> {
    return [
      {
        value: 'coping_strategies',
        label: 'Coping Strategies',
        description: 'Techniques for managing difficult emotions'
      },
      {
        value: 'breathing_exercises',
        label: 'Breathing Exercises',
        description: 'Breathing techniques for stress and anxiety'
      },
      {
        value: 'stress_reduction',
        label: 'Stress Reduction',
        description: 'Methods to reduce stress and promote relaxation'
      },
      {
        value: 'self_care',
        label: 'Self Care',
        description: 'Practices for maintaining emotional well-being'
      },
      {
        value: 'emergency_contacts',
        label: 'Emergency Contacts',
        description: 'Important contacts for crisis situations'
      },
      {
        value: 'professional_help',
        label: 'Professional Help',
        description: 'Information about seeking professional support'
      },
      {
        value: 'peer_support',
        label: 'Peer Support',
        description: 'Community and peer support resources'
      }
    ];
  }
}