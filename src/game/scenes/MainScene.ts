import { Scene, Types, GameObjects } from "phaser";
import { Player } from "../entities/Player.ts";
import { CollisionManager } from "../systems/CollisionManager.ts";
import { ChunkedMapManager } from "../systems/ChunkedMapManager.ts";
import { WebSocketManager } from "../systems/WebSocketManager.ts";
import { NPCManager } from "../systems/NPCManager.ts";
import { MayaNPCManager } from "../systems/MayaNPCManager.ts";
import { BuildingManager } from "../systems/BuildingManager.ts";
import { BankNPCManager } from "../systems/BankNPCManager.ts";
import { StockMarketManager } from "../systems/StockMarketManager.ts";
import { ATMManager } from "../managers/ATMManager.ts";
import { DynamicZoomManager } from "../systems/DynamicZoomManager.ts";
import { ensureCharacterAnimations } from "../utils/CharacterAnimations.ts";
import { locationTrackerManager } from "../../services/LocationTrackerManager.ts";



// Custom event interfaces
interface RupeeUpdateEvent extends CustomEvent {
    detail: {
        rupees: number;
    };
}

interface ChatEvent extends CustomEvent {
    detail: {
        message: string;
    };
}

// Scene interface for type safety
export interface MainGameScene extends Scene {
    getGameContainer(): GameObjects.Container;
    getPlayer(): Player;
    getCollisionManager(): CollisionManager;
    getCursors(): Types.Input.Keyboard.CursorKeys;
    mapManager: ChunkedMapManager;
    getRupees(): number;
    updateRupees(amount: number): void;
    bankNPCManager: BankNPCManager;
    stockMarketManager: StockMarketManager;
    atmManager: ATMManager;
    npcManager: NPCManager;
    buildingManager: BuildingManager;
    openBankingUI(bankAccount: any): void;
    openStockMarketUI(stocks: any[]): void;
    playerRupees: number;
}

export class MainScene extends Scene implements MainGameScene {
    private isTyping: boolean = false;
    private isCameraFollowingPlayer: boolean = true;
    private handleTypingStartBound = () => this.handleTypingStart();
    private handleTypingEndBound = () => this.handleTypingEnd();
    private player!: Player;
    private cursors!: Types.Input.Keyboard.CursorKeys;
    private collisionManager!: CollisionManager;
    mapManager!: ChunkedMapManager;
    private webSocketManager!: WebSocketManager;
    npcManager!: NPCManager;
    mayaNPCManager!: MayaNPCManager;
    buildingManager!: BuildingManager;
    bankNPCManager!: BankNPCManager;
    stockMarketManager!: StockMarketManager;
    atmManager!: ATMManager;
    private dynamicZoomManager!: DynamicZoomManager;
    
    private gameContainer!: GameObjects.Container;
    private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
    private loadingProgress: number = 0;
    private progressBar?: GameObjects.Graphics;
    private progressText?: GameObjects.Text;
    playerRupees: number = 0; // Store rupees in the scene
    private _bankingClosedListenerAdded: boolean = false;
    private _stockMarketClosedListenerAdded: boolean = false;
    private handleRupeeUpdateBound = this.handleRupeeUpdate.bind(this);
    private handleStopGameBound = () => this.webSocketManager.disconnect();
    private handleSendChatBound = (e: Event) => this.handleSendChat(e);
    private handleUpdatePlayerRupeesBound =
        this.handleUpdatePlayerRupees.bind(this);

    constructor() {
        super({ key: "MainScene" });
    }

    /**
     * Get the selected character from registry or default to C2
     */
    private getSelectedCharacter(): string {
        try {
            // Get selectedCharacter from game registry (set by startGame)
            const selectedCharacter = this.registry.get('selectedCharacter');
            if (selectedCharacter && ['C1', 'C2', 'C3', 'C4'].includes(selectedCharacter)) {
                return selectedCharacter;
            }
        } catch (error) {
            console.warn('Failed to get selected character:', error);
        }
        
        // Default to C2
        return 'C2';
    }

