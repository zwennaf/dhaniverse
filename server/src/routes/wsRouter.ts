import { Router } from "oak";
import { webSocketService } from "../services/WebSocketService.ts";
import { verifyToken } from "../auth/jwt.ts";
import { config } from "../config/config.ts";

const wsRouter = new Router();

// WebSocket endpoint - handle WebSocket upgrade
wsRouter.get("/ws", async (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.response.status = 426;
    ctx.response.body = { 
      error: "Upgrade Required",
      message: "This endpoint requires WebSocket upgrade"
    };
    return;
  }

  const ip = ctx.request.ip || "unknown";
  
  // Get authentication token
  let token = ctx.request.url.searchParams.get("token") || "";
  if (!token) {
    token = await ctx.cookies.get("authToken") || "";
  }
  
  let userId: string | undefined;
  let username: string | undefined;
  
  // Verify JWT if token exists
  if (token) {
    try {
      const payload = await verifyToken(token);
      if (payload) {
        userId = payload.userId as string;
        username = payload.username as string;
        console.log(`🔑 Authenticated user: ${username || 'unknown'} (${userId})`);
      }
    } catch (error) {
      console.error("❌ JWT verification failed:", error);
    }
  }

  // Get room from query parameters
  const roomCode = ctx.request.url.searchParams.get("room");
  
  try {
    // Upgrade the connection
    const socket = await ctx.upgrade();
    
    // Handle the connection
    const socketId = webSocketService.handleConnection(socket, userId, ip);
    
    // Set username if authenticated
    if (username && socketId) {
      webSocketService.sendToSocket(socketId, {
        type: "authenticated",
        username,
        userId
      });
    }
    
    // Join room if specified
    if (roomCode && socketId) {
      console.log(`🏠 ${username || 'Guest'} joining room: ${roomCode}`);
      webSocketService.sendToSocket(socketId, {
        type: "room-joined",
        room: roomCode
      });
    }
  } catch (error) {
    console.error("❌ WebSocket upgrade failed:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "WebSocket Upgrade Failed",
      message: "Failed to establish WebSocket connection"
    };
  }
});

// WebSocket info endpoint
wsRouter.get("/ws/info", (ctx) => {
  const host = ctx.request.url.host;
  
  ctx.response.body = {
    websocket: {
      activeConnections: webSocketService.getConnectionCount(),
      connectedUsers: webSocketService.getConnectedUsers(),
      endpoints: {
        connection: "/ws",
        info: "/ws/info",
        health: "/ws/health"
      }
    },
    usage: {
      javascript: `const ws = new WebSocket('ws://${host}/ws');`,
      curl: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" -H "Sec-WebSocket-Version: 13" ws://${host}/ws`
    }
  };
});

// WebSocket health check endpoint
wsRouter.get("/ws/health", (ctx) => {
  ctx.response.body = {
    status: "ok",
    connections: webSocketService.getConnectionCount(),
    users: webSocketService.getConnectedUsers(),
    timestamp: new Date().toISOString()
  };
});

export default wsRouter;