// Enhanced WebSocket service for Dhaniverse
export class WebSocketService {
  private sockets = new Map<string, WebSocket>();
  private userSockets = new Map<string, string>(); // userId -> socketId mapping
  
  constructor() {
    console.log("🔌 WebSocket service initialized");
  }

  handleConnection(socket: WebSocket, userId?: string) {
    const socketId = crypto.randomUUID();
    this.sockets.set(socketId, socket);
    
    console.log(`🔗 New WebSocket connection: ${socketId}`);
    
    // Set up event handlers
    socket.onopen = () => {
      console.log(`✅ WebSocket opened: ${socketId}`);
      this.sendToSocket(socketId, {
        type: 'connection',
        message: 'Connected to Dhaniverse server',
        socketId
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(socketId, data);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log(`🔌 WebSocket closed: ${socketId}`);
      this.sockets.delete(socketId);
      
      // Remove user mapping if exists
      for (const [user, sock] of this.userSockets.entries()) {
        if (sock === socketId) {
          this.userSockets.delete(user);
          break;
        }
      }
    };

    socket.onerror = (error) => {
      console.error(`❌ WebSocket error for ${socketId}:`, error);
    };

    // Associate with user if provided
    if (userId) {
      this.userSockets.set(userId, socketId);
      console.log(`👤 Associated socket ${socketId} with user ${userId}`);
    }

    return socketId;
  }

  private handleMessage(socketId: string, data: any) {
    console.log(`📨 Message from ${socketId}:`, data);
    
    switch (data.type) {
      case 'join':
        if (data.username) {
          this.userSockets.set(data.username, socketId);
          this.broadcast({
            type: 'player-joined',
            username: data.username,
            message: `${data.username} joined the game`
          }, socketId);
        }
        break;
        
      case 'chat':
        if (data.message && data.username) {
          this.broadcast({
            type: 'chat-message',
            username: data.username,
            message: data.message,
            timestamp: Date.now()
          });
        }
        break;
        
      case 'player-move':
        if (data.position && data.username) {
          this.broadcast({
            type: 'player-position',
            username: data.username,
            position: data.position
          }, socketId);
        }
        break;
        
      default:
        console.log(`🤷 Unknown message type: ${data.type}`);
    }
  }

  private sendToSocket(socketId: string, message: Record<string, unknown>) {
    const socket = this.sockets.get(socketId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  broadcast(message: Record<string, unknown>, excludeSocketId?: string) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    this.sockets.forEach((socket, socketId) => {
      if (socketId !== excludeSocketId && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
        sentCount++;
      }
    });
    
    console.log(`📡 Broadcast message to ${sentCount} clients:`, message.type);
  }

  sendToUser(userId: string, message: Record<string, unknown>) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.sendToSocket(socketId, message);
      return true;
    }
    console.warn(`⚠️  User ${userId} not found for message:`, message.type);
    return false;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getConnectionCount(): number {
    return this.sockets.size;
  }
}

export const webSocketService = new WebSocketService();