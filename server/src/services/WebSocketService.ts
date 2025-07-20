// Message type definitions
interface BaseMessage {
    type: string;
}

interface JoinMessage extends BaseMessage {
    type: "join";
    username: string;
}

interface AuthMessage extends BaseMessage {
    type: "authenticate";
    gameUsername?: string;
}

interface ChatMessage extends BaseMessage {
    type: "chat";
    message: string;
    username?: string;
}

interface PlayerMoveMessage extends BaseMessage {
    type: "player-move";
    position: {
        x: number;
        y: number;
    };
}

interface PlayerUpdateMessage extends BaseMessage {
    type: "update";
    x: number;
    y: number;
    animation?: string;
}

interface ReconnectMessage extends BaseMessage {
    type: "reconnect";
    token?: string;
}

type WebSocketMessage =
    | JoinMessage
    | AuthMessage
    | ChatMessage
    | PlayerMoveMessage
    | PlayerUpdateMessage
    | ReconnectMessage
    | BaseMessage;

// Enhanced WebSocket service for Dhaniverse
export class WebSocketService {
    private sockets = new Map<string, WebSocket>();
    private userSockets = new Map<string, string>(); // userId -> socketId
    private socketUsers = new Map<string, string>(); // socketId -> userId
    private socketUsernames = new Map<string, string>(); // socketId -> username
    private socketPositions = new Map<
        string,
        { x: number; y: number; animation?: string }
    >(); // socketId -> position
    private welcomeSent = new Set<string>();
    private ipConnections = new Map<string, Set<string>>(); // IP -> socketIds
    private pendingMessages = new Map<string, Array<Record<string, unknown>>>(); // socketId -> pending messages

    constructor() {
        console.log("🔌 WebSocket service initialized");
    }

    private generateUUID(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    }

    handleConnection(
        socket: WebSocket,
        userId?: string,
        ip: string = "unknown"
    ) {
        const socketId = this.generateUUID();
        console.log(`🔗 New connection: ${socketId} from IP: ${ip}`);

        // Manage IP-based connections
        if (!this.ipConnections.has(ip)) {
            this.ipConnections.set(ip, new Set());
        }
        const ipSockets = this.ipConnections.get(ip)!;

        // Handle existing connections
        this.handleExistingConnections(ip, socketId, ipSockets);

        // Store new connection
        this.sockets.set(socketId, socket);
        ipSockets.add(socketId);

        if (userId) {
            this.associateUser(userId, socketId);
        }

        // Setup socket handlers
        this.setupSocketHandlers(socket, socketId, ip);

        // Welcome message will be sent after authentication

        return socketId;
    }

    private handleExistingConnections(
        ip: string,
        newSocketId: string,
        ipSockets: Set<string>
    ) {
        if (ipSockets.size > 0) {
            console.log(
                `⚠️ Multiple connections from ${ip}, closing previous connections`
            );

            for (const existingSocketId of ipSockets) {
                // Skip new socket
                if (existingSocketId === newSocketId) continue;

                const existingSocket = this.sockets.get(existingSocketId);
                if (existingSocket?.readyState === WebSocket.OPEN) {
                    try {
                        existingSocket.send(
                            JSON.stringify({
                                type: "connection-replaced",
                                message:
                                    "Your connection was replaced by a new one",
                            })
                        );
                        existingSocket.close(
                            1000,
                            "Replaced by newer connection"
                        );
                    } catch (e) {
                        console.error("Error closing previous connection:", e);
                    }
                }
                this.cleanupSocket(existingSocketId);
            }
            ipSockets.clear();
        }
    }

    private associateUser(userId: string, socketId: string) {
        // Disconnect previous session for this user
        const existingSocketId = this.userSockets.get(userId);
        if (existingSocketId && existingSocketId !== socketId) {
            const existingSocket = this.sockets.get(existingSocketId);
            if (existingSocket?.readyState === WebSocket.OPEN) {
                existingSocket.close(1000, "Replaced by newer session");
            }
            this.cleanupSocket(existingSocketId);
        }

        this.userSockets.set(userId, socketId);
        this.socketUsers.set(socketId, userId);
        console.log(`👤 Associated user ${userId} with socket ${socketId}`);
    }