    /**
     * Load Tickerbit font and ensure it's ready before creating text objects
     */
    private async loadTickerbitFont(): Promise<void> {
        return new Promise((resolve) => {
            try {
                // Use the Font Loading API to ensure the font is loaded
                if ("fonts" in document) {
                    document.fonts
                        .load("24px Tickerbit")
                        .then(() => {
                            console.log(
                                "Tickerbit font loaded successfully via Font Loading API"
                            );

                            // Additional check: create a temporary text object to force font loading in Phaser
                            const tempText = this.add.text(
                                -1000,
                                -1000,
                                "Test",
                                {
                                    fontFamily: "Tickerbit, Arial, sans-serif",
                                    fontSize: "24px",
                                }
                            );

                            // Wait a bit then destroy it and resolve
                            this.time.delayedCall(200, () => {
                                tempText.destroy();
                                resolve();
                            });
                        })
                        .catch((error) => {
                            console.warn("Font Loading API failed:", error);
                            // Still resolve to continue with fallback fonts
                            resolve();
                        });
                } else {
                    console.warn(
                        "Font Loading API not supported, using fallback"
                    );
                    // Create a temporary text object to force font loading in Phaser
                    const tempText = this.add.text(-1000, -1000, "Test", {
                        fontFamily: "Tickerbit, Arial, sans-serif",
                        fontSize: "24px",
                    });

                    // Wait a bit then destroy it and resolve
                    this.time.delayedCall(300, () => {
                        tempText.destroy();
                        resolve();
                    });
                }
            } catch (error) {
                console.warn("Failed to load Tickerbit font:", error);
                // Font will fallback to Arial, sans-serif
                resolve();
            }
        });
    }

    /**
     * Initialize player rupees from database
     */
    public initializePlayerRupees(rupees: number): void {
        const oldRupees = this.playerRupees;
        this.playerRupees = rupees;

        console.log("MainScene initialized with rupees:", rupees);

        // Only dispatch update if the value actually changed
        if (oldRupees !== rupees) {
            // Dispatch event to update all UI components
            window.dispatchEvent(
                new CustomEvent("rupee-update", {
                    detail: { rupees: this.playerRupees },
                })
            );

            // Update game HUD
            import("../game.ts").then(({ updateGameHUD }) => {
                updateGameHUD(this.playerRupees);
            });
        }
    }

    /**
     * Load fresh player state from backend (useful for refreshing game state)
     */
    public async refreshPlayerStateFromBackend(): Promise<void> {
        try {
            console.log("Refreshing player state from backend...");

            // Import API here to avoid circular dependency
            const { playerStateApi } = await import("../../utils/api.ts");

            const response = await playerStateApi.get();

            if (response.success && response.data) {
                const playerState = response.data;
                const rupees =
                    playerState.financial?.rupees || this.playerRupees;

                console.log("Fresh player state loaded:", {
                    rupees,
                    totalWealth: playerState.financial?.totalWealth,
                    level: playerState.progress?.level,
                });

                // Update rupees if different
                if (rupees !== this.playerRupees) {
                    this.initializePlayerRupees(rupees);
                }

                return playerState;
            } else {
                console.warn("Failed to refresh player state:", response);
            }
        } catch (error) {
            console.error("Error refreshing player state:", error);
        }
    }

