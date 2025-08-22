import { load } from "https://deno.land/std@0.217.0/dotenv/mod.ts";

// Load environment variables
await load({ export: true });

const PORT = parseInt(Deno.env.get("PORT") || "8000");
// JWT secret is used by the auth server for token validation
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

        console.log(
            `User authenticated: ${connection.username} (${
                connection.id
            }) - Online users: ${getOnlineUsersCount()}`
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

    // Update player position
    connection.position.x = updateData.x;
    connection.position.y = updateData.y;
    if (updateData.animation) {
        connection.animation = updateData.animation;
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
        broadcast({
            type: "chat",
            id: messageId,
            username: connection.username,
            message: trimmedMessage,
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

            // Broadcast updated online users count after disconnect
            broadcastOnlineUsersCount();
        }

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
}

// Set up connection cleanup interval
setInterval(() => {
    const now = Date.now();

    // Clean up inactive connections (reduced timeout to 3 minutes)
    connections.forEach((connection, id) => {
        if (now - connection.lastActivity > 3 * 60 * 1000) {
            console.log(`Closing inactive connection: ${id}`);
            connection.socket.close(
                1000,
                "Connection timeout due to inactivity"
            );
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

            // Create a new connection
            const connection: Connection = {
                id: connectionId,
                username: "",
                socket,
                lastActivity: Date.now(),
                lastPing: Date.now(),
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