    private setupSocketHandlers(
        socket: WebSocket,
        socketId: string,
        ip: string
    ) {
        socket.onopen = () => {
            console.log(`✅ WebSocket opened: ${socketId}`);
            this.sendToSocket(socketId, {
                type: "connection",
                message: "Connected to Dhaniverse server",
                socketId,
                ip,
            });

            // Send any pending messages
            const pending = this.pendingMessages.get(socketId);
            if (pending && pending.length > 0) {
                pending.forEach((msg) => this.sendToSocket(socketId, msg));
                this.pendingMessages.delete(socketId);
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(socketId, data);
            } catch (error) {
                console.error("❌ Error parsing message:", error);
                this.sendToSocket(socketId, {
                    type: "error",
                    message: "Invalid message format",
                });
            }
        };

        socket.onclose = () => {
            console.log(`🔌 WebSocket closed: ${socketId}`);
            this.handleDisconnect(socketId);
        };

        socket.onerror = (error) => {
            console.error(`❌ WebSocket error for ${socketId}:`, error);
            this.sendToSocket(socketId, {
                type: "error",
                message: "Connection error occurred",
            });
        };
    }

    private sendWelcomeMessage(socketId: string) {
        if (!this.welcomeSent.has(socketId)) {
            this.welcomeSent.add(socketId);

            // Send welcome message with a small delay to ensure it appears after join message
            setTimeout(() => {
                this.sendToSocket(socketId, {
                    type: "chat",
                    id: `system-welcome-${Date.now()}`,
                    username: "System",
                    message:
                        "Welcome to Dhaniverse! Press / to chat to communicate with other players.",
                    timestamp: Date.now(),
                });
            }, 500);
        }
    }

    private queueMessage(socketId: string, message: Record<string, unknown>) {
        if (!this.pendingMessages.has(socketId)) {
            this.pendingMessages.set(socketId, []);
        }
        this.pendingMessages.get(socketId)!.push(message);
    }

    private handleMessage(socketId: string, data: unknown) {
        if (!data || typeof data !== "object") {
            console.error("Invalid message format");
            return;
        }

        const message = data as WebSocketMessage;
        // Only log non-update messages to reduce console spam
        if (message.type !== "update") {
            console.log(`📨 Message from ${socketId}:`, message.type, message);
        }

        switch (message.type) {
            case "join":
                this.handleJoin(socketId, message as JoinMessage);
                break;

            case "authenticate":
                this.handleAuth(socketId, message as AuthMessage);
                break;

            case "chat":
                this.handleChat(socketId, message as ChatMessage);
                break;

            case "player-move":
                this.handlePlayerMove(socketId, message as PlayerMoveMessage);
                break;

            case "update":
                this.handlePlayerUpdate(
                    socketId,
                    message as PlayerUpdateMessage
                );
                break;

            case "reconnect":
                this.handleReconnect(socketId, message as ReconnectMessage);
                break;

            default:
                console.log(`🤷 Unknown message type: ${message.type}`);
                this.sendToSocket(socketId, {
                    type: "error",
                    message: `Unknown message type: ${message.type}`,
                });
        }
    }

    private handleJoin(socketId: string, data: JoinMessage) {
        if (!data.username || typeof data.username !== "string") {
            console.error("Invalid join message");
            return;
        }

        const username = data.username.trim();
        if (username.length === 0) return;

        // Check if username is already in use
        for (const [sId, existingUsername] of this.socketUsernames) {
            if (existingUsername === username && sId !== socketId) {
                this.sendToSocket(socketId, {
                    type: "error",
                    message: "Username is already taken",
                });
                return;
            }
        }

        this.socketUsernames.set(socketId, username);
        console.log(`👤 Set username ${username} for socket ${socketId}`);

        // Set default position for new player
        this.socketPositions.set(socketId, { x: 400, y: 300 });

        // Send player their own ID
        this.sendToSocket(socketId, {
            type: "connect",
            id: socketId,
        });

        // Send existing players to the new player
        const existingPlayers: Array<{
            id: string;
            username: string;
            x: number;
            y: number;
            animation?: string;
        }> = [];
        for (const [sId, existingUsername] of this.socketUsernames) {
            if (sId !== socketId) {
                const position = this.socketPositions.get(sId) || {
                    x: 400,
                    y: 300,
                };
                existingPlayers.push({
                    id: sId,
                    username: existingUsername,
                    x: position.x,
                    y: position.y,
                    animation: position.animation,
                });
            }
        }

        this.sendToSocket(socketId, {
            type: "players",
            players: existingPlayers,
        });

        // Notify other clients about the new player
        this.broadcast(
            {
                type: "playerJoined",
                player: {
                    id: socketId,
                    username,
                    x: 400, // Default position
                    y: 300, // Default position
                },
            },
            socketId
        );

        // Send system message to all clients including the new player
        this.broadcast({
            type: "chat",
            id: `system-join-${Date.now()}`,
            username: "System",
            message: `${username} joined`,
            timestamp: Date.now(),
        });
    }