    preload(): void {
        console.log("Assets already preloaded, registering with Phaser...");

        // Register preloaded assets with Phaser's texture and cache managers
        const preloadedAssets = (window as any).preloadedAssets || {};
        
        Object.keys(preloadedAssets).forEach(key => {
            const asset = preloadedAssets[key];
            
            try {
                if (asset.type === 'image') {
                    if (!this.textures.exists(key)) {
                        this.textures.addImage(key, asset.element);
                    }
                } else if (asset.type === 'spritesheet') {
                    if (!this.textures.exists(key)) {
                        this.textures.addSpriteSheet(key, asset.element, asset.frameConfig);
                    }
                } else if (asset.type === 'json') {
                    if (!this.cache.json.exists(key)) {
                        this.cache.json.add(key, asset.data);
                    }
                } else if (asset.type === 'audio') {
                    if (!this.cache.audio.exists(key)) {
                        this.cache.audio.add(key, asset.element);
                    }
                }
            } catch (error) {
                console.warn(`Failed to register preloaded asset ${key}:`, error);
            }
        });

        // Ensure legacy character key exists for backward compatibility
        const selectedCharacter = this.getSelectedCharacter();
        if (preloadedAssets[selectedCharacter] && !this.textures.exists('character')) {
            try {
                this.textures.addSpriteSheet(
                    'character', 
                    preloadedAssets[selectedCharacter].element, 
                    preloadedAssets[selectedCharacter].frameConfig
                );
            } catch (error) {
                console.warn('Failed to create character texture:', error);
            }
        }

        console.log("Preloaded assets registered with Phaser");
    }

    // Create takes care of establishing game elements
    create(): void {
        // Ensure Tickerbit font is loaded before creating any text objects
        this.loadTickerbitFont().then(() => {
            this.createGameElements();
        });
    }

    private createGameElements(): void {
    const selectedSkin = this.getSelectedCharacter();
        // Create game container - all game elements should be added to this container
        this.gameContainer = this.add.container(0, 0);

        // Create map first so it's at the bottom of the rendering order
        this.mapManager = new ChunkedMapManager(this);

        // Setup collisions after map is created
        this.collisionManager = new CollisionManager(this);

        // Initialize keyboard controls with null checks
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = {
                up: this.input.keyboard.addKey("W"),
                down: this.input.keyboard.addKey("S"),
                left: this.input.keyboard.addKey("A"),
                right: this.input.keyboard.addKey("D"),
            };

            // Additional interaction keys
            this.input.keyboard.addKey("E");
            this.input.keyboard.addKey("ESC");
            
            // Add tracker toggle key (T for Tracker)
            const trackerKey = this.input.keyboard.addKey("T");
            trackerKey.on('down', () => {
                const isTracked = locationTrackerManager.toggleTarget('maya');
                console.log(`Maya tracker ${isTracked ? 'enabled' : 'disabled'} (Press T to toggle)`);
            });
        }

        // Create player after map and collisions are set up
        const username = this.registry.get("username") || "Player";
        // Set fixed starting position for better gameplay experience
        // Ensure animations exist for local and other skins
        ensureCharacterAnimations(this, "character");
        ["C1", "C2", "C3", "C4"].forEach((skin) => ensureCharacterAnimations(this, skin));
        
        // Ensure Maya animations exist (they're created in MayaNPCManager but we can also ensure here)
        // Maya animations will be created by MayaNPCManager.createMayaAnimations()

        this.player = new Player(this, 800, 800, this.cursors, this.wasd, selectedSkin);
        this.gameContainer.add(this.player.getSprite());
        this.gameContainer.add(this.player.getNameText());

        // Enable physics collisions between player and each collision box
        this.collisionManager.getCollisionObjects().forEach((box) => {
            this.physics.add.collider(this.player.getSprite(), box);
        });

        // Add player-dependent managers
        this.buildingManager = new BuildingManager(this);
        this.npcManager = new NPCManager(this);
        
        // Initialize Maya NPC manager
        this.mayaNPCManager = new MayaNPCManager(this);
        
        this.webSocketManager = new WebSocketManager(this, this.player);

        // Initialize the bank NPC manager (will be invisible until player enters the bank)
        this.bankNPCManager = new BankNPCManager(this);

        // Initialize the stock market manager (will be invisible until player enters the stock market)
        this.stockMarketManager = new StockMarketManager(this);

        // Initialize the ATM manager for outdoor ATM interactions
        this.atmManager = new ATMManager(this);

