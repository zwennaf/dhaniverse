import { Router } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { WebSocketService } from "../services/WebSocketService.ts";

const wsRouter = new Router();
const webSocketService = WebSocketService.getInstance();

// WebSocket upgrade endpoint
wsRouter.get("/ws", async (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(400, "Connection is not upgradable to WebSocket");
  }

  try {
    const socket = await ctx.upgrade();
    webSocketService.handleConnection(socket);
    console.log("WebSocket connection established via router");
  } catch (error) {
    console.error("WebSocket upgrade error:", error);
    ctx.throw(500, "Failed to upgrade to WebSocket");
  }
});

export default wsRouter;
