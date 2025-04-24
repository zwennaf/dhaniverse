import { Application } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import { config } from "./src/config/config.ts";
import { SocketService } from "./src/services/SocketService.ts";

// Create an Oak application
const app = new Application();

// Add router middleware
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Start the HTTP server
const httpServer = await app.listen({ port: config.port });
console.log(`Server running on https://${config.serverDomain}:${config.port}`);

// Initialize Socket.IO with the HTTP server
const socketService = new SocketService(httpServer);

// Export the Socket.IO instance for potential use in other modules
export const io = socketService.getIO();