    private handleAuth(socketId: string, data: AuthMessage) {
        if (data.gameUsername && typeof data.gameUsername === "string") {
            const username = data.gameUsername.trim();
            if (username.length === 0) return;

            // Check if username is already in use
            for (const [sId, existingUsername] of this.socketUsernames) {
                if (existingUsername === username && sId !== socketId) {
                    this.sendToSocket(socketId, {
                        type: "error",
                        message: "Username is already taken",
                    });
                    return;
                }
            }

            this.socketUsernames.set(socketId, username);
            console.log(`🔑 Authenticated socket ${socketId} as ${username}`);
            console.log(`Total authenticated users:`, this.socketUsernames.size);

            // Set default position for new player
            this.socketPositions.set(socketId, { x: 400, y: 300 });

            // Send player their own ID
            this.sendToSocket(socketId, {
                type: "connect",
                id: socketId,
            });

            // Send existing players to the new player
            const existingPlayers: Array<{
                id: string;
                username: string;
                x: number;
                y: number;
                animation?: string;
            }> = [];
            for (const [sId, existingUsername] of this.socketUsernames) {
                if (sId !== socketId) {
                    const position = this.socketPositions.get(sId) || {
                        x: 400,
                        y: 300,
                    };
                    existingPlayers.push({
                        id: sId,
                        username: existingUsername,
                        x: position.x,
                        y: position.y,
                        animation: position.animation,
                    });
                }
            }

            this.sendToSocket(socketId, {
                type: "players",
                players: existingPlayers,
            });

            // Notify other clients about the new player
            this.broadcast(
                {
                    type: "playerJoined",
                    player: {
                        id: socketId,
                        username,
                        x: 400, // Default position
                        y: 300, // Default position
                    },
                },
                socketId
            );

            // Send welcome message to the new player only
            this.sendWelcomeMessage(socketId);

            // Send system message to all clients including the new player
            this.broadcast({
                type: "chat",
                id: `system-join-${Date.now()}`,
                username: "System",
                message: `${username} joined`,
                timestamp: Date.now(),
            });

            console.log(`✅ Authentication complete for ${username} (${socketId})`);
        }
    }

