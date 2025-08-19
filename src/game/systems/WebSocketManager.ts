import { GameObjects } from "phaser";
import { Player } from "../entities/Player.ts";
import { Constants } from "../utils/Constants.ts";
import { FontUtils } from "../utils/FontUtils.ts";
import { MainGameScene } from "../scenes/MainScene.ts";
import { ensureCharacterAnimations } from "../utils/CharacterAnimations.ts";

interface PlayerData {
    id: string;
    username: string;
    x: number;
    y: number;
    animation?: string;
    skin?: string; // character skin id (C1..C4)
}

interface OtherPlayer {
    sprite: GameObjects.Sprite;
    nameText: GameObjects.Text;
    targetX: number;
    targetY: number;
    lastUpdate: number;
    currentAnimation?: string;
}

interface ConnectionResult {
    success: boolean;
    error?: string;
    errorMessage?: string;
}

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

interface ChatMessage extends ServerMessageBase {
    type: "chat";
    id: string;
    username: string;
    message: string;
}

interface OnlineUsersCountMessage extends ServerMessageBase {
    type: "onlineUsersCount";
    count: number;
}

type ServerMessage =
    | ConnectMessage
    | PlayersMessage
    | PlayerJoinedMessage
    | PlayerUpdateMessage
    | PlayerDisconnectMessage
    | ChatMessage
    | OnlineUsersCountMessage;

export class WebSocketManager {
    private scene: MainGameScene;
    private player: Player;
    private ws: WebSocket | null = null;
    private playerId: string | null = null;
    private otherPlayers: Map<string, OtherPlayer> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private lastUpdateTime: number = 0;
    private updateInterval: number = Constants.WS_UPDATE_RATE;
    private connected: boolean = false;
    private connectionStatusText: GameObjects.Text | null = null;
    private intentionalDisconnect: boolean = false;
    private connectionTimeout: number = 10000;
    private isConnecting: boolean = false;
    private lastPositionSent: { x: number; y: number } | null = null;
    private static globalConnectionLock: boolean = false; // Global lock to prevent multiple connections

    constructor(scene: MainGameScene, player: Player) {
        console.log("Creating new WebSocketManager instance");
        this.scene = scene;
        this.player = player;

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

        this.scene.scale.on("resize", () => {
            if (this.connectionStatusText) {
                this.connectionStatusText.setPosition(
                    this.scene.cameras.main.width / 2,
                    20
                );
            }
        });
    }

