import { load } from "https://deno.land/std@0.217.0/dotenv/mod.ts";
import { MongoClient, Document } from "npm:mongodb";

// Load environment variables
await load({ export: true });

// Mongo integration (optional)
const mongoUri = Deno.env.get("MONGODB_URI");
let mongoClient: MongoClient | null = null;
let mongoReady = false;
if (mongoUri) {
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mongoReady = true;
    console.log('[ws] Mongo connected');
  } catch (e) {
    console.error('[ws] Mongo connect failed', e);
  }
}

function col<T extends Document = Document>(name: string) { 
  if (!mongoReady || !mongoClient) return null; 
  return mongoClient.db().collection<T>(name); 
}

interface BanRule { type:'email'|'internet_identity'|'ip'; value:string; active:boolean; expiresAt?:Date; reason?:string }
interface SessionLog { userId?:string; username?:string; email?:string; ip?:string; event:'join'|'leave'; timestamp:Date; position?:{x:number;y:number}; skin?:string }
interface ChatMessageLog { userId?:string; username?:string; message:string; timestamp:Date }
interface IpLog { userId?:string; email?:string; ip:string; firstSeen:Date; lastSeen:Date; count:number }
interface ActivePlayer { userId?:string; username?:string; email?:string; position:{x:number;y:number}; animation?:string; skin?:string; updatedAt:Date }

async function expireBans() { 
  try { 
    const bans = col<BanRule>('bans'); 
    if (!bans) return; 
    await bans.updateMany(
      { active: true, expiresAt: { $lte: new Date() } }, 
      { $set: { active: false } }
    ); 
  } catch(_error) {
    console.error('Failed to expire bans:', _error);
  }
}

async function isBanned({ email, ip }: { email?:string; ip?:string }) { 
  const bans = col<BanRule>('bans'); 
  if (!bans) return false; 
  await expireBans(); 
  
  const orConditions: Array<{ type: BanRule['type']; value: string }> = [];
  if (email) orConditions.push({ type: 'email', value: email.toLowerCase() }); 
  if (ip) orConditions.push({ type: 'ip', value: ip }); 
  if (!orConditions.length) return false; 
  
  const docs = await bans.find({ 
    active: true, 
    $or: orConditions 
  }).toArray(); 
  const now = new Date(); 
  return docs.some((d: BanRule) => !d.expiresAt || new Date(d.expiresAt) > now); 
}

async function logSession(entry: SessionLog){ 
  const c = col<SessionLog>('sessionLogs'); 
  if(!c) return; 
  try{ 
    await c.insertOne(entry); 
  } catch(_error) {
    console.error('Failed to log session:', _error);
  } 
}

async function logChat(entry: ChatMessageLog){ 
  const c = col<ChatMessageLog>('chatMessages'); 
  if(!c) return; 
  try{ 
    await c.insertOne(entry); 
  } catch(_error) {
    console.error('Failed to log chat:', _error);
  } 
}

async function updateIpLog({ userId, email, ip }: { userId?:string; email?:string; ip?:string }) { 
  if(!ip) return; 
  const c = col<IpLog>('ipLogs'); 
  if(!c) return; 
  try{ 
    const existing = await c.findOne({ ip, userId }); 
    if(existing){ 
      await c.updateOne(
        { _id: existing._id }, 
        { 
          $set: { lastSeen: new Date() }, 
          $inc: { count: 1 } 
        }
      ); 
    } else { 
      await c.insertOne({ 
        userId, 
        email, 
        ip, 
        firstSeen: new Date(), 
        lastSeen: new Date(), 
        count: 1 
      }); 
    } 
  } catch(_error) {
    console.error('Failed to update IP log:', _error);
  }
}

async function upsertActivePlayer(p: ActivePlayer){ 
  const c = col<ActivePlayer>('activePlayers'); 
  if(!c) return; 
  try{ 
    if(!p.userId) return; 
    await c.updateOne(
      { userId: p.userId }, 
      { $set: p }, 
      { upsert: true }
    ); 
  } catch(_error) {
    console.error('Failed to upsert active player:', _error);
  }
}

async function removeActivePlayer(userId?:string){ 
  if(!userId) return; 
  const c = col('activePlayers'); 
  if(!c) return; 
  try{ 
    await c.deleteOne({ userId }); 
  } catch(_error) {
    console.error('Failed to remove active player:', _error);
  } 
}

// Track server start time
const SERVER_START_TIME = Date.now();
// Core config
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",");

// Player data interface
interface PlayerData {
    id: string;
    username: string;
    x: number;
    y: number;
    animation?: string;
    skin?: string;
}