    private handleChat(socketId: string, data: ChatMessage) {
        const storedUsername = this.socketUsernames.get(socketId);
        const username = storedUsername || data.username || "Player";
        const message = data.message?.toString()?.trim() || "";

        if (message.length === 0) return;

        // Debug logging
        if (!storedUsername) {
            console.warn(`⚠️ No stored username for socket ${socketId}, using fallback: ${username}`);
            console.log(`Available usernames:`, Array.from(this.socketUsernames.entries()));
            console.log(`Socket exists in sockets map:`, this.sockets.has(socketId));
        }

        const messageId = `msg-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        console.log(`💬 Chat from ${username}: ${message}`);

        this.broadcast({
            type: "chat",
            id: messageId,
            username,
            message,
            timestamp: Date.now(),
        });
    }

    private handlePlayerMove(socketId: string, data: PlayerMoveMessage) {
        const username = this.socketUsernames.get(socketId);
        if (!username) return;

        const position = data.position;
        if (
            !position ||
            typeof position.x !== "number" ||
            typeof position.y !== "number"
        ) {
            console.error("Invalid player position");
            return;
        }

        this.broadcast(
            {
                type: "player-position",
                username,
                position,
            },
            socketId
        );
    }

    private handlePlayerUpdate(socketId: string, data: PlayerUpdateMessage) {
        const username = this.socketUsernames.get(socketId);
        if (!username) return;

        // Validate position data
        if (typeof data.x !== "number" || typeof data.y !== "number") {
            console.error("Invalid player update data");
            return;
        }

        // Store the player's position
        this.socketPositions.set(socketId, {
            x: data.x,
            y: data.y,
            animation: data.animation,
        });

        // Broadcast the update to all other players immediately
        this.broadcast(
            {
                type: "playerUpdate",
                player: {
                    id: socketId,
                    username,
                    x: data.x,
                    y: data.y,
                    animation: data.animation,
                },
            },
            socketId
        );
        
        // Debug log for player updates (only occasionally to avoid spam)
        if (Math.random() < 0.01) {  // Log only 1% of updates to avoid console spam
            console.log(`Player update sent for ${username} at (${data.x}, ${data.y})`);
        }
    }

    private handleReconnect(socketId: string, _data: ReconnectMessage) {
        console.log(`🔄 Reconnection request from ${socketId}`);
        const userId = this.socketUsers.get(socketId);

        if (userId) {
            this.associateUser(userId, socketId);
            this.sendToSocket(socketId, {
                type: "reconnect-success",
                message: "Session restored",
            });
        } else {
            this.sendToSocket(socketId, {
                type: "error",
                message: "Reconnect failed: No user session",
            });
        }
    }

    private handleDisconnect(socketId: string) {
        const username = this.socketUsernames.get(socketId);
        const userId = this.socketUsers.get(socketId);

        // Cleanup all tracking
        this.cleanupSocket(socketId);

        // Notify other players
        if (username) {
            this.broadcast({
                type: "playerDisconnect",
                id: socketId,
                username,
            });

            this.broadcast({
                type: "chat",
                id: `system-leave-${Date.now()}`,
                username: "System",
                message: `${username} left`,
                timestamp: Date.now(),
            });
        }

        // Remove user mapping
        if (userId) {
            this.userSockets.delete(userId);
            this.socketUsers.delete(socketId);
        }
    }

    private cleanupSocket(socketId: string) {
        this.sockets.delete(socketId);
        this.welcomeSent.delete(socketId);
        this.socketUsernames.delete(socketId);
        this.socketPositions.delete(socketId);
        this.pendingMessages.delete(socketId);

        // Remove from IP tracking
        for (const [ip, sockets] of this.ipConnections) {
            if (sockets.delete(socketId)) {
                if (sockets.size === 0) {
                    this.ipConnections.delete(ip);
                }
                break;
            }
        }
    }

    sendToSocket(socketId: string, message: Record<string, unknown>) {
        const socket = this.sockets.get(socketId);
        if (!socket) return false;

        const messageStr = JSON.stringify(message);

        switch (socket.readyState) {
            case WebSocket.OPEN:
                try {
                    socket.send(messageStr);
                    return true;
                } catch (error) {
                    console.error(`❌ Error sending to ${socketId}:`, error);
                    return false;
                }

            case WebSocket.CONNECTING:
                this.queueMessage(socketId, message);
                return true;

            default:
                return false;
        }
    }

    broadcast(message: Record<string, unknown>, excludeSocketId?: string) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        this.sockets.forEach((socket, socketId) => {
            if (socketId === excludeSocketId) {
                skippedCount++;
                return;
            }

            try {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(messageStr);
                    sentCount++;
                } else if (socket.readyState === WebSocket.CONNECTING) {
                    this.queueMessage(socketId, message);
                    sentCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`Error broadcasting to ${socketId}:`, error);
                errorCount++;
            }
        });

        // Only log broadcast info for non-update messages to reduce console spam
        if (message.type !== "playerUpdate") {
            console.log(
                `📡 Broadcasted ${message.type} to ${sentCount} clients, ` +
                    `${skippedCount} skipped, ${errorCount} errors`
            );
        }
    }

    sendToUser(userId: string, message: Record<string, unknown>) {
        const socketId = this.userSockets.get(userId);
        if (!socketId) {
            console.warn(
                `⚠️ User ${userId} not found for message:`,
                message.type
            );
            return false;
        }
        return this.sendToSocket(socketId, message);
    }

    getConnectedUsers(): string[] {
        return Array.from(this.userSockets.keys());
    }

    getConnectionCount(): number {
        return this.sockets.size;
    }

    getUsernameBySocketId(socketId: string): string | undefined {
        return this.socketUsernames.get(socketId);
    }
}

export const webSocketService = new WebSocketService();
