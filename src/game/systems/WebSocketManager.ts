import { GameObjects } from "phaser";
import { Player } from "../entities/Player.ts";
import { Constants } from "../utils/Constants.ts";
import { MainGameScene } from "../scenes/MainScene.ts";
import { ConnectionState, ConnectionError } from "../utils/ConnectionTypes";

interface PlayerData {
    id: string;
    username: string;
    x: number;
    y: number;
    animation?: string;
}

interface OtherPlayer {
    sprite: GameObjects.Sprite;
    nameText: GameObjects.Text;
    targetX?: number;
    targetY?: number;
    lastUpdate: number;
}

/**
 * Connection result interface
 */
interface ConnectionResult {
    success: boolean;
    error?: string;
    errorMessage?: string;
}

// Define server message types
interface ServerMessageBase {
    type: string;
}

interface ConnectMessage extends ServerMessageBase {
    type: "connect";
    id: string;
}

interface PlayersMessage extends ServerMessageBase {
    type: "players";
    players: PlayerData[];
}

interface PlayerJoinedMessage extends ServerMessageBase {
    type: "playerJoined";
    player: PlayerData;
}

interface PlayerUpdateMessage extends ServerMessageBase {
    type: "playerUpdate";
    player: PlayerData;
}

interface PlayerDisconnectMessage extends ServerMessageBase {
    type: "playerDisconnect";
    id: string;
    username: string;
}

// Define chat message type
interface ChatMessage extends ServerMessageBase {
    type: "chat";
    id: string;
    username: string;
    message: string;
}

// Extend ServerMessage union to include ChatMessage
type ServerMessage =
    | ConnectMessage
    | PlayersMessage
    | PlayerJoinedMessage
    | PlayerUpdateMessage
    | PlayerDisconnectMessage
    | ChatMessage;

// Message priority levels
enum MessagePriority {
    HIGH = "high",
    NORMAL = "normal",
    LOW = "low",
}

// Message queue item interface
interface QueuedMessage {
    id: string;
    type: string;
    payload: any;
    priority: MessagePriority;
    timestamp: number;
    attempts: number;
    maxAttempts: number;
}

export class WebSocketManager {
    private scene: MainGameScene;
    private player: Player;
    private ws: WebSocket | null = null;
    private playerId: string | null = null;
    private otherPlayers: Map<string, OtherPlayer> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private lastUpdateTime: number = 0;
    private updateInterval: number = 33; // ms between position updates (30fps)
    private connected: boolean = false;
    private connectionStatusText: GameObjects.Text | null = null;
    private roomCode: string = "";
    private intentionalDisconnect: boolean = false;
    private connectionPromise: Promise<ConnectionResult> | null = null;
    private connectionTimeoutId: number | null = null;
    private connectionTimeout: number = 10000; // 10 seconds timeout

    // Message queuing system
    private messageQueue: QueuedMessage[] = [];
    private messageQueueProcessing: boolean = false;
    private messageQueueInterval: number | null = null;
    private messageQueueMaxSize: number = 100;
    private messageQueueFlushInterval: number = 100; // ms

    constructor(scene: MainGameScene, player: Player) {
        this.scene = scene;
        this.player = player;
        // Create connection status text that will appear if connection issues occur
        this.connectionStatusText = this.scene.add
            .text(this.scene.cameras.main.width / 2, 20, "Connecting...", {
                fontFamily: Constants.SYSTEM_TEXT_FONT,
                fontSize: Constants.SYSTEM_TEXT_SIZE,
                color: Constants.SYSTEM_TEXT_COLOR,
                backgroundColor: Constants.SYSTEM_TEXT_BACKGROUND,
                padding: Constants.SYSTEM_TEXT_PADDING,
            })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false);

