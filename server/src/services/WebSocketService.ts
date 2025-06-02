// Basic WebSocket service for Dhaniverse
export class WebSocketService {
  private sockets = new Map<string, WebSocket>();
  constructor() {
    // WebSocket service initialized
  }

  handleConnection(socket: WebSocket, userId?: string) {
    const id = userId || crypto.randomUUID();
    this.sockets.set(id, socket);
      socket.onclose = () => {
      this.sockets.delete(id);
    };

    return id;
  }
  broadcast(message: Record<string, unknown>) {
    const messageStr = JSON.stringify(message);
    this.sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    });
  }

  sendToUser(userId: string, message: Record<string, unknown>) {
    const socket = this.sockets.get(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}

export const webSocketService = new WebSocketService();