// Connection tracking
interface Connection {
    id: string;
    username: string;
    socket: WebSocket;
    lastActivity: number;
    lastPing: number;
    lastChatTime?: number;
    lastUpdateTime?: number;
    authenticated: boolean;
    position: { x: number; y: number };
    animation?: string;
    userId?: string;
    pendingUpdate?: { x: number; y: number; animation?: string };
    skin?: string;
    lastMovementTime?: number; // for AFK detection
    ip?: string; // Store IP address
    email?: string; // Store email for ban checking
}

// Message types
interface AuthMessage {
    type: "authenticate";
    token: string;
    gameUsername: string;
    skin?: string;
}

interface UpdateMessage {
    type: "update";
    x: number;
    y: number;
    animation?: string;
    skin?: string; // Add skin to the interface
}

interface ChatMessage {
    type: "chat";
    message: string;
}

interface PingMessage {
    type: "ping";
}

type ClientMessage = AuthMessage | UpdateMessage | ChatMessage | PingMessage;

// Server state
const connections = new Map<string, Connection>();
const userConnections = new Map<string, string>(); // userId -> connectionId
const pendingAuthentications = new Map<string, number>(); // userId -> timestamp
const connectionsByUserId = new Map<string, Set<string>>(); // userId -> Set of connectionIds (for cleanup)
// Admin monitor connections (not treated as players)
const adminMonitors = new Set<WebSocket>();

// Utility: send to admin monitors
function sendToAdmins(payload: Record<string, unknown>) {
    const msg = JSON.stringify(payload);
    adminMonitors.forEach(ws => {
        try { 
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg); 
            }
        } catch(_error) {
            console.error('Failed to send to admin monitor:', _error);
        }
    });
}

async function validateAdminToken(token?: string) {
    if (!token) return null;
    const authServerUrl =
        Deno.env.get("DENO_ENV") === "production"
            ? Deno.env.get("PRODUCTION_AUTH_SERVER_URL") || "https://api.dhaniverse.in"
            : Deno.env.get("AUTH_SERVER_URL") || "http://localhost:8000";
    try {
        const r = await fetch(`${authServerUrl}/auth/validate-token`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) });
        const d = await r.json();
        if (!r.ok || !d.valid) return null;
        const adminEmail = (Deno.env.get('ADMIN_EMAIL')||'').toLowerCase();
        if (!adminEmail || d.email?.toLowerCase() !== adminEmail) return null;
        return { userId: d.userId, email: d.email?.toLowerCase() };
    } catch(_) { return null; }
}

// Helper function to extract IP from request (improved pattern based on PHP)
function extractIpFromRequest(req: Request): string | undefined {
    let clientIp = "unknown";
    
    // Check for client IP from shared internet (highest priority)
    const clientIpHeader = req.headers.get("http-client-ip");
    if (clientIpHeader && clientIpHeader.trim() !== "") {
        clientIp = clientIpHeader.trim();
    }
    // Check for IP from proxy (second priority)
    else {
        const forwardedFor = req.headers.get("x-forwarded-for");
        if (forwardedFor && forwardedFor.trim() !== "") {
            // Take the first IP in the chain (original client)
            clientIp = forwardedFor.split(',')[0].trim();
        }
        // Check other common proxy headers
        else {
            const realIp = req.headers.get("x-real-ip");
            const cfConnectingIp = req.headers.get("cf-connecting-ip"); // Cloudflare
            const azureClientIp = req.headers.get("x-azure-clientip"); // Azure
            
            if (cfConnectingIp && cfConnectingIp.trim() !== "") {
                clientIp = cfConnectingIp.trim();
            } else if (azureClientIp && azureClientIp.trim() !== "") {
                clientIp = azureClientIp.trim();
            } else if (realIp && realIp.trim() !== "") {
                clientIp = realIp.trim();
            } else {
                // No valid IP found in headers, check for localhost development
                return "127.0.0.1"; // Default for local development
            }
        }
    }
    
    // Clean up IP address (remove port if present)
    if (clientIp !== "unknown" && clientIp.includes(':')) {
        // Handle IPv6 format and port removal
        if (clientIp.startsWith('[') && clientIp.includes(']:')) {
            clientIp = clientIp.substring(1, clientIp.indexOf(']:'));
        } else if (!clientIp.includes('::')) {
            // IPv4 with port
            clientIp = clientIp.split(':')[0];
        }
    }
    
    console.log(`[WS IP Detection] Client IP: ${clientIp} (from headers: x-forwarded-for: ${req.headers.get("x-forwarded-for")}, x-real-ip: ${req.headers.get("x-real-ip")}, cf-connecting-ip: ${req.headers.get("cf-connecting-ip")})`);
    
    return clientIp === "unknown" ? undefined : clientIp;
}