        // Update position on resize
        this.scene.scale.on("resize", () => {
            if (this.connectionStatusText) {
                this.connectionStatusText.setPosition(
                    this.scene.cameras.main.width / 2,
                    20
                );
            }
        });
    }
    /**
     * Connects to the WebSocket server with priority
     * This method returns a promise that resolves when the connection is established or fails
     * @param username The player's username
     * @returns A promise that resolves with the connection result
     */
    async connectWithPriority(username: string): Promise<ConnectionResult> {
        // Clear any existing connection timeout
        if (this.connectionTimeoutId !== null) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
        }

        // Create a promise that resolves when connection is established or fails
        this.connectionPromise = new Promise<ConnectionResult>((resolve) => {
            // Set up event handlers for the connection
            const onOpen = () => {
                if (this.connectionTimeoutId !== null) {
                    clearTimeout(this.connectionTimeoutId);
                    this.connectionTimeoutId = null;
                }
                resolve({ success: true });
            };

            const onError = (error: Event) => {
                if (this.connectionTimeoutId !== null) {
                    clearTimeout(this.connectionTimeoutId);
                    this.connectionTimeoutId = null;
                }
                resolve({
                    success: false,
                    error: "connection_error",
                    errorMessage: "Failed to connect to server",
                });
            };

            const onClose = (event: CloseEvent) => {
                if (this.connectionTimeoutId !== null) {
                    clearTimeout(this.connectionTimeoutId);
                    this.connectionTimeoutId = null;
                }

                // Don't resolve if this was an intentional disconnect
                if (this.intentionalDisconnect) {
                    return;
                }

                resolve({
                    success: false,
                    error: "connection_closed",
                    errorMessage: `Connection closed: ${
                        event.reason || "Unknown reason"
                    }`,
                });
            };

            // Set connection timeout
            this.connectionTimeoutId = window.setTimeout(() => {
                // Remove event listeners
                if (this.ws) {
                    this.ws.removeEventListener("open", onOpen);
                    this.ws.removeEventListener("error", onError);
                    this.ws.removeEventListener("close", onClose);
                }

                resolve({
                    success: false,
                    error: "connection_timeout",
                    errorMessage: "Connection timed out",
                });
            }, this.connectionTimeout);

            // Add temporary event listeners
            if (this.ws) {
                this.ws.addEventListener("open", onOpen, { once: true });
                this.ws.addEventListener("error", onError, { once: true });
                this.ws.addEventListener("close", onClose, { once: true });
            }

            // Start the connection
            this.connect(username);
        });

        return this.connectionPromise;
    }

    /**
     * Connects to the WebSocket server
     * @param username The player's username
     */
    connect(username: string): void {
        // Don't connect if already connected
        if (
            this.connected &&
            this.ws &&
            this.ws.readyState === WebSocket.OPEN
        ) {
            console.log("Already connected, ignoring connect request");
            return;
        }

        // If connecting, wait for that to complete or fail
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log(
                "Already connecting, ignoring duplicate connect request"
            );
            return;
        }

        // Check if there's already a connection for this player in localStorage
        const connectionInfo = localStorage.getItem('dhaniverse_connection');
        if (connectionInfo) {
            try {
                const connectionData = JSON.parse(connectionInfo);
                const now = Date.now();
                // If connection is less than 5 seconds old, don't create a new one
                if (now - connectionData.timestamp < 5000) {
                    console.log("Another connection was recently established. Preventing duplicate connection.");
                    return;
                }
            } catch (e) {
                // Invalid JSON, ignore and continue
                console.warn("Invalid connection data in localStorage");
            }
        }

        // Close existing connection if it exists
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            console.log(
                "Closing existing WebSocket connection before creating new one"
            );
            this.intentionalDisconnect = true;

            try {
                this.ws.close(1000, "Intentional disconnect");
            } catch (e) {
                // Ignore errors when closing
            }

            this.ws = null;
        }
        
        // Store connection info in localStorage to prevent duplicates
        localStorage.setItem('dhaniverse_connection', JSON.stringify({
            timestamp: Date.now(),
            username: username
        }));

        // Reset intentional disconnect flag for new connection
        this.intentionalDisconnect = false;

        if (this.connectionStatusText) {
            this.connectionStatusText.setText("Connecting...").setVisible(true);
        }

        // Get room code from game registry
        this.roomCode = this.scene.game.registry.get("roomCode") || "";

        try {
            // Construct WebSocket URL with room code if available
            const wsUrl = this.roomCode
                ? `${Constants.WS_SERVER_URL}?room=${encodeURIComponent(
                      this.roomCode
                  )}`
                : Constants.WS_SERVER_URL;

            console.log(`Connecting to WebSocket server: ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;

                if (this.connectionStatusText) {
                    const statusText = this.roomCode
                        ? `Connected to room: ${this.roomCode}`
                        : "Connected";
                    this.connectionStatusText
                        .setText(statusText)
                        .setVisible(true);
                    // Hide after 2 seconds
                    this.scene.time.delayedCall(2000, () => {
                        if (this.connectionStatusText) {
                            this.connectionStatusText.setVisible(false);
                        }
                    });
                } // Send authentication message with token and username
                const token = localStorage.getItem("dhaniverse_token");
                if (!token) {
                    console.error("No authentication token found");
                    this.ws?.close();
                    return;
                }

                this.ws?.send(
                    JSON.stringify({
                        type: "authenticate",
                        token: token,
                        gameUsername: username,
                    })
                );
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: ServerMessage = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error("Error parsing message:", error);
                }
            };
            this.ws.onclose = (event) => {
                this.connected = false;

                // Don't reconnect if this was an intentional disconnect
                if (this.intentionalDisconnect) {
                    console.log(
                        "WebSocket closed intentionally, not reconnecting"
                    );
                    this.intentionalDisconnect = false; // Reset flag
                    return;
                }

                // Check close code - 1000 means normal closure
                if (event.code === 1000) {
                    console.log(
                        `WebSocket closed normally (code: ${event.code}), not reconnecting`
                    );
                    return;
                }

                // Handle connection replaced message (from our server)
                if (
                    event.code === 1000 &&
                    event.reason === "Replaced by newer connection"
                ) {
                    console.log("Connection was replaced by a newer one");
                    return;
                }

                console.log(
                    `WebSocket closed with code: ${event.code}, reason: ${event.reason}`
                );

                if (this.connectionStatusText) {
                    this.connectionStatusText
                        .setText("Connection lost. Reconnecting...")
                        .setVisible(true);
                }

                // Add a small delay before reconnecting to avoid rapid reconnection attempts
                setTimeout(() => {
                    this.handleReconnect(username);
                }, 1000);
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                if (this.connectionStatusText) {
                    this.connectionStatusText
                        .setText("Connection error. Reconnecting...")
                        .setVisible(true);
                }
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.handleReconnect(username);
        }
    }
    private handleServerMessage(data: ServerMessage): void {
        switch (data.type) {
            case "connect":
                this.playerId = data.id;
                console.log(`Received player ID: ${this.playerId}`);
                break;

            case "players":
                console.log(
                    `Received players list, my ID: ${this.playerId}, players:`,
                    data.players
                );
                this.handleExistingPlayers(data.players);
                break;

            case "playerJoined":
                console.log(`Player joined:`, data.player);
                this.handlePlayerJoined(data.player);
                break;

            case "playerUpdate":
                // Log occasionally to avoid spam
                if (Math.random() < 0.05) {
                    // Log only 5% of updates
                    console.log(`Received player update:`, data.player);
                }
                this.handlePlayerUpdate(data.player);
                break;

            case "playerDisconnect":
                this.handlePlayerDisconnect(data.id, data.username);
                break;

            case "chat":
                // Dispatch incoming chat messages to the UI
                console.log("Received chat message from server:", data);

                // Make sure we have all required fields
                if (!data.username || !data.message) {
                    console.warn("Received incomplete chat message:", data);
                    return;
                }

                // Dispatch the event with a unique ID
                window.dispatchEvent(
                    new CustomEvent("chat-message", {
                        detail: {
                            id:
                                data.id ||
                                `chat-${Date.now()}-${Math.random()
                                    .toString(36)
                                    .substr(2, 9)}`,
                            username: data.username,
                            message: data.message,
                        },
                    })
                );
                break;

            default:
                console.warn(
                    `Unknown message type: ${(data as ServerMessageBase).type}`
                );
        }
    }

    private handleExistingPlayers(players: PlayerData[]): void {
        players.forEach((playerData) => {
            if (playerData.id !== this.playerId) {
                this.createOtherPlayer(playerData);
            }
        });
    }

    private handlePlayerJoined(player: PlayerData): void {
        if (player.id !== this.playerId) {
            this.createOtherPlayer(player);
            console.log(`${player.username} joined the game`);
        }
    }

    private handlePlayerUpdate(player: PlayerData): void {
        if (player.id !== this.playerId) {
            this.updateOtherPlayer(player);
        }
    }

    private handlePlayerDisconnect(playerId: string, username: string): void {
        this.removeOtherPlayer(playerId);
        console.log(`${username} left the game`);
    }
    /**
     * Handles reconnection with exponential backoff and jitter
     * @param username The player's username
     */
    private handleReconnect(username: string): void {
        // Don't reconnect if already connected or reconnecting
        if (
            this.connected ||
            (this.ws && this.ws.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        // Make sure we don't have an existing connection
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            try {
                this.ws.close(1000, "Closing before reconnect");
            } catch (e) {
                // Ignore errors when closing
            }
            this.ws = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            // Calculate base delay with exponential backoff
            const baseDelay = Math.min(
                Constants.WS_RECONNECT_DELAY *
                    Math.pow(1.5, this.reconnectAttempts - 1),
                30000 // Max 30 seconds
            );

            // Add jitter to prevent thundering herd problem
            // Random value between 80% and 120% of the base delay
            const jitterFactor = 0.8 + Math.random() * 0.4;
            const delay = Math.floor(baseDelay * jitterFactor);

            console.log(
                `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
            );

            setTimeout(() => {
                if (
                    !this.connected &&
                    (!this.ws || this.ws.readyState === WebSocket.CLOSED)
                ) {
                    console.log(
                        `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`
                    );
                    this.connect(username);
                }
            }, delay);
        } else {
            if (this.connectionStatusText) {
                this.connectionStatusText
                    .setText(
                        "Could not connect to server. Please try again later."
                    )
                    .setVisible(true);
            }
            console.error("Max reconnect attempts reached");
        }
    }

    /**
     * Resets the reconnection state and attempts a fresh connection
     * @param username The player's username
     */
    public resetReconnectionState(username: string): void {
        // Reset reconnection attempts counter
        this.reconnectAttempts = 0;

        // Close any existing connection
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            this.intentionalDisconnect = true;
            try {
                this.ws.close(1000, "Resetting connection state");
            } catch (e) {
                // Ignore errors when closing
            }
            this.ws = null;
        }

        // Update UI
        if (this.connectionStatusText) {
            this.connectionStatusText
                .setText("Reconnecting...")
                .setVisible(true);
        }

        // Start a fresh connection
        setTimeout(() => {
            this.connect(username);
        }, 500);
    }

    update(): void {
        // Update other players' positions with interpolation
        const time = this.scene.time.now;
        this.otherPlayers.forEach((otherPlayer) => {
            if (
                otherPlayer.targetX !== undefined &&
                otherPlayer.targetY !== undefined
            ) {
                // Interpolate position for smoother movement
                // Use a higher interpolation factor for more responsive movement
                const interpolationFactor = 0.5; // Increased from 0.4 for more responsive movement

                otherPlayer.sprite.x = Phaser.Math.Linear(
                    otherPlayer.sprite.x,
                    otherPlayer.targetX,
                    interpolationFactor
                );

                otherPlayer.sprite.y = Phaser.Math.Linear(
                    otherPlayer.sprite.y,
                    otherPlayer.targetY,
                    interpolationFactor
                );

                // Update username text
                otherPlayer.nameText.x = otherPlayer.sprite.x;
                otherPlayer.nameText.y = otherPlayer.sprite.y - 50;
            }
        });

        // Send player position update to server
        if (time - this.lastUpdateTime > this.updateInterval) {
            this.lastUpdateTime = time;

            const currentPosition = this.player.getPosition();
            const lastSentPosition = this.player.getLastSentPosition();
            const currentAnimation = this.player.getCurrentAnimation();
            const lastSentAnimation = this.player.getLastSentAnimation();

            // Only send updates when position changes significantly or animation changes
            if (
                !lastSentPosition ||
                Math.abs(currentPosition.x - lastSentPosition.x) >
                    Constants.WS_POSITION_THRESHOLD ||
                Math.abs(currentPosition.y - lastSentPosition.y) >
                    Constants.WS_POSITION_THRESHOLD ||
                currentAnimation !== lastSentAnimation
            ) {
                // Queue position update with normal priority
                this.queueMessage(
                    "update",
                    {
                        x: currentPosition.x,
                        y: currentPosition.y,
                        animation: currentAnimation,
                    },
                    MessagePriority.NORMAL
                );

                // Update last sent values
                this.player.setLastSentPosition(currentPosition);
                if (currentAnimation) {
                    this.player.setLastSentAnimation(currentAnimation);
                }
            }
        }
    }

    private createOtherPlayer(playerData: PlayerData): void {
        // Check if this player already exists
        if (this.otherPlayers.has(playerData.id)) {
            console.log(
                `Player ${playerData.id} already exists, skipping creation`
            );
            return;
        }

        console.log(`Creating other player:`, playerData);

        const otherPlayer = this.scene.add.sprite(
            playerData.x,
            playerData.y,
            "character"
        );
        otherPlayer.setScale(5);

        console.log(
            `Created sprite for player ${playerData.username} at (${playerData.x}, ${playerData.y})`
        );
        // Add username text above player
        const nameText = this.scene.add
            .text(playerData.x, playerData.y - 50, playerData.username, {
                fontFamily: Constants.PLAYER_NAME_FONT,
                fontSize: Constants.PLAYER_NAME_SIZE,
                color: Constants.PLAYER_NAME_COLOR,
                align: "center",
                backgroundColor: Constants.PLAYER_NAME_BACKGROUND,
                padding: Constants.PLAYER_NAME_PADDING,
            })
            .setOrigin(0.5);

        this.otherPlayers.set(playerData.id, {
            sprite: otherPlayer,
            nameText,
            targetX: playerData.x,
            targetY: playerData.y,
            lastUpdate: this.scene.time.now,
        });

        // Add to game container
        const gameContainer = this.scene.getGameContainer();
        if (gameContainer) {
            gameContainer.add(otherPlayer);
            gameContainer.add(nameText);
            console.log(
                `Added player ${playerData.username} to game container`
            );
        } else {
            console.warn(
                `No game container found for player ${playerData.username}`
            );
        }

        // Set initial animation if provided
        if (playerData.animation) {
            otherPlayer.anims.play(playerData.animation);
        } else {
            otherPlayer.anims.play("idle-down");
        }
    }

    private updateOtherPlayer(playerData: PlayerData): void {
        const otherPlayer = this.otherPlayers.get(playerData.id);
        if (otherPlayer) {
            // Set target position for smooth interpolation
            otherPlayer.targetX = playerData.x;
            otherPlayer.targetY = playerData.y;
            otherPlayer.lastUpdate = this.scene.time.now;

            // Update animation immediately
            if (playerData.animation) {
                otherPlayer.sprite.anims.play(playerData.animation, true);
            }
        } else {
            // If player doesn't exist yet, create them
            console.log(
                `Creating player that was missing: ${playerData.id} (${playerData.username})`
            );
            this.createOtherPlayer(playerData);
        }
    }

    private removeOtherPlayer(playerId: string): void {
        const otherPlayer = this.otherPlayers.get(playerId);
        if (otherPlayer) {
            otherPlayer.nameText.destroy();
            otherPlayer.sprite.destroy();
            this.otherPlayers.delete(playerId);
        }
    }

    getConnectedPlayers(): number {
        // Count of other players plus this player
        return this.otherPlayers.size + 1;
    } // Cleanly close the WebSocket connection
    public disconnect(): void {
        if (this.ws) {
            this.intentionalDisconnect = true;
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.playerId = null;

            // Clear all other players from the map
            this.otherPlayers.forEach((otherPlayer) => {
                otherPlayer.sprite.destroy();
                otherPlayer.nameText.destroy();
            });
            this.otherPlayers.clear();

            console.log("WebSocket connection closed and all players cleared");
        }
    }

    /**
     * Queues a message to be sent to the server
     * @param type The message type
     * @param payload The message payload
     * @param priority The message priority
     * @param maxAttempts Maximum number of retry attempts
     * @returns The message ID
     */
    private queueMessage(
        type: string,
        payload: any,
        priority: MessagePriority = MessagePriority.NORMAL,
        maxAttempts: number = 3
    ): string {
        // Generate a unique message ID
        const messageId = `msg-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        // Create the queued message
        const queuedMessage: QueuedMessage = {
            id: messageId,
            type,
            payload,
            priority,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts,
        };

        // Add to queue
        this.messageQueue.push(queuedMessage);

        // Limit queue size by removing oldest low priority messages if needed
        if (this.messageQueue.length > this.messageQueueMaxSize) {
            // Find the oldest low priority message
            const oldestLowPriorityIndex = this.messageQueue.findIndex(
                (msg) => msg.priority === MessagePriority.LOW
            );

            if (oldestLowPriorityIndex >= 0) {
                // Remove the oldest low priority message
                this.messageQueue.splice(oldestLowPriorityIndex, 1);
            }
        }

        // Start processing the queue if not already processing
        if (!this.messageQueueProcessing) {
            this.startMessageQueueProcessing();
        }

        return messageId;
    }

    /**
     * Starts processing the message queue
     */
    private startMessageQueueProcessing(): void {
        if (this.messageQueueInterval !== null) {
            clearInterval(this.messageQueueInterval);
        }

        this.messageQueueProcessing = true;

        // Process queue at regular intervals
        this.messageQueueInterval = window.setInterval(() => {
            this.processMessageQueue();
        }, this.messageQueueFlushInterval);
    }

    /**
     * Processes the message queue
     */
    private processMessageQueue(): void {
        // Skip if not connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        // Sort queue by priority (high to low) and then by timestamp (oldest first)
        const sortedQueue = [...this.messageQueue].sort((a, b) => {
            // First sort by priority
            if (a.priority !== b.priority) {
                if (a.priority === MessagePriority.HIGH) return -1;
                if (b.priority === MessagePriority.HIGH) return 1;
                if (a.priority === MessagePriority.NORMAL) return -1;
                if (b.priority === MessagePriority.NORMAL) return 1;
            }

            // Then sort by timestamp (oldest first)
            return a.timestamp - b.timestamp;
        });

        // Process up to 10 messages at a time to avoid blocking
        const messagesToProcess = sortedQueue.slice(0, 10);

        // Process each message
        messagesToProcess.forEach((message) => {
            try {
                // Increment attempt counter
                message.attempts++;

                // Send the message
                this.ws?.send(
                    JSON.stringify({
                        id: message.id,
                        type: message.type,
                        ...message.payload,
                    })
                );

                // Remove from queue after successful send
                this.messageQueue = this.messageQueue.filter(
                    (msg) => msg.id !== message.id
                );
            } catch (error) {
                console.error(`Error sending message ${message.id}:`, error);

                // If max attempts reached, remove from queue
                if (message.attempts >= message.maxAttempts) {
                    console.warn(
                        `Message ${message.id} failed after ${message.attempts} attempts, removing from queue`
                    );
                    this.messageQueue = this.messageQueue.filter(
                        (msg) => msg.id !== message.id
                    );
                }
            }
        });

        // Stop processing if queue is empty
        if (this.messageQueue.length === 0) {
            this.stopMessageQueueProcessing();
        }
    }

    /**
     * Stops processing the message queue
     */
    private stopMessageQueueProcessing(): void {
        if (this.messageQueueInterval !== null) {
            clearInterval(this.messageQueueInterval);
            this.messageQueueInterval = null;
        }

        this.messageQueueProcessing = false;
    }

    /**
     * Sends a chat message
     * @param message The message to send
     */
    public sendChat(message: string): void {
        // Generate a unique message ID to prevent duplicates
        const messageId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Check if this message was recently sent (within last 2 seconds)
        const recentMessages = localStorage.getItem('dhaniverse_recent_chats');
        if (recentMessages) {
            try {
                const messages = JSON.parse(recentMessages);
                const now = Date.now();
                
                // Filter out messages older than 2 seconds
                const recentMessagesList = messages.filter((msg: any) => now - msg.timestamp < 2000);
                
                // Check if this message content was recently sent
                if (recentMessagesList.some((msg: any) => msg.content === message)) {
                    console.log("Duplicate chat message detected, ignoring");
                    return;
                }
                
                // Update recent messages list
                recentMessagesList.push({ content: message, timestamp: now, id: messageId });
                localStorage.setItem('dhaniverse_recent_chats', JSON.stringify(recentMessagesList));
            } catch (e) {
                // Invalid JSON, create new list
                localStorage.setItem('dhaniverse_recent_chats', JSON.stringify([
                    { content: message, timestamp: Date.now(), id: messageId }
                ]));
            }
        } else {
            // No recent messages, create new list
            localStorage.setItem('dhaniverse_recent_chats', JSON.stringify([
                { content: message, timestamp: Date.now(), id: messageId }
            ]));
        }
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.playerId) {
            // Queue the chat message with high priority and include the message ID
            this.queueMessage("chat", { message, id: messageId }, MessagePriority.HIGH);
        } else {
            // Queue the message anyway, it will be sent when connection is restored
            console.warn(
                "Cannot send chat immediately: not connected or not authenticated. Message queued."
            );
            this.queueMessage("chat", { message, id: messageId }, MessagePriority.HIGH);
        }
    }
}
