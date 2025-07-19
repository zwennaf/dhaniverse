// Enhanced WebSocket service for Dhaniverse
export class WebSocketService {
    private sockets = new Map<string, WebSocket>();
    private userSockets = new Map<string, string>(); // userId -> socketId mapping
    private socketUsernames = new Map<string, string>(); // socketId -> username mapping
    private welcomeSent = new Set<string>(); // Track welcome messages
    private ipConnections = new Map<string, Set<string>>(); // IP -> Set of socketIds

    constructor() {
        console.log("🔌 WebSocket service initialized");
    }

    handleConnection(
        socket: WebSocket,
        userId?: string,
        ip: string = "unknown"
    ) {
        // Generate a unique ID for this connection
        const socketId = crypto.randomUUID();

        // Track connections by IP
        if (!this.ipConnections.has(ip)) {
            this.ipConnections.set(ip, new Set());
        }

        // Get existing connections for this IP
        const ipSockets = this.ipConnections.get(ip)!;

        // If there are existing connections from this IP, close them
        if (ipSockets.size > 0) {
            console.log(
                `⚠️ Multiple connections from IP ${ip}, closing previous connections`
            );
            for (const existingSocketId of ipSockets) {
                const existingSocket = this.sockets.get(existingSocketId);
                if (
                    existingSocket &&
                    existingSocket.readyState === WebSocket.OPEN
                ) {
                    // Send a message to the client before closing
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
                        // Ignore errors when closing
                    }
                }
                // Remove from tracking
                this.sockets.delete(existingSocketId);
                this.welcomeSent.delete(existingSocketId);
                this.socketUsernames.delete(existingSocketId);
            }
            // Clear the set
            ipSockets.clear();
        }

        // Add this socket to tracking
        this.sockets.set(socketId, socket);
        ipSockets.add(socketId);

        console.log(`🔗 New WebSocket connection: ${socketId} from IP: ${ip}`);

        // Send welcome message to the client - only once
        if (!this.welcomeSent.has(socketId)) {
            this.welcomeSent.add(socketId);
            setTimeout(() => {
                this.sendToSocket(socketId, {
                    type: "chat",
                    id: "system",
                    username: "System",
                    message: "Welcome to Dhaniverse! Type / to chat.",
                    timestamp: Date.now(),
                });
            }, 1000);
        }

        // Set up event handlers
        socket.onopen = () => {
            console.log(`✅ WebSocket opened: ${socketId}`);
            this.sendToSocket(socketId, {
                type: "connection",
                message: "Connected to Dhaniverse server",
                socketId,
            });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(socketId, data);
            } catch (error) {
                console.error("❌ Error parsing WebSocket message:", error);
            }
        };

        socket.onclose = () => {
            console.log(`🔌 WebSocket closed: ${socketId}`);

            // Clean up all tracking for this socket
            this.sockets.delete(socketId);
            this.welcomeSent.delete(socketId);
            this.socketUsernames.delete(socketId);

            // Remove from IP tracking
            for (const [ip, sockets] of this.ipConnections.entries()) {
                if (sockets.has(socketId)) {
                    sockets.delete(socketId);
                    if (sockets.size === 0) {
                        this.ipConnections.delete(ip);
                    }
                    break;
                }
            }

            // Remove user mapping if exists
            for (const [user, sock] of this.userSockets.entries()) {
                if (sock === socketId) {
                    this.userSockets.delete(user);
                    break;
                }
            }
        };

        socket.onerror = (error) => {
            console.error(`❌ WebSocket error for ${socketId}:`, error);
        };

        // Associate with user if provided
        if (userId) {
            this.userSockets.set(userId, socketId);
            console.log(`👤 Associated socket ${socketId} with user ${userId}`);
        }

        return socketId;
    }

    private handleMessage(socketId: string, data: any) {
        console.log(`📨 Message from ${socketId}:`, data);

        switch (data.type) {
            case "join":
                if (data.username) {
                    this.userSockets.set(data.username, socketId);
                    this.socketUsernames.set(socketId, data.username);
                    this.broadcast(
                        {
                            type: "player-joined",
                            username: data.username,
                            message: `${data.username} joined the game`,
                        },
                        socketId
                    );

                    // Send join message to chat
                    this.broadcast({
                        type: "chat",
                        id: "system",
                        username: "System",
                        message: `${data.username} joined the game`,
                        timestamp: Date.now(),
                    });
                }
                break;

            case "authenticate":
                if (data.gameUsername) {
                    this.socketUsernames.set(socketId, data.gameUsername);
                    console.log(
                        `👤 Associated socket ${socketId} with username ${data.gameUsername}`
                    );
                }
                break;

            case "chat":
                // Handle chat messages - username might not be in the message if using newer client
                const username =
                    data.username ||
                    this.getUsernameBySocketId(socketId) ||
                    "Player";
                
                if (data.message) {
                    // Create a unique message ID
                    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Log the chat message
                    console.log(`💬 Chat from ${username}: ${data.message}`);
                    
                    // Broadcast to all clients including sender (for confirmation)
                    this.broadcast({
                        type: "chat",
                        id: messageId,
                        username: username,
                        message: data.message,
                        timestamp: Date.now(),
                    });
                }
                break;

            case "player-move":
                if (data.position && data.username) {
                    this.broadcast(
                        {
                            type: "player-position",
                            username: data.username,
                            position: data.position,
                        },
                        socketId
                    );
                }
                break;

            case "update":
                // Handle player position updates
                // This is sent frequently, so we don't need to log it
                // Just ignore it for now - we'll implement multiplayer position updates later
                break;

            default:
                console.log(`🤷 Unknown message type: ${data.type}`);
        }
    }

    private sendToSocket(socketId: string, message: Record<string, unknown>) {
        const socket = this.sockets.get(socketId);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    broadcast(message: Record<string, unknown>, excludeSocketId?: string) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        let failCount = 0;

        // For chat messages, log more details
        if (message.type === "chat") {
            console.log(`📡 Broadcasting chat message from ${message.username}: ${message.message}`);
        }

        this.sockets.forEach((socket, socketId) => {
            if (socketId !== excludeSocketId) {
                if (socket.readyState === WebSocket.OPEN) {
                    try {
                        socket.send(messageStr);
                        sentCount++;
                    } catch (error) {
                        console.error(`Failed to send message to socket ${socketId}:`, error);
                        failCount++;
                    }
                } else {
                    // Socket not open, might need cleanup
                    if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
                        console.log(`Skipping closed socket ${socketId}`);
                    }
                }
            }
        });

        console.log(
            `📡 Broadcast ${message.type} to ${sentCount} clients (${failCount} failed)`
        );
    }

    sendToUser(userId: string, message: Record<string, unknown>) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.sendToSocket(socketId, message);
            return true;
        }
        console.warn(`⚠️  User ${userId} not found for message:`, message.type);
        return false;
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
