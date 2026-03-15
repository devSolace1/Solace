// V7 Internal Realtime Server
// WebSocket-based realtime functionality for self-hosting

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { configManager } from '../config/manager';
import { db } from '../database/adapter';

interface WSClient extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface RealtimeMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 3001) {}

  async start(): Promise<void> {
    const config = configManager.getConfig();

    this.wss = new WebSocketServer({
      port: config.realtime.port,
      maxPayload: 1024 * 1024, // 1MB max payload
      perMessageDeflate: true
    });

    console.log(`Realtime server started on port ${config.realtime.port}`);

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.close();
    }

    this.clients.clear();
  }

  private handleConnection(ws: WSClient, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    this.clients.set(clientId, ws);

    ws.isAlive = true;

    console.log(`Client connected: ${clientId}`);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: RealtimeMessage = JSON.parse(data.toString());
        this.handleMessage(clientId, ws, message);
      } catch (error) {
        console.error('Invalid message format:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
      this.handleDisconnect(clientId);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send welcome message
    this.sendMessage(ws, 'welcome', { clientId });
  }

  private handleMessage(clientId: string, ws: WSClient, message: RealtimeMessage): void {
    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, ws, message.payload);
        break;
      case 'join_session':
        this.handleJoinSession(clientId, ws, message.payload);
        break;
      case 'leave_session':
        this.handleLeaveSession(clientId, ws);
        break;
      case 'chat_message':
        this.handleChatMessage(clientId, ws, message.payload);
        break;
      case 'panic_alert':
        this.handlePanicAlert(clientId, ws, message.payload);
        break;
      case 'join_room':
        this.handleJoinRoom(clientId, ws, message.payload);
        break;
      case 'leave_room':
        this.handleLeaveRoom(clientId, ws);
        break;
      case 'room_message':
        this.handleRoomMessage(clientId, ws, message.payload);
        break;
      case 'heartbeat':
        // Client is alive, no action needed
        break;
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleAuth(clientId: string, ws: WSClient, payload: { userId?: string; token?: string }): void {
    // Basic authentication - in production, validate JWT token
    if (payload.userId) {
      ws.userId = payload.userId;
      this.sendMessage(ws, 'auth_success', { userId: payload.userId });
    } else {
      this.sendError(ws, 'Authentication failed');
    }
  }

  private handleJoinSession(clientId: string, ws: WSClient, payload: { sessionId: string }): void {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    ws.sessionId = payload.sessionId;
    this.sendMessage(ws, 'session_joined', { sessionId: payload.sessionId });

    // Notify other participants in the session
    this.broadcastToSession(payload.sessionId, 'user_joined', {
      userId: ws.userId,
      sessionId: payload.sessionId
    }, clientId);
  }

  private handleLeaveSession(clientId: string, ws: WSClient): void {
    if (ws.sessionId && ws.userId) {
      this.broadcastToSession(ws.sessionId, 'user_left', {
        userId: ws.userId,
        sessionId: ws.sessionId
      }, clientId);
    }

    ws.sessionId = undefined;
    this.sendMessage(ws, 'session_left', {});
  }

  private handleChatMessage(clientId: string, ws: WSClient, payload: { content: string; messageType?: string }): void {
    if (!ws.userId || !ws.sessionId) {
      this.sendError(ws, 'Not in a session');
      return;
    }

    // Store message in database
    this.storeMessage(ws.sessionId, ws.userId, payload.content, payload.messageType || 'text');

    // Broadcast to session participants
    this.broadcastToSession(ws.sessionId, 'chat_message', {
      sessionId: ws.sessionId,
      senderId: ws.userId,
      content: payload.content,
      messageType: payload.messageType || 'text',
      timestamp: Date.now()
    });
  }

  private handlePanicAlert(clientId: string, ws: WSClient, payload: { alertType: string; severity: string }): void {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    // Store panic alert
    this.storePanicAlert(ws.userId, ws.sessionId, payload.alertType, payload.severity);

    // Broadcast panic alert to counselors and moderators
    this.broadcastToRole('counselor', 'panic_alert', {
      userId: ws.userId,
      sessionId: ws.sessionId,
      alertType: payload.alertType,
      severity: payload.severity,
      timestamp: Date.now()
    });

    this.broadcastToRole('admin', 'panic_alert', {
      userId: ws.userId,
      sessionId: ws.sessionId,
      alertType: payload.alertType,
      severity: payload.severity,
      timestamp: Date.now()
    });
  }

  private handleJoinRoom(clientId: string, ws: WSClient, payload: { roomId: string }): void {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    ws.roomId = payload.roomId;
    this.sendMessage(ws, 'room_joined', { roomId: payload.roomId });

    // Notify room participants
    this.broadcastToRoom(payload.roomId, 'user_joined_room', {
      userId: ws.userId,
      roomId: payload.roomId
    }, clientId);
  }

  private handleLeaveRoom(clientId: string, ws: WSClient): void {
    if (ws.roomId && ws.userId) {
      this.broadcastToRoom(ws.roomId, 'user_left_room', {
        userId: ws.userId,
        roomId: ws.roomId
      }, clientId);
    }

    ws.roomId = undefined;
    this.sendMessage(ws, 'room_left', {});
  }

  private handleRoomMessage(clientId: string, ws: WSClient, payload: { content: string }): void {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    // Store room message
    this.storeRoomMessage(ws.roomId, ws.userId, payload.content);

    // Broadcast to room participants
    this.broadcastToRoom(ws.roomId, 'room_message', {
      roomId: ws.roomId,
      senderId: ws.userId,
      content: payload.content,
      timestamp: Date.now()
    });
  }

  private handleDisconnect(clientId: string): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      if (ws.sessionId) {
        this.handleLeaveSession(clientId, ws);
      }
      if (ws.roomId) {
        this.handleLeaveRoom(clientId, ws);
      }
    }
  }

  private broadcastToSession(sessionId: string, type: string, payload: any, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if (client.sessionId === sessionId && clientId !== excludeClientId && client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, type, payload);
      }
    }
  }

  private broadcastToRoom(roomId: string, type: string, payload: any, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if ((client as any).roomId === roomId && clientId !== excludeClientId && client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, type, payload);
      }
    }
  }

  private broadcastToRole(role: string, type: string, payload: any): void {
    // In a real implementation, you'd check user roles from database
    // For now, broadcast to all authenticated users (simplified)
    for (const client of this.clients.values()) {
      if (client.userId && client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, type, payload);
      }
    }
  }

  private sendMessage(ws: WSClient, type: string, payload: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        payload,
        timestamp: Date.now()
      }));
    }
  }

  private sendError(ws: WSClient, message: string): void {
    this.sendMessage(ws, 'error', { message });
  }

  private startHeartbeat(): void {
    const config = configManager.getConfig();

    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (!client.isAlive) {
          client.close();
          this.clients.delete(clientId);
          continue;
        }

        client.isAlive = false;
        client.ping();
      }
    }, config.realtime.heartbeatInterval);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeMessage(sessionId: string, senderId: string, content: string, messageType: string): Promise<void> {
    try {
      const adapter = db.getAdapter();
      await adapter.query(
        'INSERT INTO messages (session_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
        [sessionId, senderId, content, messageType]
      );
    } catch (error) {
      console.error('Failed to store message:', error);
    }
  }

  private async storePanicAlert(userId: string, sessionId: string | undefined, alertType: string, severity: string): Promise<void> {
    try {
      const adapter = db.getAdapter();
      await adapter.query(
        'INSERT INTO panic_alerts (user_id, session_id, alert_type, severity) VALUES (?, ?, ?, ?)',
        [userId, sessionId || null, alertType, severity]
      );
    } catch (error) {
      console.error('Failed to store panic alert:', error);
    }
  }

  private async storeRoomMessage(roomId: string, senderId: string, content: string): Promise<void> {
    try {
      const adapter = db.getAdapter();
      await adapter.query(
        'INSERT INTO support_messages (room_id, sender_id, content) VALUES (?, ?, ?)',
        [roomId, senderId, content]
      );
    } catch (error) {
      console.error('Failed to store room message:', error);
    }
  }
}

export const realtimeServer = new RealtimeServer();