// Authentication handler
async function handleAuthentication(
    connection: Connection,
    message: AuthMessage
) {
    try {
        // Prevent rapid authentication attempts
        const now = Date.now();
        const authKey = `${connection.id}-${message.token}`;
        const lastAuth = pendingAuthentications.get(authKey);
        if (lastAuth && now - lastAuth < 2000) {
            // 2 second debounce per connection
            console.log(
                `Ignoring rapid authentication attempt for connection: ${connection.id}`
            );
            return;
        }
        pendingAuthentications.set(authKey, now);

        // Get the auth server URL based on environment
        const authServerUrl =
            Deno.env.get("DENO_ENV") === "production"
                ? Deno.env.get("PRODUCTION_AUTH_SERVER_URL") || "https://api.dhaniverse.in"
                : Deno.env.get("AUTH_SERVER_URL") || "http://localhost:8000";

        console.log(`Validating token with auth server: ${authServerUrl}`);

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
        const gameUsername = message.gameUsername || data.gameUsername;
        const email: string | undefined = data.email?.toLowerCase();
        const ip = connection.ip; // Use IP stored on connection

        // Store email on connection for ban checking
        connection.email = email;

        if (await isBanned({ email, ip })) {
            connection.socket.send(JSON.stringify({ type: 'banned', reason: 'Access denied' }));
            connection.socket.close(4403, 'banned');
            return;
        }

        // Check if this connection is already authenticated for this user
        if (connection.authenticated && connection.userId === userId) {
            console.log(
                `User ${gameUsername} already authenticated on this connection`
            );
            return;
        }

        // Check for existing connection with this user ID
        const existingConnectionId = userConnections.get(userId);
        if (existingConnectionId && existingConnectionId !== connection.id) {
            const existingConnection = connections.get(existingConnectionId);
            if (
                existingConnection &&
                existingConnection.socket.readyState === WebSocket.OPEN
            ) {
                // Close the existing connection gracefully and replace with new one
                existingConnection.socket.close(
                    1000,
                    "Replaced by newer connection"
                );
                connections.delete(existingConnectionId);
                console.log(
                    `Replaced existing connection for user ${userId} (${gameUsername})`
                );
            }
            // Clean up the mapping
            userConnections.delete(userId);
        }

        // Update connection with authenticated user info
        connection.authenticated = true;
        connection.username = gameUsername;
        connection.userId = userId;
        // Persist selected skin (default to C2 if not provided)
        connection.skin = message.skin && ["C1","C2","C3","C4"].includes(message.skin)
            ? message.skin
            : (connection.skin || "C2");

        // Track this connection for the user
        userConnections.set(userId, connection.id);

        // Add to connectionsByUserId for better cleanup
        if (!connectionsByUserId.has(userId)) {
            connectionsByUserId.set(userId, new Set());
        }
        connectionsByUserId.get(userId)?.add(connection.id);

        // Clean up any stale connections for this user
        cleanupStaleConnectionsForUser(userId, connection.id);

        // Clean up the pending authentication
        pendingAuthentications.delete(authKey);

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
            skin: conn.skin || "C2",
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
                skin: connection.skin || "C2",
            },
        });

        // Broadcast updated online users count
        broadcastOnlineUsersCount();

    console.log(`User authenticated: ${connection.username} (${connection.id}) - Online users: ${getOnlineUsersCount()}`);
    updateIpLog({ userId, email, ip });
    logSession({ userId, username: gameUsername, email, ip, event: 'join', timestamp: new Date(), position: { x: connection.position.x, y: connection.position.y }, skin: connection.skin });
    upsertActivePlayer({ userId, username: gameUsername, email, position: { x: connection.position.x, y: connection.position.y }, animation: connection.animation, skin: connection.skin, updatedAt: new Date() });
    connection.lastMovementTime = Date.now();
    // Notify admin monitors with enhanced data
    sendToAdmins({ 
        type:'adminPlayerJoin', 
        connectionId: connection.id, 
        userId, 
        username: gameUsername, 
        email, 
        ip, 
        x: connection.position.x, 
        y: connection.position.y, 
        animation: connection.animation, 
        skin: connection.skin,
        timestamp: Date.now(),
        lastActivity: connection.lastActivity,
        authenticated: true
    });
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

    // Stricter rate limiting for position updates (max 5 updates per second)
    const now = Date.now();
    if (!connection.lastUpdateTime) {
        connection.lastUpdateTime = 0;
    }

    if (now - connection.lastUpdateTime < 200) { // 200ms = 5 updates per second max
        // Store the update but don't broadcast immediately to prevent spam
        connection.pendingUpdate = {
            x: message.x,
            y: message.y,
            animation: message.animation,
        };
        return;
    }

    connection.lastUpdateTime = now;

    // Use pending update if available, otherwise use current message
    const updateData = connection.pendingUpdate || {
        x: message.x,
        y: message.y,
        animation: message.animation,
    };
    
    // Clear pending update
    connection.pendingUpdate = undefined;

    // Only update if position actually changed significantly
    const positionChanged = Math.abs(connection.position.x - updateData.x) > 2 || 
                           Math.abs(connection.position.y - updateData.y) > 2;
    const animationChanged = connection.animation !== updateData.animation;

    if (!positionChanged && !animationChanged) {
        return; // Skip update if nothing significant changed
    }

    // If client included a skin in the update payload, persist it on the connection
    if (message.skin && ["C1", "C2", "C3", "C4"].includes(message.skin)) {
        connection.skin = message.skin;
    }

    // Update player position
    connection.position.x = updateData.x;
    connection.position.y = updateData.y;
    if (updateData.animation) {
        connection.animation = updateData.animation;
    }
    // snapshot
    upsertActivePlayer({ userId: connection.userId, username: connection.username, position: { x: connection.position.x, y: connection.position.y }, animation: connection.animation, skin: connection.skin, updatedAt: new Date() });
    connection.lastMovementTime = Date.now();

    // Broadcast position update to other players
    broadcastToOthers(connection.id, {
        type: "playerUpdate",
        player: {
            id: connection.id,
            username: connection.username,
            x: connection.position.x,
            y: connection.position.y,
            animation: connection.animation,
            skin: connection.skin || "C2",
        },
    });
    sendToAdmins({ 
        type:'adminPlayerUpdate', 
        connectionId: connection.id, 
        userId: connection.userId, 
        username: connection.username, 
        x: connection.position.x, 
        y: connection.position.y, 
        animation: connection.animation, 
        skin: connection.skin,
        timestamp: Date.now(),
        lastActivity: connection.lastActivity,
        lastMovementTime: connection.lastMovementTime
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

    try {
        // Basic rate limiting for chat messages (prevent spam)
        const now = Date.now();
        if (!connection.lastChatTime) {
            connection.lastChatTime = 0;
        }

        if (now - connection.lastChatTime < 500) {
            // 500ms between messages
            connection.socket.send(
                JSON.stringify({
                    type: "error",
                    error: "rate_limited",
                    message: "Please wait before sending another message",
                })
            );
            return;
        }

        connection.lastChatTime = now;

        // Validate message content
        if (!message.message || message.message.trim().length === 0) {
            return;
        }

        // Limit message length
        const trimmedMessage = message.message.trim().substring(0, 500);

        // Generate a unique message ID
        const messageId = `chat-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        // Send acknowledgment to sender first to prevent client from retrying
        connection.socket.send(
            JSON.stringify({
                type: "chatAck",
                id: messageId,
                message: trimmedMessage,
            })
        );

        // Broadcast chat message to all players (including sender)
        // Include senderId and skin so clients can reliably render avatars/colors
        broadcast({
            type: "chat",
            id: messageId,
            senderId: connection.id,
            username: connection.username,
            message: trimmedMessage,
            skin: connection.skin || "C2",
        });
    sendToAdmins({ 
        type:'adminChat', 
        connectionId: connection.id, 
        userId: connection.userId, 
        username: connection.username, 
        message: trimmedMessage, 
        skin: connection.skin,
        timestamp: Date.now(),
        ip: connection.ip,
        email: connection.email
    });

        // Log chat message to database
        logChat({
            userId: connection.userId,
            username: connection.username,
            message: trimmedMessage,
            timestamp: new Date(),
        });

        console.log(
            `Chat message from ${connection.username}: ${trimmedMessage}`
        );
    } catch (error) {
        console.error(`Error handling chat message: ${error}`);
        // Send error to client but don't close connection
        connection.socket.send(
            JSON.stringify({
                type: "error",
                error: "chat_error",
                message: "Failed to process chat message",
            })
        );
    }
}

// Clean up stale connections for a user
function cleanupStaleConnectionsForUser(
    userId: string,
    currentConnectionId: string
) {
    const userConnectionIds = connectionsByUserId.get(userId);
    if (!userConnectionIds) return;

    // Close all other connections for this user
    userConnectionIds.forEach((connectionId) => {
        if (connectionId !== currentConnectionId) {
            const connection = connections.get(connectionId);
            if (connection && connection.socket.readyState === WebSocket.OPEN) {
                console.log(
                    `Closing stale connection ${connectionId} for user ${userId}`
                );
                connection.socket.close(
                    1000,
                    "User connected from another session"
                );
                connections.delete(connectionId);
            }
        }
    });

    // Reset the set to only contain the current connection
    connectionsByUserId.set(userId, new Set([currentConnectionId]));
}

// Disconnect handler
function handleDisconnect(connectionId: string) {
    const connection = connections.get(connectionId);
    if (connection) {
        // Remove from connections map
        connections.delete(connectionId);

        // Remove from userConnections map
        if (connection.userId) {
            // Remove from connectionsByUserId
            const userConnectionIds = connectionsByUserId.get(
                connection.userId
            );
            if (userConnectionIds) {
                userConnectionIds.delete(connectionId);
                if (userConnectionIds.size === 0) {
                    connectionsByUserId.delete(connection.userId);
                }
            }

            // If this was the active connection for the user, remove it
            if (userConnections.get(connection.userId) === connectionId) {
                userConnections.delete(connection.userId);
            }
        }

        // Notify other players if this was an authenticated connection
        if (connection.authenticated) {
            broadcastToOthers(connectionId, {
                type: "playerDisconnect",
                id: connectionId,
                username: connection.username,
            });
            sendToAdmins({ 
                type:'adminPlayerDisconnect', 
                connectionId, 
                userId: connection.userId, 
                username: connection.username,
                timestamp: Date.now(),
                reason: 'disconnect'
            });

            // Broadcast updated online users count after disconnect
            broadcastOnlineUsersCount();
        }

        // Remove from active players log
        removeActivePlayer(connection.userId);

        console.log(
            `Connection closed: ${connectionId}, remaining: ${
                connections.size
            } - Online users: ${getOnlineUsersCount()}`
        );
    }
}

// Broadcast message to all connections
function broadcast(message: Record<string, unknown>) {
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
function broadcastToOthers(senderId: string, message: Record<string, unknown>) {
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

// Get count of authenticated users
function getOnlineUsersCount(): number {
    let count = 0;
    connections.forEach((connection) => {
        if (
            connection.authenticated &&
            connection.socket.readyState === WebSocket.OPEN
        ) {
            count++;
        }
    });
    return count;
}

// Broadcast online users count to all authenticated connections
function broadcastOnlineUsersCount() {
    const onlineCount = getOnlineUsersCount();
    broadcast({
        type: "onlineUsersCount",
        count: onlineCount,
    });
    sendToAdmins({ type:'adminOnlineCount', count: onlineCount });
}

// Set up connection cleanup interval
setInterval(() => {
    const now = Date.now();

    // AFK detection (5 minutes without movement updates)
    const connectionsToClose = new Array<{ id: string; reason: string }>();
    
    connections.forEach((connection, id) => {
        if (connection.authenticated) {
            const lastMove = connection.lastMovementTime || connection.lastActivity;
            if (now - lastMove > 5 * 60 * 1000) { // 5 minutes
                connectionsToClose.push({ id, reason: 'AFK timeout (5 minutes)' });
                return; // skip further checks for this connection
            }
        }
        
        // General inactivity cleanup (10 minutes no any activity)
        if (now - connection.lastActivity > 10 * 60 * 1000) {
            connectionsToClose.push({ id, reason: 'Inactivity timeout (10 minutes)' });
        }
    });

    // Close connections that need to be closed
    connectionsToClose.forEach(({ id, reason }) => {
        const connection = connections.get(id);
        if (connection) {
            try {
                // Send kick message before closing
                if (connection.socket.readyState === WebSocket.OPEN) {
                    connection.socket.send(JSON.stringify({ 
                        type: 'afkKick', 
                        reason: `Kicked for ${reason}` 
                    }));
                }
                // Force close the connection
                connection.socket.close(4000, reason);
            } catch(_error) {
                console.error('Error closing connection:', _error);
            }
            console.log(`${reason} kick: ${id}`);
            handleDisconnect(id);
        }
    });

    // Clean up old pending authentications (older than 10 seconds)
    pendingAuthentications.forEach((timestamp, authKey) => {
        if (now - timestamp > 10 * 1000) {
            pendingAuthentications.delete(authKey);
        }
    });

    // Clean up zombie connections (connections that are closed but not properly removed)
    connections.forEach((connection, id) => {
        if (
            connection.socket.readyState === WebSocket.CLOSED ||
            connection.socket.readyState === WebSocket.CLOSING
        ) {
            console.log(`Cleaning up zombie connection: ${id}`);
            handleDisconnect(id);
        }
    });

    // Log connection stats (less frequently)
    if (Math.random() < 0.1) { // Only log 10% of the time
        console.log(
            `Connection stats: Total=${connections.size}, Authenticated=${getOnlineUsersCount()}`
        );
    }
}, 30 * 1000); // Check every 30 seconds instead of 60

// Send periodic ping to keep connections alive
setInterval(() => {
    connections.forEach((connection) => {
        if (
            connection.authenticated &&
            connection.socket.readyState === WebSocket.OPEN
        ) {
            // Only send ping if we haven't received activity recently
            if (Date.now() - connection.lastActivity > 45 * 1000) {
                connection.socket.send(JSON.stringify({ type: "ping" }));
                connection.lastPing = Date.now();
            }
        }
    });
}, 45 * 1000); // Send ping every 45 seconds instead of 30

// Real-time admin monitoring - send periodic updates to admin monitors
let lastAdminUpdate = 0;
let lastPlayerCount = 0;
setInterval(() => {
    // Only send updates if we have admin monitors and enough time has passed
    if (adminMonitors.size === 0) return;
    
    const currentPlayerCount = getOnlineUsersCount();
    const now = Date.now();
    
    // Only send update if player count changed or 60 seconds have passed
    if (currentPlayerCount !== lastPlayerCount || now - lastAdminUpdate > 60000) {
        const activePlayers: Array<{
            connectionId: string;
            userId?: string;
            username: string;
            email?: string;
            x: number;
            y: number;
            animation?: string;
            skin?: string;
            ip?: string;
            lastActivity: number;
            lastMovementTime?: number;
        }> = [];
        
        connections.forEach(c => { 
            if (c.authenticated) {
                activePlayers.push({ 
                    connectionId: c.id, 
                    userId: c.userId, 
                    username: c.username, 
                    email: c.email,
                    x: c.position.x, 
                    y: c.position.y, 
                    animation: c.animation, 
                    skin: c.skin,
                    ip: c.ip,
                    lastActivity: c.lastActivity,
                    lastMovementTime: c.lastMovementTime
                }); 
            }
        });
        
        sendToAdmins({
            type: 'adminLiveUpdate',
            players: activePlayers,
            online: currentPlayerCount,
            timestamp: now,
            serverUptime: Math.floor((now - SERVER_START_TIME) / 1000)
        });
        
        lastAdminUpdate = now;
        lastPlayerCount = currentPlayerCount;
    }
}, 30 * 1000); // Check every 30 seconds

// Periodic ban checking for active connections
setInterval(async () => {
    const connectionsToKick = new Array<{ id: string; reason: string; banInfo?: { reason: string; banType: string; expiresAt?: string } }>();
    
    for (const [id, connection] of connections) {
        if (connection.authenticated && (connection.email || connection.ip)) {
            const banned = await isBanned({ 
                email: connection.email, 
                ip: connection.ip 
            });
            
            if (banned) {
                // Try to get detailed ban information
                let banDetails = null;
                try {
                    const bans = col<BanRule>('bans');
                    if (bans) {
                        const banDoc = await bans.findOne({
                            active: true,
                            $or: [
                                { type: 'email', value: connection.email?.toLowerCase() },
                                { type: 'ip', value: connection.ip }
                            ]
                        });
                        if (banDoc) {
                            banDetails = {
                                reason: banDoc.reason || 'Banned during session',
                                banType: banDoc.type,
                                expiresAt: banDoc.expiresAt?.toISOString()
                            };
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch ban details:', error);
                }
                
                connectionsToKick.push({ 
                    id, 
                    reason: banDetails?.reason || 'Banned during session',
                    banInfo: banDetails || undefined
                });
            }
        }
    }
    
    // Kick banned users
    connectionsToKick.forEach(({ id, reason, banInfo }) => {
        const connection = connections.get(id);
        if (connection) {
            try {
                if (connection.socket.readyState === WebSocket.OPEN) {
                    const banMessage: { type: string; reason: string; banType?: string; expiresAt?: string } = { 
                        type: 'banned', 
                        reason: reason || 'You have been banned from the game'
                    };
                    
                    if (banInfo) {
                        banMessage.banType = banInfo.banType;
                        if (banInfo.expiresAt) {
                            banMessage.expiresAt = banInfo.expiresAt;
                        }
                    }
                    
                    connection.socket.send(JSON.stringify(banMessage));
                }
                connection.socket.close(4403, 'banned');
            } catch(_error) {
                console.error('Error banning connection:', _error);
            }
            console.log(`Banned during session: ${id} - ${reason}`);
            handleDisconnect(id);
        }
    });
}, 60 * 1000); // Check for bans every minute

console.log(`✅ WebSocket server listening on port ${PORT}`);

// Start the server
Deno.serve({
    port: PORT,
    handler: (req: Request) => {
        const url = new URL(req.url);

        // Handle CORS preflight requests
        if (req.method === "OPTIONS") {
            const origin = req.headers.get("Origin");
            if (
                origin &&
                (ALLOWED_ORIGINS.includes(origin) ||
                    Deno.env.get("DENO_ENV") === "development")
            ) {
                return new Response(null, {
                    status: 204,
                    headers: {
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers":
                            "Content-Type, Authorization, Upgrade, Connection",
                        "Access-Control-Allow-Credentials": "true",
                    },
                });
            }
            return new Response(null, { status: 204 });
        }

        // Handle health check endpoint
        if (url.pathname === "/health") {
            return new Response(
                JSON.stringify({
                    status: "ok",
                    connections: connections.size,
                    uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000), // in seconds
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Handle info endpoint
        if (url.pathname === "/info") {
            return new Response(
                JSON.stringify({
                    status: "ok",
                    connections: connections.size,
                    environment: Deno.env.get("DENO_ENV") || "development",
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Handle online users count endpoint
        if (url.pathname === "/online") {
            return new Response(
                JSON.stringify({
                    status: "ok",
                    onlineUsers: getOnlineUsersCount(),
                    timestamp: Date.now(),
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                    },
                }
            );
        }

        // Force kick endpoint (admin)
        if (url.pathname === '/admin/kick' && req.method === 'POST') {
            return (async () => {
                const auth = req.headers.get('authorization') || '';
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
                const admin = await validateAdminToken(token);
                if (!admin) {
                    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
                try {
                    const body = await req.json();
                    const userId = body.userId as string | undefined;
                    const email = body.email as string | undefined;
                    const reason = body.reason || 'Force disconnect by admin';
                    
                    if (!userId && !email) {
                        return new Response(JSON.stringify({ error:'missing userId or email' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                    }
                    
                    // Find connections for this user
                    let kicked = 0;
                    const connectionsToKick = new Array<string>();
                    
                    connections.forEach((c, id) => {
                        if ((userId && c.userId === userId) || (email && c.email === email)) {
                            connectionsToKick.push(id);
                        }
                    });
                    
                    // Kick each connection
                    connectionsToKick.forEach(id => {
                        const c = connections.get(id);
                        if (c) {
                            try { 
                                if (c.socket.readyState === WebSocket.OPEN) {
                                    c.socket.send(JSON.stringify({ type:'forceKick', reason })); 
                                }
                                c.socket.close(4001, 'force_kick');
                            } catch(_error) {
                                console.error('Error force kicking connection:', _error);
                            }
                            handleDisconnect(id);
                            kicked++;
                        }
                    });
                    
                    // Notify admins of kick action
                    sendToAdmins({
                        type: 'adminAction',
                        action: 'kick',
                        target: userId || email,
                        reason,
                        kicked,
                        timestamp: Date.now()
                    });
                    
                    return new Response(JSON.stringify({ status:'ok', kicked }), { status: 200, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                } catch(_error) {
                    return new Response(JSON.stringify({ error:'bad_request' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
            })();
        }

        // Admin announce endpoint
        if (url.pathname === '/admin/announce' && req.method === 'POST') {
            return (async () => {
                const auth = req.headers.get('authorization') || '';
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
                const admin = await validateAdminToken(token);
                if (!admin) {
                    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
                try {
                    const body = await req.json();
                    const message = body.message as string;
                    if (!message?.trim()) {
                        return new Response(JSON.stringify({ error:'missing message' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                    }
                    
                    // Broadcast announcement to all connected players
                    broadcast({
                        type: 'announcement',
                        message: message.trim(),
                        timestamp: Date.now(),
                        from: 'Admin'
                    });
                    
                    // Notify admins of announcement
                    sendToAdmins({
                        type: 'adminAction',
                        action: 'announce',
                        message: message.trim(),
                        timestamp: Date.now()
                    });
                    
                    return new Response(JSON.stringify({ status:'ok', broadcasted: getOnlineUsersCount() }), { status: 200, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                } catch(_error) {
                    return new Response(JSON.stringify({ error:'bad_request' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
            })();
        }

        // Admin ban endpoint - for real-time enforcement
        if (url.pathname === '/admin/ban' && req.method === 'POST') {
            return (async () => {
                const auth = req.headers.get('authorization') || '';
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
                const admin = await validateAdminToken(token);
                if (!admin) {
                    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
                try {
                    const body = await req.json();
                    const { type, value, reason, expiresAt } = body;
                    if (!type || !value) {
                        return new Response(JSON.stringify({ error:'missing type or value' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                    }
                    
                    // Find and kick matching connections immediately
                    let kicked = 0;
                    const connectionsToKick = new Array<string>();
                    
                    connections.forEach((c, id) => {
                        if (type === 'email' && c.email === value.toLowerCase()) {
                            connectionsToKick.push(id);
                        } else if (type === 'ip' && c.ip === value) {
                            connectionsToKick.push(id);
                        }
                    });
                    
                    // Kick each connection
                    const kickReason = reason || 'Banned by admin';
                    connectionsToKick.forEach(id => {
                        const c = connections.get(id);
                        if (c) {
                            try { 
                                if (c.socket.readyState === WebSocket.OPEN) {
                                    const banMessage: { type: string; reason: string; banType: string; expiresAt?: string } = { 
                                        type:'banned', 
                                        reason: kickReason,
                                        banType: type 
                                    };
                                    
                                    // Include expiration time if it's a temporary ban
                                    if (expiresAt) {
                                        banMessage.expiresAt = expiresAt;
                                    }
                                    
                                    c.socket.send(JSON.stringify(banMessage)); 
                                }
                                c.socket.close(4002, 'banned');
                            } catch(_error) {
                                console.error('Error banning connection:', _error);
                            }
                            handleDisconnect(id);
                            kicked++;
                        }
                    });
                    
                    // Notify admins of ban action
                    sendToAdmins({
                        type: 'adminAction',
                        action: 'ban',
                        banType: type,
                        target: value,
                        reason: kickReason,
                        kicked,
                        timestamp: Date.now()
                    });
                    
                    return new Response(JSON.stringify({ status:'ok', banned: value, kicked }), { status: 200, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                } catch(_error) {
                    return new Response(JSON.stringify({ error:'bad_request' }), { status: 400, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
                }
            })();
        }

        // Admin monitor websocket feed
        if (url.pathname === '/admin-feed') {
            const upgrade = req.headers.get('upgrade');
            const connectionHeader = req.headers.get('connection');
            if (upgrade !== 'websocket' || !connectionHeader?.toLowerCase().includes('upgrade')) {
                return new Response('Expected WebSocket upgrade', { status: 400 });
            }
            // Token from query (since custom headers are harder on some clients)
            const token = url.searchParams.get('token') || undefined;
            return (async () => {
                const admin = await validateAdminToken(token);
                if (!admin) return new Response('Forbidden', { status: 403 });
                try {
                    const { socket, response } = Deno.upgradeWebSocket(req);
                    adminMonitors.add(socket);
                    console.log('[admin-feed] monitor connected, total:', adminMonitors.size);
                    // Send snapshot with proper types
                    const players: Array<{
                        connectionId: string;
                        userId?: string;
                        username: string;
                        email?: string;
                        x: number;
                        y: number;
                        animation?: string;
                        skin?: string;
                        ip?: string;
                        lastActivity: number;
                        lastMovementTime?: number;
                    }> = [];
                    
                    connections.forEach(c => { 
                        if (c.authenticated) {
                            players.push({ 
                                connectionId: c.id, 
                                userId: c.userId, 
                                username: c.username, 
                                email: c.email,
                                x: c.position.x, 
                                y: c.position.y, 
                                animation: c.animation, 
                                skin: c.skin,
                                ip: c.ip,
                                lastActivity: c.lastActivity,
                                lastMovementTime: c.lastMovementTime
                            }); 
                        }
                    });
                    
                    try { 
                        socket.send(JSON.stringify({ 
                            type:'adminSnapshot', 
                            players, 
                            online: getOnlineUsersCount(),
                            timestamp: Date.now()
                        })); 
                    } catch(_error) {
                        console.error('Failed to send admin snapshot:', _error);
                    }
                    socket.onclose = () => { adminMonitors.delete(socket); console.log('[admin-feed] monitor disconnected'); };
                    socket.onerror = () => { adminMonitors.delete(socket); };
                    return response;
                } catch(e) {
                    console.error('admin-feed upgrade failed', e);
                    return new Response('Upgrade failed', { status: 400 });
                }
            })();
        }

        // Check if this is a WebSocket upgrade request
        const upgrade = req.headers.get("upgrade");
        const connection = req.headers.get("connection");

        if (
            upgrade !== "websocket" ||
            !connection?.toLowerCase().includes("upgrade")
        ) {
            return new Response(
                "WebSocket endpoint - use WebSocket connection",
                {
                    status: 400,
                    headers: {
                        "Content-Type": "text/plain",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Handle WebSocket upgrade
        try {
            const { socket, response } = Deno.upgradeWebSocket(req);
            const connectionId = crypto.randomUUID();
            
            // Extract IP address from request
            const clientIp = extractIpFromRequest(req);

            // Create a new connection
            const connection: Connection = {
                id: connectionId,
                username: "",
                socket,
                lastActivity: Date.now(),
                lastPing: Date.now(),
                authenticated: false,
                position: { x: 0, y: 0 },
                ip: clientIp, // Store IP on connection
            };

            connections.set(connectionId, connection);
            
            // Log IP access immediately when connection is established
            if (clientIp) {
                updateIpLog({ ip: clientIp });
            }
            
            console.log(
                `New connection: ${connectionId} from IP: ${clientIp || 'unknown'}, total connections: ${connections.size}`
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

                        case "ping":
                            // Respond to ping with pong
                            connection.lastPing = Date.now();
                            connection.socket.send(
                                JSON.stringify({ type: "pong" })
                            );
                            break;

                        default:
                            console.warn(
                                `Unknown message type: ${
                                    (message as { type: string }).type
                                }`
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
    },
});