    async connectWithPriority(username: string): Promise<ConnectionResult> {
        return new Promise((resolve) => {
            // Check if already connected
            if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
                console.log("Already connected, resolving immediately");
                resolve({ success: true });
                return;
            }

            // Check if already connecting
            if (this.isConnecting) {
                console.log("Already connecting, waiting for result");
            }

            const timeout = setTimeout(() => {
                console.log("Connection timeout reached");
                cleanup();
                resolve({
                    success: false,
                    error: "connection_timeout",
                    errorMessage: "Connection timed out",
                });
            }, this.connectionTimeout);

            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener("websocket-connected", onConnect);
                window.removeEventListener("websocket-error", onError);
            };

            const onConnect = () => {
                console.log("Connection successful");
                cleanup();
                resolve({ success: true });
            };

            const onError = () => {
                console.log("Connection error");
                cleanup();
                resolve({
                    success: false,
                    error: "connection_error",
                    errorMessage: "Failed to connect to server",
                });
            };

            window.addEventListener("websocket-connected", onConnect);
            window.addEventListener("websocket-error", onError);

            // Only call connect if not already connecting
            if (!this.isConnecting) {
                this.connect(username);
            }
        });
    }

    connect(username: string): void {
        // Global lock to prevent multiple connections across all instances
        if (WebSocketManager.globalConnectionLock) {
            console.log("Global connection lock active, ignoring request");
            return;
        }

        // Prevent multiple connection attempts
        if (this.isConnecting) {
            console.log("Connection already in progress, ignoring request");
            return;
        }

        if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
            console.log("Already connected, ignoring request");
            return;
        }

        console.log("Starting WebSocket connection...");
        WebSocketManager.globalConnectionLock = true;
        this.isConnecting = true;
        this.intentionalDisconnect = false;

        // Clean up existing connection
        if (this.ws) {
            if (this.ws.readyState === WebSocket.CONNECTING) {
                console.log("Closing connecting WebSocket");
                this.ws.close();
            } else if (this.ws.readyState === WebSocket.OPEN) {
                console.log("Closing open WebSocket");
                this.ws.close(1000, "Reconnecting");
            }
            this.ws = null;
        }

        if (this.connectionStatusText) {
            this.connectionStatusText.setText("Connecting...").setVisible(true);
        }

        try {
            console.log(
                "Creating new WebSocket connection to:",
                Constants.WS_SERVER_URL
            );
            this.ws = new WebSocket(Constants.WS_SERVER_URL);

            this.ws.onopen = () => {
                console.log("WebSocket connection opened");
                this.connected = true;
                this.reconnectAttempts = 0;
                this.isConnecting = false;
                WebSocketManager.globalConnectionLock = false;

                if (this.connectionStatusText) {
                    this.connectionStatusText
                        .setText("Connected")
                        .setVisible(true);
                    this.scene.time.delayedCall(2000, () => {
                        this.connectionStatusText?.setVisible(false);
                    });
                }

                const token = localStorage.getItem("dhaniverse_token");
                if (token) {
                    // Include selected character skin only once during authentication
                    const skin = this.scene.registry.get("selectedCharacter") || "C2";
                    this.sendMessage("authenticate", {
                        token,
                        gameUsername: username,
                        skin,
                    });
                }

                window.dispatchEvent(new CustomEvent("websocket-connected"));
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
                console.log(
                    `WebSocket closed: code=${event.code}, reason=${event.reason}, intentional=${this.intentionalDisconnect}`
                );
                this.connected = false;
                this.isConnecting = false;

                // Don't reconnect if intentional or normal closure
                if (this.intentionalDisconnect) {
                    console.log("Intentional disconnect, not reconnecting");
                    return;
                }

                if (event.code === 1000 && event.reason === "Reconnecting") {
                    console.log(
                        "Normal reconnection, not triggering another reconnect"
                    );
                    return;
                }

                if (this.connectionStatusText) {
                    this.connectionStatusText
                        .setText("Reconnecting...")
                        .setVisible(true);
                }

                // Only reconnect after a delay and if not already reconnecting
                setTimeout(() => {
                    if (!this.connected && !this.isConnecting) {
                        this.handleReconnect(username);
                    }
                }, 2000);
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.isConnecting = false;
                WebSocketManager.globalConnectionLock = false;
                window.dispatchEvent(new CustomEvent("websocket-error"));
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.isConnecting = false;
            WebSocketManager.globalConnectionLock = false;
            // Only trigger reconnect if not already connected
            if (!this.connected) {
                setTimeout(() => this.handleReconnect(username), 2000);
            }
        }
    }

    private handleReconnect(username: string): void {
        // Prevent multiple reconnection attempts
        if (this.connected || this.isConnecting) {
            console.log("Skipping reconnect - already connected or connecting");
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log("Max reconnect attempts reached");
            this.connectionStatusText
                ?.setText("Connection failed. Please refresh.")
                .setVisible(true);
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        console.log(
            `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
        );

        setTimeout(() => {
            // Double-check state before reconnecting
            if (
                !this.connected &&
                !this.isConnecting &&
                !this.intentionalDisconnect
            ) {
                console.log(
                    `Executing reconnect attempt ${this.reconnectAttempts}`
                );
                this.connect(username);
            } else {
                console.log("Skipping scheduled reconnect - state changed");
            }
        }, delay);
    }

    public resetReconnectionState(username: string): void {
        console.log("Resetting reconnection state");
        this.reconnectAttempts = 0;
        this.intentionalDisconnect = true;
        this.connected = false;
        this.isConnecting = false;

        if (this.ws) {
            this.ws.close(1000, "Reset");
            this.ws = null;
        }

        // Wait a bit longer before reconnecting
        setTimeout(() => {
            if (!this.connected && !this.isConnecting) {
                this.connect(username);
            }
        }, 1000);
    }

    private sendMessage(type: string, payload: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type, ...payload }));
            } catch (error) {
                console.error("Failed to send message:", error);
            }
        }
    }

    update(): void {
        const time = this.scene.time.now;
        const dt = this.scene.game.loop.delta || 16.67;

        // Simple smooth easing for other players
        this.otherPlayers.forEach((otherPlayer) => {
            const dx = otherPlayer.targetX - otherPlayer.sprite.x;
            const dy = otherPlayer.targetY - otherPlayer.sprite.y;
            
            // Smooth easing factor - higher = faster, lower = smoother
            const easeFactor = 0.18;
            
            otherPlayer.sprite.x += dx * easeFactor;
            otherPlayer.sprite.y += dy * easeFactor;
            
            // Update name position
            otherPlayer.nameText.x = otherPlayer.sprite.x;
            otherPlayer.nameText.y = otherPlayer.sprite.y - 50;
        });

        // Send position updates
        const timeSinceLastUpdate = time - this.lastUpdateTime;
        if (timeSinceLastUpdate < this.updateInterval) return;

        const currentPosition = this.player.getPosition();
        const currentAnimation = this.player.getCurrentAnimation();
        const lastSentAnimation = this.player.getLastSentAnimation();

        const movementDistance = this.lastPositionSent
            ? Math.sqrt(
                  Math.pow(currentPosition.x - this.lastPositionSent.x, 2) +
                      Math.pow(currentPosition.y - this.lastPositionSent.y, 2)
              )
            : Infinity;

        const shouldUpdate =
            movementDistance > Constants.WS_POSITION_THRESHOLD ||
            currentAnimation !== lastSentAnimation;

        if (shouldUpdate) {
            this.lastUpdateTime = time;
            const roundedPosition = {
                x: Math.round(currentPosition.x),
                y: Math.round(currentPosition.y),
            };

            this.sendMessage("update", {
                x: roundedPosition.x,
                y: roundedPosition.y,
                animation: currentAnimation,
            });

            this.lastPositionSent = roundedPosition;
            this.player.setLastSentPosition(currentPosition);
            if (currentAnimation) {
                this.player.setLastSentAnimation(currentAnimation);
            }
        }
    }



    private handleServerMessage(data: ServerMessage): void {
        switch (data.type) {
            case "connect":
                this.playerId = data.id;
                // Dispatch event with self player id so UI (e.g., voice) can use it
                try {
                    const selfUsername = this.scene.registry.get("username");
                    window.dispatchEvent(
                        new CustomEvent("playerSelfConnected", {
                            detail: { id: data.id, username: selfUsername },
                        })
                    );
                } catch (e) {
                    // non-fatal
                }
                break;

            case "players":
                this.handleExistingPlayers(data.players);
                // Dispatch event for UI
                window.dispatchEvent(
                    new CustomEvent("existingPlayers", {
                        detail: { players: data.players },
                    })
                );
                break;

            case "playerJoined":
                this.handlePlayerJoined(data.player);
                // Dispatch event for UI
                window.dispatchEvent(
                    new CustomEvent("playerJoined", {
                        detail: { player: data.player },
                    })
                );
                break;

            case "playerUpdate":
                this.handlePlayerUpdate(data.player);
                break;

            case "playerDisconnect":
                this.handlePlayerDisconnect(data.id, data.username);
                // Dispatch event for UI
                window.dispatchEvent(
                    new CustomEvent("playerDisconnect", {
                        detail: { id: data.id, username: data.username },
                    })
                );
                break;

            case "onlineUsersCount":
                // Dispatch event for UI
                window.dispatchEvent(
                    new CustomEvent("onlineUsersCount", {
                        detail: { count: data.count },
                    })
                );
                break;

            case "chat":
                if (data.username && data.message) {
                    window.dispatchEvent(
                        new CustomEvent("chat-message", {
                            detail: {
                                id:
                                    data.id ||
                                    `chat-${Date.now()}-${Math.random()
                                        .toString(36)
                                        .substring(2, 9)}`,
                                username: data.username,
                                message: data.message,
                            },
                        })
                    );
                }
                break;
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
        }
    }

    private handlePlayerUpdate(player: PlayerData): void {
        if (player.id !== this.playerId) {
            this.updateOtherPlayer(player);
        }
    }

    private handlePlayerDisconnect(playerId: string, username: string): void {
        this.removeOtherPlayer(playerId);
    }

    private createOtherPlayer(playerData: PlayerData): void {
        if (this.otherPlayers.has(playerData.id)) {
            return;
        }

        // Use the player's skin if provided; fallback to currently loaded "character" texture
        let skinTextureKey: string = "character";
        if (playerData.skin && this.scene.textures.exists(playerData.skin)) {
            skinTextureKey = playerData.skin;
        } else if (playerData.skin && !this.scene.textures.exists(playerData.skin)) {
            // If skin texture not loaded (edge case), load it and then create the sprite
            const frameCfg = { frameWidth: 1000.25, frameHeight: 1000.25 } as any;
            this.scene.load.spritesheet(playerData.skin, `/characters/${playerData.skin}.png`, frameCfg);
            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                ensureCharacterAnimations(this.scene, playerData.skin!);
                this.createOtherPlayer({ ...playerData, skin: playerData.skin });
            });
            this.scene.load.start();
            return;
        }

        // Ensure animations exist for that texture key
        ensureCharacterAnimations(this.scene, skinTextureKey);

        const otherPlayer = this.scene.add.sprite(
            playerData.x,
            playerData.y,
            skinTextureKey
        );
        otherPlayer.setScale(0.3);
        otherPlayer.setDepth(100); // Other players have lower depth than main player (1000)

        const nameText = this.scene.add
            .text(playerData.x, playerData.y - 50, playerData.username, {
                fontFamily: FontUtils.getPlayerNameFont(),
                fontSize: Constants.PLAYER_NAME_SIZE,
                color: Constants.PLAYER_NAME_COLOR,
                align: "center",
                padding: Constants.PLAYER_NAME_PADDING,
                letterSpacing: 2,
            })
            .setOrigin(0.5, 3)
            .setDepth(101); // Name text above other player sprite

        // Ensure font is loaded and refresh the text if needed
        FontUtils.ensureFontLoaded(
            "Tickerbit",
            Constants.PLAYER_NAME_SIZE
        ).then(() => {
            nameText.setStyle({
                fontFamily: FontUtils.getPlayerNameFont(),
                fontSize: Constants.PLAYER_NAME_SIZE,
                color: Constants.PLAYER_NAME_COLOR,
            });
        });

        this.otherPlayers.set(playerData.id, {
            sprite: otherPlayer,
            nameText,
            targetX: playerData.x,
            targetY: playerData.y,
            lastUpdate: this.scene.time.now,
            currentAnimation: playerData.animation,
        });

        const gameContainer = this.scene.getGameContainer();
        if (gameContainer) {
            gameContainer.add(otherPlayer);
            gameContainer.add(nameText);
        }

        if (playerData.animation) {
            // Try playing skin-prefixed animation; fallback to legacy name
            const prefixed = `${skinTextureKey}-${playerData.animation}`;
            if (this.scene.anims.exists(prefixed)) {
                otherPlayer.anims.play(prefixed);
            } else {
                otherPlayer.anims.play(playerData.animation);
            }
        } else {
            const idle = `${skinTextureKey}-idle-down`;
            if (this.scene.anims.exists(idle)) {
                otherPlayer.anims.play(idle);
            } else {
                otherPlayer.anims.play("idle-down");
            }
        }
    }

    private updateOtherPlayer(playerData: PlayerData): void {
        const otherPlayer = this.otherPlayers.get(playerData.id);
        if (otherPlayer) {
            // Simply update target position - easing happens in update()
            otherPlayer.targetX = playerData.x;
            otherPlayer.targetY = playerData.y;
            otherPlayer.lastUpdate = this.scene.time.now;

            // Handle animation changes
            if (playerData.animation && playerData.animation !== otherPlayer.currentAnimation) {
                const textureKey = otherPlayer.sprite.texture.key;
                const prefixed = `${textureKey}-${playerData.animation}`;
                if (this.scene.anims.exists(prefixed)) {
                    otherPlayer.sprite.anims.play(prefixed, true);
                } else {
                    otherPlayer.sprite.anims.play(playerData.animation, true);
                }
                otherPlayer.currentAnimation = playerData.animation;
            }
        } else {
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
        return this.otherPlayers.size + 1;
    }

    public checkConnectionHealth(): boolean {
        return this.connected && this.ws?.readyState === WebSocket.OPEN;
    }

    public disconnect(): void {
        console.log("Disconnecting WebSocket");
        this.intentionalDisconnect = true;
        this.connected = false;
        this.isConnecting = false;
        this.playerId = null;
        WebSocketManager.globalConnectionLock = false; // Release global lock

        if (this.ws) {
            this.ws.close(1000, "Disconnect");
            this.ws = null;
        }

        this.otherPlayers.forEach((player) => {
            player.sprite.destroy();
            player.nameText.destroy();
        });
        this.otherPlayers.clear();
    }

    public sendChat(message: string): void {
        if (!message.trim()) return;

        const messageId = `chat-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        this.sendMessage("chat", { message: message.trim(), id: messageId });
    }
}
