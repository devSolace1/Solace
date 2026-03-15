// V8 Community Support Network
// Structured support circles with moderation and engagement

import { db } from '../database/adapter';

export type SupportRoomType = 'topic' | 'crisis' | 'peer' | 'moderated';

export interface SupportRoom {
  id: string;
  name: string;
  description: string;
  type: SupportRoomType;
  topic: string;
  isActive: boolean;
  maxParticipants: number;
  currentParticipants: number;
  moderatorId?: string;
  guidelines: string[];
  tags: string[];
  createdAt: string;
  lastActivity: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'reaction' | 'system';
  isAnonymous: boolean;
  timestamp: string;
  reactions: Record<string, number>; // emoji -> count
  moderated: boolean;
  moderatorNote?: string;
}

export interface CommunityGuidelines {
  id: string;
  roomId: string;
  rule: string;
  severity: 'warning' | 'timeout' | 'ban';
  enabled: boolean;
}

export class CommunitySupportNetwork {
  private static readonly ROOM_TYPES = {
    topic: { maxParticipants: 50, requiresModerator: false },
    crisis: { maxParticipants: 20, requiresModerator: true },
    peer: { maxParticipants: 30, requiresModerator: false },
    moderated: { maxParticipants: 40, requiresModerator: true }
  };

  static async createRoom(roomData: Omit<SupportRoom, 'id' | 'currentParticipants' | 'createdAt' | 'lastActivity'>): Promise<SupportRoom> {
    const adapter = db.getAdapter();
    const roomId = this.generateRoomId();

    const room: SupportRoom = {
      id: roomId,
      ...roomData,
      currentParticipants: 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await adapter.query(`
      INSERT INTO support_rooms (id, name, description, type, topic, is_active, max_participants, current_participants, moderator_id, guidelines, tags, created_at, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      room.id,
      room.name,
      room.description,
      room.type,
      room.topic,
      room.isActive,
      room.maxParticipants,
      room.currentParticipants,
      room.moderatorId,
      JSON.stringify(room.guidelines),
      JSON.stringify(room.tags),
      room.createdAt,
      room.lastActivity
    ]);

    return room;
  }

  static async joinRoom(roomId: string, userId: string): Promise<boolean> {
    const adapter = db.getAdapter();

    // Check if room exists and has capacity
    const roomResult = await adapter.query(
      'SELECT * FROM support_rooms WHERE id = ? AND is_active = true',
      [roomId]
    );

    if (roomResult.length === 0) return false;

    const room = roomResult[0];
    if (room.current_participants >= room.max_participants) return false;

    // Check if user is already in room
    const membershipResult = await adapter.query(
      'SELECT * FROM room_memberships WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (membershipResult.length > 0) return true; // Already a member

    // Add user to room
    await adapter.query(
      'INSERT INTO room_memberships (room_id, user_id, joined_at) VALUES (?, ?, ?)',
      [roomId, userId, new Date().toISOString()]
    );

    // Update participant count
    await adapter.query(
      'UPDATE support_rooms SET current_participants = current_participants + 1 WHERE id = ?',
      [roomId]
    );

    // Log join message
    await this.addSystemMessage(roomId, `${userId} joined the room`);

    return true;
  }

  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const adapter = db.getAdapter();

    // Remove user from room
    await adapter.query(
      'DELETE FROM room_memberships WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    // Update participant count
    await adapter.query(
      'UPDATE support_rooms SET current_participants = GREATEST(0, current_participants - 1) WHERE id = ?',
      [roomId]
    );

    // Log leave message
    await this.addSystemMessage(roomId, `${userId} left the room`);
  }

  static async sendMessage(roomId: string, userId: string, content: string, isAnonymous: boolean = true): Promise<RoomMessage | null> {
    const adapter = db.getAdapter();

    // Check if user is in room
    const membershipResult = await adapter.query(
      'SELECT * FROM room_memberships WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (membershipResult.length === 0) return null;

    // Check content against guidelines
    const violations = await this.checkContentViolations(roomId, content);
    if (violations.length > 0) {
      await this.handleContentViolation(roomId, userId, violations);
      return null;
    }

    const message: RoomMessage = {
      id: this.generateMessageId(),
      roomId,
      userId,
      content,
      type: 'text',
      isAnonymous,
      timestamp: new Date().toISOString(),
      reactions: {},
      moderated: false
    };

    await adapter.query(`
      INSERT INTO room_messages (id, room_id, user_id, content, type, is_anonymous, timestamp, reactions, moderated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.roomId,
      message.userId,
      message.content,
      message.type,
      message.isAnonymous,
      message.timestamp,
      JSON.stringify(message.reactions),
      message.moderated
    ]);

    // Update room activity
    await adapter.query(
      'UPDATE support_rooms SET last_activity = ? WHERE id = ?',
      [message.timestamp, roomId]
    );

    return message;
  }

  static async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const adapter = db.getAdapter();

    // Get current message
    const messageResult = await adapter.query(
      'SELECT * FROM room_messages WHERE id = ?',
      [messageId]
    );

    if (messageResult.length === 0) return;

    const message = messageResult[0];
    const reactions = JSON.parse(message.reactions || '{}');

    // Toggle reaction
    if (reactions[emoji] && reactions[emoji][userId]) {
      delete reactions[emoji][userId];
      if (Object.keys(reactions[emoji]).length === 0) {
        delete reactions[emoji];
      }
    } else {
      if (!reactions[emoji]) reactions[emoji] = {};
      reactions[emoji][userId] = true;
    }

    await adapter.query(
      'UPDATE room_messages SET reactions = ? WHERE id = ?',
      [JSON.stringify(reactions), messageId]
    );
  }

