import { WebSocketService } from "./services/WebSocketService.ts";
import { config } from "./config/config.ts";

const webSocketService = new WebSocketService();

// Create a separate HTTP server for WebSocket connections
async function startWebSocketServer() {
  const port = config.socketPort;
  
  console.log(`🔌 Starting WebSocket server on port ${port}`);
  
  try {
    const server = Deno.serve({
      port: port,
      hostname: "0.0.0.0",
      onError: (error) => {
        console.error("❌ WebSocket server error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }, (req) => {
      const url = new URL(req.url);
      
      // Handle WebSocket upgrade requests
      if (url.pathname === "/ws") {
        const upgrade = req.headers.get("upgrade");
        const connection = req.headers.get("connection");
        
        if (upgrade?.toLowerCase() !== "websocket" || !connection?.toLowerCase().includes("upgrade")) {
          return new Response(JSON.stringify({
            error: "Expected WebSocket upgrade",
            headers: {
              upgrade: upgrade,
              connection: connection
            }
          }), { 
            status: 426,
            headers: {
              "Content-Type": "application/json",
              "Upgrade": "websocket"
            }
          });
        }
        
        try {
          // Upgrade to WebSocket using Deno's native API
          const { socket, response } = Deno.upgradeWebSocket(req);
          
          // Handle the WebSocket connection
          webSocketService.handleConnection(socket);
          
          return response;
        } catch (error) {
          console.error("❌ WebSocket upgrade failed:", error);
          return new Response(JSON.stringify({
            error: "WebSocket upgrade failed",
            details: error.message
          }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      
      // Handle health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          connections: webSocketService.getConnectionCount(),
          users: webSocketService.getConnectedUsers().length,
          timestamp: new Date().toISOString()
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Handle other requests
      return new Response(JSON.stringify({
        message: "Dhaniverse WebSocket Server",
        endpoints: {
          websocket: "/ws",
          health: "/health"
        },
        usage: "Connect to ws://localhost:" + port + "/ws"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    
    console.log(`✅ WebSocket server running on ws://localhost:${port}/ws`);
    console.log(`🏥 Health check available at http://localhost:${port}/health`);
    
    return server;
  } catch (error) {
    console.error("❌ Failed to start WebSocket server:", error);
    throw error;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = () => {
    console.log("🛑 Shutting down WebSocket server...");
    Deno.exit(0);
  };
  
  Deno.addSignalListener("SIGINT", shutdown);
  if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", shutdown);
  }
}

// Start the WebSocket server if this file is run directly
if (import.meta.main) {
  setupGracefulShutdown();
  await startWebSocketServer();
}

export { startWebSocketServer };