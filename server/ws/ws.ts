import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { load } from "https://deno.land/std@0.217.0/dotenv/mod.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// Load environment variables
await load({ export: true });

const PORT = parseInt(Deno.env.get("PORT") || "8001");
const JWT_SECRET = Deno.env.get("JWT_SECRET") || crypto.randomUUID();
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",");

// Track server start time
const SERVER_START_TIME = Date.now();

// Player data interface
interface PlayerData {
  id: string;
  username: string;
  x: number;
  y: number;
  animation?: string;
}

// Connection tracking
interface Connection {
  id: string;
  username: string;
  socket: WebSocket;
  lastActivity: number;
  authenticated: boolean;
  position: { x: number; y: number };
  animation?: string;
}

// Message types
interface AuthMessage {
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

type ClientMessage = AuthMessage | UpdateMessage | ChatMessage;

// Server state
const connections = new Map<string, Connection>();
const userConnections = new Map<string, string>(); // userId -> connectionId

// Authentication handler
async function handleAuthentication(
  connection: Connection,
  message: AuthMessage
) {
  try {
    // Get the auth server URL based on environment
    const authServerUrl = Deno.env.get("DENO_ENV") === "production" 
      ? Deno.env.get("PRODUCTION_AUTH_SERVER_URL") || "https://dhaniverseapi.deno.dev"
      : Deno.env.get("AUTH_SERVER_URL") || "http://localhost:8000";
    
    // Validate token with the main backend server
    const response = await fetch(`${authServerUrl}/auth/validate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: message.token }),
    });

    const data = await response.json();

    if (!response.ok || !data.valid) {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          error: "authentication_failed",
          message: "Invalid token",
        })
      );
      return;
    }

    const userId = data.userId;

    // Check for existing connection with this user ID
    const existingConnectionId = userConnections.get(userId);
    if (existingConnectionId && existingConnectionId !== connection.id) {
      const existingConnection = connections.get(existingConnectionId);
      if (existingConnection) {
        // Close the existing connection
        existingConnection.socket.close(
          1000,
          "Replaced by newer connection"
        );
        connections.delete(existingConnectionId);
        console.log(`Closed existing connection for user ${userId}`);
      }
    }

    // Update connection with authenticated user info
    connection.authenticated = true;
    // Use the provided game username or fall back to the one from the token validation
    connection.username = message.gameUsername || data.gameUsername;
    userConnections.set(userId, connection.id);

    // Send connection confirmation
    connection.socket.send(
      JSON.stringify({
        type: "connect",
        id: connection.id,
      })
    );

    // Send list of existing players
    const players: PlayerData[] = [];
    connections.forEach((conn) => {
      if (conn.id !== connection.id && conn.authenticated) {
        players.push({
          id: conn.id,
          username: conn.username,
          x: conn.position.x,
          y: conn.position.y,
          animation: conn.animation,
        });
      }
    });

    connection.socket.send(
      JSON.stringify({
        type: "players",
        players,
      })
    );

    // Notify other players about the new player
    broadcastToOthers(connection.id, {
      type: "playerJoined",
      player: {
        id: connection.id,
        username: connection.username,
        x: connection.position.x,
        y: connection.position.y,
      },
    });

    console.log(
      `User authenticated: ${connection.username} (${connection.id})`
    );
  } catch (error) {
    console.error(`Authentication error: ${error}`);
    connection.socket.send(
      JSON.stringify({
        type: "error",
        error: "authentication_failed",
        message: "Authentication failed",
      })
    );
  }
}

// Position update handler
function handlePositionUpdate(connection: Connection, message: UpdateMessage) {
  if (!connection.authenticated) {
    connection.socket.send(
      JSON.stringify({
        type: "error",
        error: "not_authenticated",
        message: "You must authenticate first",
      })
    );
    return;
  }

  // Update player position
  connection.position.x = message.x;
  connection.position.y = message.y;
  if (message.animation) {
    connection.animation = message.animation;
  }

  // Broadcast position update to other players
  broadcastToOthers(connection.id, {
    type: "playerUpdate",
    player: {
      id: connection.id,
      username: connection.username,
      x: connection.position.x,
      y: connection.position.y,
      animation: connection.animation,
    },
  });
}

// Chat message handler
function handleChatMessage(connection: Connection, message: ChatMessage) {
  if (!connection.authenticated) {
    connection.socket.send(
      JSON.stringify({
        type: "error",
        error: "not_authenticated",
        message: "You must authenticate first",
      })
    );
    return;
  }

  // Generate a unique message ID
  const messageId = `chat-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  // Broadcast chat message to all players (including sender)
  broadcast({
    type: "chat",
    id: messageId,
    username: connection.username,
    message: message.message,
  });
}

// Disconnect handler
function handleDisconnect(connectionId: string) {
  const connection = connections.get(connectionId);
  if (connection) {
    // Remove from connections map
    connections.delete(connectionId);

    // Remove from userConnections map
    for (const [userId, connId] of userConnections.entries()) {
      if (connId === connectionId) {
        userConnections.delete(userId);
        break;
      }
    }

    // Notify other players if this was an authenticated connection
    if (connection.authenticated) {
      broadcastToOthers(connectionId, {
        type: "playerDisconnect",
        id: connectionId,
        username: connection.username,
      });
    }

    console.log(
      `Connection closed: ${connectionId}, remaining: ${connections.size}`
    );
  }
}

// Broadcast message to all connections
function broadcast(message: any) {
  const messageStr = JSON.stringify(message);
  connections.forEach((connection) => {
    if (
      connection.authenticated &&
      connection.socket.readyState === WebSocket.OPEN
    ) {
      connection.socket.send(messageStr);
    }
  });
}

// Broadcast message to all connections except the sender
function broadcastToOthers(senderId: string, message: any) {
  const messageStr = JSON.stringify(message);
  connections.forEach((connection) => {
    if (
      connection.id !== senderId &&
      connection.authenticated &&
      connection.socket.readyState === WebSocket.OPEN
    ) {
      connection.socket.send(messageStr);
    }
  });
}

// Set up connection cleanup interval
setInterval(() => {
  const now = Date.now();
  connections.forEach((connection, id) => {
    // Close connections that have been inactive for more than 5 minutes
    if (now - connection.lastActivity > 5 * 60 * 1000) {
      console.log(`Closing inactive connection: ${id}`);
      connection.socket.close(
        1000,
        "Connection timeout due to inactivity"
      );
      handleDisconnect(id);
    }
  });
}, 60 * 1000); // Check every minute

console.log(`✅ WebSocket server listening on port ${PORT}`);

// Start the server
serve((req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    if (origin && (ALLOWED_ORIGINS.includes(origin) || Deno.env.get("DENO_ENV") === "development")) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }
    return new Response(null, { status: 204 });
  }

  // Handle health check endpoint
  if (req.url.endsWith("/health")) {
    return new Response(
      JSON.stringify({
        status: "ok",
        connections: connections.size,
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000), // in seconds
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Handle info endpoint
  if (req.url.endsWith("/info")) {
    return new Response(
      JSON.stringify({
        status: "ok",
        connections: connections.size,
        environment: Deno.env.get("DENO_ENV") || "development",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Handle WebSocket upgrade
  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connectionId = crypto.randomUUID();

    // Create a new connection
    const connection: Connection = {
      id: connectionId,
      username: "",
      socket,
      lastActivity: Date.now(),
      authenticated: false,
      position: { x: 0, y: 0 },
    };

    connections.set(connectionId, connection);
    console.log(
      `New connection: ${connectionId}, total connections: ${connections.size}`
    );

    // WebSocket event handlers
    socket.onopen = () => {
      console.log(`WebSocket connection opened: ${connectionId}`);
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as ClientMessage;
        connection.lastActivity = Date.now();

        switch (message.type) {
          case "authenticate":
            await handleAuthentication(connection, message);
            break;

          case "update":
            handlePositionUpdate(connection, message);
            break;

          case "chat":
            handleChatMessage(connection, message);
            break;

          default:
            console.warn(
              `Unknown message type: ${(message as any).type}`
            );
        }
      } catch (error) {
        console.error(`Error handling message: ${error}`);
      }
    };

    socket.onclose = () => {
      handleDisconnect(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      handleDisconnect(connectionId);
    };

    return response;
  } catch (err) {
    console.error("WebSocket upgrade failed:", err);
    return new Response("WebSocket upgrade failed", { status: 400 });
  }
}, { port: PORT });