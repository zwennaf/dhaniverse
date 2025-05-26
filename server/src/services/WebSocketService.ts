import { verifyToken } from "../routes/authRouter.ts";

interface PlayerData {
  id: string;
  username: string;
  x: number;
  y: number;
  animation?: string;
}

interface WebSocketConnection {
  socket: WebSocket;
  id: string;
  username?: string;
  userId?: string;
  authenticated: boolean;
}

// Message type interfaces
interface AuthenticateMessage {
  type: "authenticate";
  token: string;
  gameUsername: string;
}

interface UpdateMessage {
  type: "update";
  x: number;
  y: number;
  animation?: string;
}

interface ChatMessage {
  type: "chat";
  message: string;
}

// Server message types
interface ConnectionConfirmation {
  type: "connect";
  id: string;
}

interface PlayersListResponse {
  type: "players";
  players: PlayerData[];
}

interface PlayerUpdateBroadcast {
  type: "playerUpdate";
  player: PlayerData;
}

interface PlayerJoinedBroadcast {
  type: "playerJoined";
  player: PlayerData;
}

interface PlayerDisconnectBroadcast {
  type: "playerDisconnect";
  id: string;
  username: string;
}

interface ChatBroadcast {
  type: "chat";
  id: string;
  username: string;
  message: string;
}

interface AuthSuccessResponse {
  type: "authSuccess";
  message: string;
}

interface AuthErrorResponse {
  type: "authError";
  message: string;
}

type ServerMessage = ConnectionConfirmation | PlayersListResponse | PlayerUpdateBroadcast | 
                    PlayerJoinedBroadcast | PlayerDisconnectBroadcast | ChatBroadcast | 
                    AuthSuccessResponse | AuthErrorResponse;

type ClientMessage = AuthenticateMessage | UpdateMessage | ChatMessage;

export class WebSocketService {
  private static instance: WebSocketService;
  private connections: Map<string, WebSocketConnection> = new Map();
  private players: Map<string, PlayerData> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public handleConnection(socket: WebSocket): string {
    const connectionId = crypto.randomUUID();
    
    const connection: WebSocketConnection = {
      socket,
      id: connectionId,
      authenticated: false
    };

    this.connections.set(connectionId, connection);
    console.log(`WebSocket connection ${connectionId} established`);

    socket.onmessage = (event) => {
      this.handleMessage(connectionId, event.data);
    };

    socket.onclose = () => {
      this.handleDisconnection(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    };

    // Send connection confirmation
    this.sendToConnection(connectionId, {
      type: "connect",
      id: connectionId
    });

    return connectionId;
  }

  private async handleMessage(connectionId: string, data: string) {
    try {
      const message = JSON.parse(data);
      const connection = this.connections.get(connectionId);
      
      if (!connection) {
        console.warn(`Message from unknown connection: ${connectionId}`);
        return;
      }

      switch (message.type) {
        case "authenticate":
          await this.handleAuthentication(connectionId, message);
          break;
          
        case "update":
          this.handlePlayerUpdate(connectionId, message);
          break;
          
        case "chat":
          this.handleChatMessage(connectionId, message);
          break;
          
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error processing message from ${connectionId}:`, error);
    }
  }  private async handleAuthentication(connectionId: string, message: AuthenticateMessage) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Check if connection is already authenticated
      if (connection.authenticated) {
        console.warn(`Connection ${connectionId} is already authenticated`);
        return;
      }

      // Verify JWT token
      const verified = await verifyToken(message.token);
      if (!verified) {
        console.warn(`Invalid token for connection ${connectionId}`);
        connection.socket.close();
        return;
      }

      // Check if this user already has an active connection
      const existingConnection = Array.from(this.connections.values()).find(
        conn => conn.authenticated && conn.userId === verified.userId && conn.id !== connectionId
      );      if (existingConnection) {
        console.log(`User ${verified.userId} already has an active connection. Closing old connection.`);
        // Close the old connection with a specific close code (4000 = duplicate connection)
        existingConnection.socket.close(4000, "Duplicate connection detected");
        // Clean up will be handled by onclose event
      }

      // Update connection with user info
      connection.username = message.gameUsername;
      connection.userId = verified.userId;
      connection.authenticated = true;

      // Create player data
      const playerData: PlayerData = {
        id: connectionId,
        username: message.gameUsername,
        x: 500, // Default starting position
        y: 500, // Default starting position
        animation: "down-idle"
      };      this.players.set(connectionId, playerData);

      // Send connection confirmation again to ensure client has the ID
      this.sendToConnection(connectionId, {
        type: "connect",
        id: connectionId
      });

      // Send existing players to the new player (excluding the new player themselves)
      const otherPlayers = Array.from(this.players.values()).filter(p => p.id !== connectionId);
      this.sendToConnection(connectionId, {
        type: "players",
        players: otherPlayers
      });

      // Notify other players about the new player
      this.broadcastToOthers(connectionId, {
        type: "playerJoined",
        player: playerData
      });

      console.log(`Player ${message.gameUsername} authenticated and joined the game`);
    } catch (error) {
      console.error("Authentication error:", error);
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.close();
      }
    }
  }
  private handlePlayerUpdate(connectionId: string, message: UpdateMessage) {
    const connection = this.connections.get(connectionId);
    const player = this.players.get(connectionId);
    
    if (!connection?.authenticated || !player) {
      return;
    }

    // Update player data
    player.x = message.x;
    player.y = message.y;
    if (message.animation) {
      player.animation = message.animation;
    }

    // Broadcast updated player data to all other players
    this.broadcastToOthers(connectionId, {
      type: "playerUpdate",
      player
    });
  }
  private handleChatMessage(connectionId: string, message: ChatMessage) {
    const connection = this.connections.get(connectionId);
    
    if (!connection?.authenticated || !connection.username) {
      return;
    }

    // Broadcast chat message to all players
    this.broadcastToAll({
      type: "chat",
      id: connectionId,
      username: connection.username,
      message: message.message
    });
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    const player = this.players.get(connectionId);

    if (player && connection?.username) {
      console.log(`Player ${connection.username} disconnected`);
      
      // Remove player from the game
      this.players.delete(connectionId);

      // Notify other players about the disconnection
      this.broadcastToOthers(connectionId, {
        type: "playerDisconnect",
        id: connectionId,
        username: connection.username
      });
    }

    // Remove connection
    this.connections.delete(connectionId);
  }
  private sendToConnection(connectionId: string, data: ServerMessage) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(data));
    }
  }

  private broadcastToOthers(excludeConnectionId: string, data: ServerMessage) {
    for (const [connectionId, connection] of this.connections) {
      if (connectionId !== excludeConnectionId && 
          connection.authenticated && 
          connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(data));
      }
    }
  }

  private broadcastToAll(data: ServerMessage) {
    for (const connection of this.connections.values()) {
      if (connection.authenticated && connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(data));
      }
    }
  }

  public getConnectedPlayersCount(): number {
    return this.players.size;
  }
}
