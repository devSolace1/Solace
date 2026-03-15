import { SupportRoom, SupportRoomMessage } from '../../types';
import { getSupabaseServer } from '../supabaseServer';
import { SecurityService } from './securityService';

export class SupportCirclesService {
  static async getActiveRooms(): Promise<SupportRoom[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('support_rooms_v4')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching support rooms:', error);
      return [];
    }

    return data;
  }

  static async getRoomMessages(roomId: string, limit = 50): Promise<SupportRoomMessage[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('support_room_messages_v4')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching room messages:', error);
      return [];
    }

    return data.reverse(); // Return in chronological order
  }

  static async sendMessage(
    roomId: string,
    senderId: string,
    content: string
  ): Promise<{ success: boolean; message?: SupportRoomMessage; error?: string }> {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { success: false, error: 'Database unavailable' };
    }

    try {
      // Validate input
      const validation = SecurityService.validateMessage(content);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Check spam
      const spamCheck = await SecurityService.checkSpam(content, senderId);
      if (spamCheck.isSpam) {
        return { success: false, error: 'Message flagged as spam' };
      }

      // Sanitize content
      const sanitizedContent = SecurityService.sanitizeInput(content);

      // Check if room exists and is active
      const { data: room, error: roomError } = await supabase
        .from('support_rooms_v4')
        .select('id, is_active, max_participants')
        .eq('id', roomId)
        .eq('is_active', true)
        .single();

      if (roomError || !room) {
        return { success: false, error: 'Room not found or inactive' };
      }

      // Check participant count (simplified - in production you'd track active participants)
      // For now, we'll allow posting

      // Create content hash for spam detection
      const contentHash = this.hashContent(sanitizedContent);

      // Insert message
      const { data: message, error: insertError } = await supabase
        .from('support_room_messages_v4')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          content: sanitizedContent,
          content_hash: contentHash,
          is_flagged: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting message:', insertError);
        return { success: false, error: 'Failed to send message' };
      }

      return { success: true, message };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  static async flagMessage(messageId: string, flagReason?: string): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('support_room_messages_v4')
        .update({
          is_flagged: true,
          flag_reason: flagReason,
          moderated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error flagging message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error flagging message:', error);
      return false;
    }
  }

  static async moderateMessage(
    messageId: string,
    moderatorId: string,
    action: 'approved' | 'edited' | 'removed' | 'banned',
    editedContent?: string
  ): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const updateData: any = {
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString(),
        moderation_action: action
      };

      if (action === 'edited' && editedContent) {
        updateData.content = SecurityService.sanitizeInput(editedContent);
        updateData.edited_at = new Date().toISOString();
      }

      if (action === 'removed') {
        updateData.is_flagged = true;
      }

      const { error } = await supabase
        .from('support_room_messages_v4')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error moderating message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error moderating message:', error);
      return false;
    }
  }

  static async createRoom(roomData: Omit<SupportRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportRoom | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('support_rooms_v4')
        .insert({
          name: roomData.name,
          description: roomData.description,
          category: roomData.category,
          is_active: roomData.isActive,
          is_moderated: roomData.isModerated,
          moderator_id: roomData.moderatorId,
          max_participants: roomData.maxParticipants,
          rules: roomData.rules,
          guidelines: roomData.guidelines,
          metadata: roomData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating room:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }

  static async getFlaggedMessages(roomId?: string): Promise<SupportRoomMessage[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      let query = supabase
        .from('support_room_messages_v4')
        .select('*')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching flagged messages:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching flagged messages:', error);
      return [];
    }
  }

  static async getRoomStats(roomId: string): Promise<{
    totalMessages: number;
    activeParticipants: number;
    flaggedMessages: number;
    lastActivity: string | null;
  } | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      // Get message count
      const { count: totalMessages, error: countError } = await supabase
        .from('support_room_messages_v4')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (countError) {
        console.error('Error counting messages:', countError);
        return null;
      }

      // Get unique participants
      const { data: participants, error: participantsError } = await supabase
        .from('support_room_messages_v4')
        .select('sender_id')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return null;
      }

      const uniqueParticipants = new Set(participants?.map(p => p.sender_id) || []);

      // Get flagged messages count
      const { count: flaggedMessages, error: flaggedError } = await supabase
        .from('support_room_messages_v4')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('is_flagged', true);

      if (flaggedError) {
        console.error('Error counting flagged messages:', flaggedError);
        return null;
      }

      // Get last activity
      const { data: lastMessage, error: lastError } = await supabase
        .from('support_room_messages_v4')
        .select('created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        totalMessages: totalMessages || 0,
        activeParticipants: uniqueParticipants.size,
        flaggedMessages: flaggedMessages || 0,
        lastActivity: lastMessage?.created_at || null
      };
    } catch (error) {
      console.error('Error getting room stats:', error);
      return null;
    }
  }

  private static hashContent(content: string): string {
    // Simple hash for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  static async searchRooms(query: string, category?: string): Promise<SupportRoom[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      let searchQuery = supabase
        .from('support_rooms_v4')
        .select('*')
        .eq('is_active', true);

      if (category) {
        searchQuery = searchQuery.eq('category', category);
      }

      // Simple text search (in production, you'd use full-text search)
      if (query) {
        searchQuery = searchQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      const { data, error } = await searchQuery
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error searching rooms:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error searching rooms:', error);
      return [];
    }
  }
}