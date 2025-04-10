// Import the standard Deno WebSocket modules instead of the external package
import { serve } from "https://deno.land/std/http/server.ts";
import { 
  WebSocketClient, 
  WebSocketServer,
  WebSocketAcceptedClient
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";

// Type definitions
interface Player {
  id: string;
  username: string;
  x: number;
  y: number;
  animation: string;
}

interface GameState {
  players: Map<string, Player>;
}

// Extend WebSocket to include our playerId property
interface GameWebSocket extends WebSocketAcceptedClient {
  playerId: string;
}

// Game state
const gameState: GameState = {
  players: new Map()
};

// Create the WebSocket server
const wss = new WebSocketServer(8080);
console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", function (ws: WebSocketAcceptedClient) {
  const playerId = crypto.randomUUID();
  console.log("New client connected, ID:", playerId);
  
  // Store player ID in WebSocket instance for reference
  (ws as GameWebSocket).playerId = playerId;

  ws.on("message", function (message: string | ArrayBuffer) {
    try {
      // Convert ArrayBuffer to string if needed
      const messageStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data = JSON.parse(messageStr);
      
      switch (data.type) {
        case "join":
          handlePlayerJoin(ws, playerId, data);
          break;
        
        case "update":
          handlePlayerUpdate(playerId, data);
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    handlePlayerDisconnect(playerId);
    console.log("Client disconnected, ID:", playerId);
  });
});

function handlePlayerJoin(ws: WebSocketAcceptedClient, playerId: string, data: any) {
  // Validate required data
  if (!data.username) {
    console.error("Missing username in join request");
    return;
  }
  
  const player: Player = {
    id: playerId,
    username: data.username,
    x: data.x || 0,
    y: data.y || 0,
    animation: 'idle-down'
  };
  
  gameState.players.set(playerId, player);

  // Send join confirmation
  ws.send(JSON.stringify({
    type: "connect",
    id: playerId,
    player
  }));

  // Send existing players to the new player
  ws.send(JSON.stringify({
    type: "players",
    players: Array.from(gameState.players.values())
  }));

  // Broadcast new player to all other clients
  broadcastToOthers(playerId, {
    type: "playerJoined",
    player
  });
}

function handlePlayerUpdate(playerId: string, data: any) {
  const player = gameState.players.get(playerId);
  if (player) {
    player.x = data.x !== undefined ? data.x : player.x;
    player.y = data.y !== undefined ? data.y : player.y;
    player.animation = data.animation || player.animation;
    
    broadcastToOthers(playerId, {
      type: "playerUpdate",
      player
    });
  }
}

function handlePlayerDisconnect(playerId: string) {
  const player = gameState.players.get(playerId);
  if (player) {
    gameState.players.delete(playerId);
    broadcastToAll({
      type: "playerDisconnect",
      id: playerId,
      username: player.username
    });
  }
}

function broadcastToOthers(excludePlayerId: string, data: any) {
  wss.clients.forEach((client: WebSocketAcceptedClient) => {
    if ((client as GameWebSocket).playerId !== excludePlayerId) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToAll(data: any) {
  wss.clients.forEach((client: WebSocketAcceptedClient) => {
    client.send(JSON.stringify(data));
  });
}