        // Add Maya to the location tracker manager
        // Initialize tracker with Maya's actual initial position
        locationTrackerManager.addTarget({
            id: 'maya',
            name: 'Maya',
            position: this.mayaNPCManager.getMayaPosition(),
            image: '/characters/maya-preview.png',
            enabled: true // Start enabled; player can toggle
        });

        // Initialize the bank NPC manager (will be invisible until player enters the bank)
        this.bankNPCManager = new BankNPCManager(this);

        // Initialize the stock market manager (will be invisible until player enters the stock market)
        this.stockMarketManager = new StockMarketManager(this);

        // Initialize the ATM manager for outdoor ATM interactions
        this.atmManager = new ATMManager(this);

        // Connect to WebSocket server for multiplayer
        this.webSocketManager.connect(username);

        // Setup camera bounds to prevent showing areas outside the map
        this.setupCameraBounds();

        // Setup camera to follow player with smooth follow
        this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);

        // Initialize dynamic zoom manager after player is created
        this.dynamicZoomManager = new DynamicZoomManager(this, this.player);

        // Enable round pixels to reduce flickering
        this.cameras.main.setRoundPixels(true);

        

        // Add event listener for updatePlayerRupees events (from banking and stock market)
        window.addEventListener(
            "updatePlayerRupees",
            this.handleUpdatePlayerRupeesBound
        );

        // Listen for global stopGame to disconnect socket
        window.addEventListener("stopGame", this.handleStopGameBound);

        // Add listener to handle chat messages from HUD
        window.addEventListener("send-chat", this.handleSendChatBound as any);

        // Listen for typing start/end to disable movement
        window.addEventListener("typing-start", this.handleTypingStartBound);
        window.addEventListener("typing-end", this.handleTypingEndBound);

        // Notify game is ready (internal + global window event for UI hooks)
        this.game.events.emit("ready");
        try {
            window.dispatchEvent(new CustomEvent('phaser-game-ready'));
        } catch (e) {
            console.warn('Failed to dispatch phaser-game-ready event', e);
        }

        // Setup periodic sync with backend (every 30 seconds)
        this.setupPeriodicBackendSync();

        // Add debug helpers to global window object
        this.setupDebugHelpers();

        // Remove loading indicator immediately after scene is ready
        this.time.delayedCall(100, () => {
            const gameContainer = document.getElementById("game-container");
            const loadingText = gameContainer?.querySelector("div");
            if (
                loadingText &&
                loadingText.textContent?.includes("Loading game assets")
            ) {
                gameContainer?.removeChild(loadingText);
                console.log("Loading indicator removed from scene");
            }
        });

        // Clean up on scene shutdown to prevent memory leaks
        this.events.on("shutdown", () => {
            // Cleanup managers
            if (this.bankNPCManager) {
                this.bankNPCManager.destroy();
            }

            if (this.stockMarketManager) {
                this.stockMarketManager.destroy();
            }

            if (this.atmManager) {
                this.atmManager.destroy();
            }

            if (this.mayaNPCManager) {
                this.mayaNPCManager.destroy();
            }

            if (this.dynamicZoomManager) {
                this.dynamicZoomManager.destroy();
            }

            // Clear location tracker targets
            locationTrackerManager.clear();

            

            window.removeEventListener(
                "updatePlayerRupees",
                this.handleUpdatePlayerRupeesBound
            );
            window.removeEventListener("stopGame", this.handleStopGameBound);
            window.removeEventListener(
                "send-chat",
                this.handleSendChatBound as any
            );
            window.removeEventListener(
                "typing-start",
                this.handleTypingStartBound
            );
            window.removeEventListener("typing-end", this.handleTypingEndBound);
            this.webSocketManager.disconnect();
        });
    }

    override update(_time: number, delta: number): void {
        // Delta-based time stepping for consistent movement regardless of framerate
        const deltaFactor = delta / (1000 / 60); // Normalize to 60fps

        // Update player only if not typing and player exists
        if (!this.isTyping && this.player) {
            this.player.update(deltaFactor);
        }

        // Then update all managers with null checks
        if (this.collisionManager) this.collisionManager.update();
        if (this.webSocketManager) this.webSocketManager.update();
        if (this.npcManager) this.npcManager.update();
        if (this.mayaNPCManager) this.mayaNPCManager.update();
        if (this.buildingManager) this.buildingManager.update();
        if (this.bankNPCManager) this.bankNPCManager.update();
        if (this.stockMarketManager) this.stockMarketManager.update();
        if (this.atmManager) this.atmManager.update();

        // Emit position updates for location tracker only if player exists
        if (this.player) {
            window.dispatchEvent(new CustomEvent('player-position-update', {
                detail: { x: this.player.getSprite().x, y: this.player.getSprite().y }
            }));
        }
        
        window.dispatchEvent(new CustomEvent('camera-position-update', {
            detail: { x: this.cameras.main.scrollX + this.cameras.main.width / 2, y: this.cameras.main.scrollY + this.cameras.main.height / 2 }
        }));

        

        // Update dynamic zoom based on player movement
        if (this.dynamicZoomManager) this.dynamicZoomManager.update();

        // Update map chunks based on player position
        if (this.mapManager) this.mapManager.update();
    } // Method to open the banking UI
    openBankingUI(bankAccount: any): void {
        // Dispatch custom event for the React component to catch
        const bankingEvent = new CustomEvent("openBankingUI", {
            detail: {
                playerRupees: this.playerRupees,
                bankAccount: bankAccount,
            },
        });
        window.dispatchEvent(bankingEvent);

        // Add event listener for banking UI closed event if not already added
        if (!this._bankingClosedListenerAdded) {
            window.addEventListener("closeBankingUI", () => {
                console.log("Banking UI closed, ending interaction");
                if (this.bankNPCManager) {
                    this.bankNPCManager.endBankingInteraction();
                }
            });
            this._bankingClosedListenerAdded = true;
        }
    } // Method to open the stock market UI
    openStockMarketUI(stocks: any[]): void {
        // Dispatch custom event for the React component to catch
        const stockMarketEvent = new CustomEvent("openStockMarketUI", {
            detail: {
                playerRupees: this.playerRupees,
                stocks: stocks,
            },
        });
        window.dispatchEvent(stockMarketEvent);

        // Add event listener for stock market UI closed event if not already added
        if (!this._stockMarketClosedListenerAdded) {
            window.addEventListener("closeStockMarketUI", () => {
                console.log("Stock Market UI closed, ending interaction");
                if (this.stockMarketManager) {
                    this.stockMarketManager.endStockMarketInteraction();
                }
            });
            this._stockMarketClosedListenerAdded = true;
        }
    }

    // Method to update rupees count
    updateRupees(amount: number): void {
        // Instead of adding to the current amount, set it directly
        this.playerRupees = amount;

        // Import here to avoid circular dependency
        import("../game.ts").then(({ updateGameHUD }) => {
            updateGameHUD(this.playerRupees);
        });

        // Sync with backend (fire and forget, don't block the game)
        this.syncRupeesToBackend(amount);

        console.log("Game updated rupee count to:", this.playerRupees);
    }

    /**
     * Sync rupees to backend database
     */
    private async syncRupeesToBackend(rupees: number): Promise<void> {
        try {
            // Import API here to avoid circular dependency
            const { playerStateApi } = await import("../../utils/api.ts");

            await playerStateApi.updateRupees(rupees, "set");
            console.log(`Synced ${rupees} rupees to backend successfully`);
        } catch (error) {
            console.error("Failed to sync rupees to backend:", error);
            // Don't throw error to avoid disrupting game flow
        }
    }

    /**
     * Setup periodic sync with backend to ensure data consistency
     */
    private setupPeriodicBackendSync(): void {
        // Sync every 30 seconds
        const syncInterval = 30000;

        const performSync = async () => {
            try {
                // Import API here to avoid circular dependency
                const { playerStateApi } = await import("../../utils/api.ts");

                // Get current state from backend
                const response = await playerStateApi.get();

                if (response.success && response.data) {
                    const backendRupees =
                        response.data.financial?.rupees || this.playerRupees;

                    // Only update if there's a significant difference (to avoid constant updates)
                    if (Math.abs(backendRupees - this.playerRupees) > 0) {
                        console.log(
                            `Backend sync: updating rupees from ${this.playerRupees} to ${backendRupees}`
                        );
                        this.playerRupees = backendRupees;

                        // Update UI
                        import("../game.ts").then(({ updateGameHUD }) => {
                            updateGameHUD(this.playerRupees);
                        });

                        // Dispatch event to update all UI components
                        window.dispatchEvent(
                            new CustomEvent("rupee-update", {
                                detail: { rupees: this.playerRupees },
                            })
                        );
                    }
                }
            } catch (error) {
                console.error("Periodic backend sync failed:", error);
                // Don't disrupt game flow on sync failures
            }
        };

        // Start periodic sync
        this.time.addEvent({
            delay: syncInterval,
            callback: performSync,
            loop: true,
        });

        console.log(
            `Started periodic backend sync every ${syncInterval / 1000} seconds`
        );
    }

    /**
     * Setup debug helpers for testing money synchronization
     */
    private setupDebugHelpers(): void {
        // Add dhaniverse debug object to global window
        (window as any).dhaniverse = {
            ...(window as any).dhaniverse,

            // Money management
            getRupees: () => this.playerRupees,
            setRupees: (amount: number) => {
                console.log(
                    `Debug: Setting rupees from ${this.playerRupees} to ${amount}`
                );
                this.updateRupees(amount);
            },
            addRupees: (amount: number) => {
                console.log(`Debug: Adding ${amount} rupees`);
                this.addPlayerRupees(amount);
            },

            // Backend sync functions
            refreshPlayerState: () => this.refreshPlayerStateFromBackend(),
            syncToBackend: (rupees?: number) =>
                this.syncRupeesToBackend(rupees || this.playerRupees),

            // Banking and stock market status
            getBankingStatus: () => ({
                bankingUIOpen:
                    document
                        .getElementById("banking-ui-container")
                        ?.classList.contains("active") || false,
                bankAccountData:
                    this.bankNPCManager?.getBankAccountData() || null,
            }),

            getStockMarketStatus: () => ({
                stockMarketUIOpen:
                    document
                        .getElementById("stock-market-ui-container")
                        ?.classList.contains("active") || false,
                marketData: this.stockMarketManager?.getMarketStatus() || null,
            }),

            // Testing functions
            testBankingSync: async () => {
                console.log("Testing banking sync...");
                const oldRupees = this.playerRupees;
                this.updateRupees(oldRupees + 1000);
                await this.syncRupeesToBackend(this.playerRupees);
                await this.refreshPlayerStateFromBackend();
                console.log(
                    `Banking sync test: ${oldRupees} -> ${this.playerRupees}`
                );
            },

            testStockMarketSync: async () => {
                console.log("Testing stock market sync...");
                const oldRupees = this.playerRupees;
                this.updateRupees(oldRupees - 500);
                await this.syncRupeesToBackend(this.playerRupees);
                await this.refreshPlayerStateFromBackend();
                console.log(
                    `Stock market sync test: ${oldRupees} -> ${this.playerRupees}`
                );
            },

            // Location tracker functions
            toggleMayaTracker: () => {
                const isTracked = locationTrackerManager.toggleTarget('maya');
                console.log(`Maya tracker ${isTracked ? 'enabled' : 'disabled'}`);
                return isTracked;
            },

            trackMaya: (enabled: boolean = true) => {
                locationTrackerManager.setTargetEnabled('maya', enabled);
                console.log(`Maya tracker ${enabled ? 'enabled' : 'disabled'}`);
            },

            getTrackerStatus: () => {
                return {
                    targets: locationTrackerManager.getTargets(),
                    enabledTargets: locationTrackerManager.getEnabledTargets(),
                    mayaTracked: locationTrackerManager.getTarget('maya')?.enabled || false
                };
            },
        };

        console.log(
            "Debug helpers added to window.dhaniverse:",
            Object.keys((window as any).dhaniverse)
        );
    }

    // Method to get current rupees
    getRupees(): number {
        return this.playerRupees;
    }

    // Method to get player rupees (alias for getRupees to match StockMarketManager usage)
    getPlayerRupees(): number {
        return this.getRupees();
    }

    // Method to add rupees to player's current amount
    addPlayerRupees(amount: number): void {
        const newTotal = this.playerRupees + amount;
        this.updateRupees(newTotal);

        // Dispatch event to update UI components
        window.dispatchEvent(
            new CustomEvent("rupee-update", {
                detail: {
                    rupees: this.playerRupees,
                },
            })
        );
    }

    // Method to deduct rupees from player's current amount
    deductPlayerRupees(amount: number): void {
        const newTotal = Math.max(0, this.playerRupees - amount);
        this.updateRupees(newTotal);

        // Dispatch event to update UI components
        window.dispatchEvent(
            new CustomEvent("rupee-update", {
                detail: {
                    rupees: this.playerRupees,
                },
            })
        );
    }

    // Create a loading progress bar
    private createProgressBar(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Draw progress bar background
        this.progressBar = this.add.graphics();
        this.progressBar.fillStyle(0x222222, 0.8);
        this.progressBar.fillRect(width / 4, height / 2 - 30, width / 2, 60);

        // Add loading text
        this.progressText = this.add
            .text(width / 2, height / 2 - 50, "Loading...", {
                fontFamily: "Pixeloid",
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Initial progress update
        this.updateProgressBar();
    }

    // Update the loading progress bar
    private updateProgressBar(): void {
        if (this.progressBar) {
            // Clear the current progress
            this.progressBar.clear();

            // Draw background
            this.progressBar.fillStyle(0x222222, 0.8);
            this.progressBar.fillRect(
                this.cameras.main.width / 4,
                this.cameras.main.height / 2 - 30,
                this.cameras.main.width / 2,
                60
            );

            // Draw progress
            this.progressBar.fillStyle(0x00aa00, 1);
            this.progressBar.fillRect(
                this.cameras.main.width / 4 + 10,
                this.cameras.main.height / 2 - 20,
                (this.cameras.main.width / 2 - 20) * this.loadingProgress,
                40
            );

            // Update text if needed
            if (this.progressText) {
                this.progressText.setText(
                    `Loading... ${Math.floor(this.loadingProgress * 100)}%`
                );
            }
        }
    }

    // Public accessors required by the MainGameScene interface
    getGameContainer(): GameObjects.Container {
        return this.gameContainer;
    }

    getPlayer(): Player {
        return this.player;
    }

    getCollisionManager(): CollisionManager {
        return this.collisionManager;
    }

    getCursors(): Types.Input.Keyboard.CursorKeys {
        return this.cursors;
    }

    // Setup camera bounds to prevent showing areas outside the map
    private setupCameraBounds(): void {
        const mapWidth = this.mapManager.getMapWidth();
        const mapHeight = this.mapManager.getMapHeight();
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    }

    public setCameraFollow(follow: boolean): void {
        if (follow) {
            if (!this.isCameraFollowingPlayer) {
                this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
                this.isCameraFollowingPlayer = true;
            }
        } else {
            if (this.isCameraFollowingPlayer) {
                this.cameras.main.stopFollow();
                this.isCameraFollowingPlayer = false;
            }
        }
    } // Bound handler to update rupees
    private handleRupeeUpdate(event: Event): void {
        const customEvent = event as RupeeUpdateEvent;
        if (
            customEvent.detail &&
            typeof customEvent.detail.rupees === "number"
        ) {
            this.playerRupees = customEvent.detail.rupees;
            import("../game.ts").then(({ updateGameHUD }) =>
                updateGameHUD(this.playerRupees)
            );
            console.log("Game received rupee update:", this.playerRupees);
        }
    }

    // Handle updatePlayerRupees events from banking and stock market UIs
    private handleUpdatePlayerRupees(event: Event): void {
        const customEvent = event as CustomEvent;
        if (
            customEvent.detail &&
            typeof customEvent.detail.rupees === "number"
        ) {
            const newRupees = customEvent.detail.rupees;
            console.log("Game received updatePlayerRupees event:", newRupees);

            // Update the local rupees count
            this.updateRupees(newRupees);

            // If this is from a UI closing, ensure everything is in sync
            if (customEvent.detail.closeUI) {
                console.log("UI closed, syncing final state with backend");
            }
        }
    }

    // Handle chat messages sent from HUD
    private handleSendChat(event: Event): void {
        const customEvent = event as ChatEvent;
        if (
            customEvent.detail &&
            typeof customEvent.detail.message === "string"
        ) {
            this.webSocketManager.sendChat(customEvent.detail.message);
        }
    }

    // Handle typing state
    private handleTypingStart(): void {
        console.log("MainScene: Typing started - disabling movement keys");
        this.isTyping = true;

        // Disable WASD keys and E key to allow typing these characters in chat
        if (this.input.keyboard) {
            // Disable WASD keys
            if (this.wasd) {
                this.wasd.up.enabled = false;
                this.wasd.down.enabled = false;
                this.wasd.left.enabled = false;
                this.wasd.right.enabled = false;
            }

            // Find and disable the E key
            const eKey = this.input.keyboard.keys.find(
                (key) => key && key.keyCode === Phaser.Input.Keyboard.KeyCodes.E
            );
            if (eKey) {
                eKey.enabled = false;
            }
        }
    }

    private handleTypingEnd(): void {
        console.log("MainScene: Typing ended - re-enabling movement keys");
        this.isTyping = false;

        // Re-enable WASD keys and E key for movement and interaction
        if (this.input.keyboard) {
            // Re-enable WASD keys
            if (this.wasd) {
                this.wasd.up.enabled = true;
                this.wasd.down.enabled = true;
                this.wasd.left.enabled = true;
                this.wasd.right.enabled = true;
            }

            // Find and re-enable the E key
            const eKey = this.input.keyboard.keys.find(
                (key) => key && key.keyCode === Phaser.Input.Keyboard.KeyCodes.E
            );
            if (eKey) {
                eKey.enabled = true;
            }

            // Re-enable camera follow after typing ends
            this.setCameraFollow(true);
        }
    }
    // Cleanup method called when scene is destroyed
    destroy(): void {
        console.log(
            "MainScene destroy called - cleaning up WebSocket connection"
        );

        // Disconnect WebSocket
        if (this.webSocketManager) {
            this.webSocketManager.disconnect();
        }

        // Cleanup managers
        if (this.bankNPCManager) {
            this.bankNPCManager.destroy();
        }

        if (this.stockMarketManager) {
            this.stockMarketManager.destroy();
        }

        if (this.atmManager) {
            this.atmManager.destroy();
        }

        // Remove event listeners
        window.removeEventListener("rupee-update", this.handleRupeeUpdateBound);
        window.removeEventListener(
            "updatePlayerRupees",
            this.handleUpdatePlayerRupeesBound
        );
        window.removeEventListener("stop-game", this.handleStopGameBound);
        window.removeEventListener("send-chat", this.handleSendChatBound);
        window.removeEventListener("typing-start", this.handleTypingStart);
        window.removeEventListener("typing-end", this.handleTypingEnd);

        // Clean up scene resources
        this.events.removeAllListeners();
        this.input.removeAllListeners();
    }
}
