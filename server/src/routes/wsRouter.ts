import { Router } from "oak";
import { config } from "../config/config.ts";

const wsRouter = new Router();

// WebSocket endpoint - redirect to separate WebSocket server
wsRouter.get("/ws", (ctx) => {
  const wsPort = config.socketPort;
  const wsUrl = `ws://${config.serverDomain}:${wsPort}/ws`;
  
  ctx.response.status = 426;
  ctx.response.headers.set("Upgrade", "websocket");
  ctx.response.headers.set("Connection", "Upgrade");
  ctx.response.body = { 
    error: "WebSocket upgrade not supported on this endpoint",
    message: `Connect to dedicated WebSocket server on port ${wsPort}`,
    wsUrl: wsUrl,
    instructions: "Use the WebSocket URL in your client to connect"
  };
});

// WebSocket info endpoint
wsRouter.get("/ws/info", (ctx) => {
  const wsPort = config.socketPort;
  const wsUrl = `ws://${config.serverDomain}:${wsPort}/ws`;
  
  ctx.response.body = {
    websocket: {
      url: wsUrl,
      port: wsPort,
      endpoints: {
        connection: "/ws",
        health: "/health"
      }
    },
    usage: {
      javascript: `const ws = new WebSocket('${wsUrl}');`,
      curl: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" -H "Sec-WebSocket-Version: 13" ${wsUrl}`
    }
  };
});

export default wsRouter;