  static async getActiveRooms(limit: number = 20): Promise<SupportRoom[]> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM support_rooms
      WHERE is_active = true
      ORDER BY last_activity DESC
      LIMIT ?
    `, [limit]);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      topic: row.topic,
      isActive: row.is_active,
      maxParticipants: row.max_participants,
      currentParticipants: row.current_participants,
      moderatorId: row.moderator_id,
      guidelines: JSON.parse(row.guidelines || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      lastActivity: row.last_activity
    }));
  }

  static async getRoomMessages(roomId: string, limit: number = 50): Promise<RoomMessage[]> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM room_messages
      WHERE room_id = ? AND moderated = false
      ORDER BY timestamp DESC
      LIMIT ?
    `, [roomId, limit]);

    return result.reverse().map(row => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      content: row.content,
      type: row.type,
      isAnonymous: row.is_anonymous,
      timestamp: row.timestamp,
      reactions: JSON.parse(row.reactions || '{}'),
      moderated: row.moderated,
      moderatorNote: row.moderator_note
    }));
  }

  private static async checkContentViolations(roomId: string, content: string): Promise<CommunityGuidelines[]> {
    const adapter = db.getAdapter();

    const guidelines = await adapter.query(
      'SELECT * FROM community_guidelines WHERE room_id = ? AND enabled = true',
      [roomId]
    );

    const violations: CommunityGuidelines[] = [];

    for (const guideline of guidelines) {
      // Simple keyword matching (could be enhanced with NLP)
      const keywords = guideline.rule.toLowerCase().split(',');
      const contentLower = content.toLowerCase();

      if (keywords.some(keyword => contentLower.includes(keyword.trim()))) {
        violations.push({
          id: guideline.id,
          roomId: guideline.room_id,
          rule: guideline.rule,
          severity: guideline.severity,
          enabled: guideline.enabled
        });
      }
    }

    return violations;
  }

  private static async handleContentViolation(roomId: string, userId: string, violations: CommunityGuidelines[]): Promise<void> {
    const adapter = db.getAdapter();

    for (const violation of violations) {
      // Log violation
      await adapter.query(`
        INSERT INTO content_violations (room_id, user_id, guideline_id, content, severity, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        roomId,
        userId,
        violation.id,
        '', // We don't store the violating content for privacy
        violation.severity,
        new Date().toISOString()
      ]);

      // Apply consequences
      switch (violation.severity) {
        case 'warning':
          await this.addSystemMessage(roomId, `A community guideline was violated. Please review our guidelines.`);
          break;
        case 'timeout':
          await this.timeoutUser(roomId, userId, 15 * 60 * 1000); // 15 minutes
          break;
        case 'ban':
          await this.banUser(roomId, userId);
          break;
      }
    }
  }

  private static async timeoutUser(roomId: string, userId: string, durationMs: number): Promise<void> {
    const adapter = db.getAdapter();
    const timeoutUntil = new Date(Date.now() + durationMs).toISOString();

    await adapter.query(`
      INSERT INTO room_timeouts (room_id, user_id, timeout_until)
      VALUES (?, ?, ?)
      ON CONFLICT (room_id, user_id) DO UPDATE SET timeout_until = ?
    `, [roomId, userId, timeoutUntil, timeoutUntil]);

    await this.addSystemMessage(roomId, `${userId} has been timed out for violating guidelines.`);
  }

  private static async banUser(roomId: string, userId: string): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(
      'DELETE FROM room_memberships WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    await adapter.query(`
      INSERT INTO room_bans (room_id, user_id, banned_at)
      VALUES (?, ?, ?)
    `, [roomId, userId, new Date().toISOString()]);

    await this.addSystemMessage(roomId, `${userId} has been banned for violating guidelines.`);
  }

  private static async addSystemMessage(roomId: string, content: string): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO room_messages (id, room_id, user_id, content, type, is_anonymous, timestamp, moderated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.generateMessageId(),
      roomId,
      'system',
      content,
      'system',
      true,
      new Date().toISOString(),
      false
    ]);
  }

  private static generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getRoomByTopic(topic: string): Promise<SupportRoom[]> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM support_rooms
      WHERE topic LIKE ? AND is_active = true
      ORDER BY current_participants DESC
    `, [`%${topic}%`]);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      topic: row.topic,
      isActive: row.is_active,
      maxParticipants: row.max_participants,
      currentParticipants: row.current_participants,
      moderatorId: row.moderator_id,
      guidelines: JSON.parse(row.guidelines || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      lastActivity: row.last_activity
    }));
  }
}