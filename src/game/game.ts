// Add proper type reference directive to ensure browser types are available
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene.ts";
import { Constants } from "./utils/Constants.ts";
import { initializeHUD, updateHUD, unmountHUD } from "../main.ts";
import { playerStateApi } from "../utils/api.ts";

let game: Phaser.Game | null = null;
let gameContainer: HTMLElement | null = null;
let loadingText: HTMLElement | null = null;
let assetLoader: AssetLoader | null = null;

/**
 * Asset loader class to handle background loading
 */
class AssetLoader {
    private loadedAssets: number = 0;
    private totalAssets: number = 0;
    private onProgress: (progress: number) => void;
    private onComplete: () => void;

    constructor(onProgress: (progress: number) => void, onComplete: () => void) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
    }

    async loadAssets(): Promise<void> {
        // Define all assets that need to be preloaded (excluding chunks - ChunkedMapManager handles those)
        const assetsToLoad = [
            // Interior building textures
            { type: 'image', key: 'interior', url: '/maps/bank.png' },
            { type: 'image', key: 'stockmarket', url: '/maps/stockmarket.png' },
            { type: 'image', key: 'bank-manager', url: '/characters/bank-manager.png' },
            // Character spritesheets
            { type: 'spritesheet', key: 'C1', url: '/characters/C1.png', frameConfig: { frameWidth: 1000.25, frameHeight: 1000.25 } },
            { type: 'spritesheet', key: 'C2', url: '/characters/C2.png', frameConfig: { frameWidth: 1000.25, frameHeight: 1000.25 } },
            { type: 'spritesheet', key: 'C3', url: '/characters/C3.png', frameConfig: { frameWidth: 1000.25, frameHeight: 1000.25 } },
            { type: 'spritesheet', key: 'C4', url: '/characters/C4.png', frameConfig: { frameWidth: 1000.25, frameHeight: 1000.25 } },
            { type: 'spritesheet', key: 'maya', url: '/characters/maya.png', frameConfig: { frameWidth: 64, frameHeight: 64 } },
            // Collision data
            { type: 'json', key: 'collisionData', url: '/collisions/collisions.json' },
            // UI assets
            { type: 'spritesheet', key: 'speech_bubble_grey', url: '/UI/speech_bubble_grey.png', frameConfig: { frameWidth: 64, frameHeight: 64 } },
            // Audio assets
            { type: 'audio', key: 'coin-deposit', url: '/sounds/coin-deposit.mp3' },
            { type: 'audio', key: 'coin-withdraw', url: '/sounds/coin-withdraw.mp3' }
        ];

        this.totalAssets = assetsToLoad.length;
        this.loadedAssets = 0;

        // Load all assets in parallel
        const loadPromises = assetsToLoad.map(asset => this.loadSingleAsset(asset));
        
        try {
            await Promise.all(loadPromises);
            this.onComplete();
        } catch (error) {
            console.error('Error loading assets:', error);
            // Continue anyway - Phaser will handle missing assets gracefully
            this.onComplete();
        }
    }

    private async loadSingleAsset(asset: any): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (asset.type === 'image' || asset.type === 'spritesheet') {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            // Store the loaded image for Phaser to use later
                            (window as any).preloadedAssets = (window as any).preloadedAssets || {};
                            (window as any).preloadedAssets[asset.key] = {
                                type: asset.type,
                                element: img,
                                frameConfig: asset.frameConfig
                            };
                            
                            this.loadedAssets++;
                            const progress = this.loadedAssets / this.totalAssets;
                            
                            // Dispatch detailed progress event
                            window.dispatchEvent(new CustomEvent('gameAssetProgress', {
                                detail: {
                                    progress: Math.round(progress * 100),
                                    loaded: this.loadedAssets,
                                    total: this.totalAssets,
                                    status: this.getStatusForProgress(Math.round(progress * 100))
                                }
                            }));
                            
                            this.onProgress(progress);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${asset.url}`);
                        this.loadedAssets++;
                        this.onProgress(this.loadedAssets / this.totalAssets);
                        resolve(); // Don't reject, just continue
                    };
                    img.crossOrigin = 'anonymous';
                    img.src = asset.url;
                } else if (asset.type === 'json') {
                    fetch(asset.url)
                        .then(response => response.json())
                        .then((data) => {
                            // Store the loaded JSON data
                            (window as any).preloadedAssets = (window as any).preloadedAssets || {};
                            (window as any).preloadedAssets[asset.key] = {
                                type: asset.type,
                                data: data
                            };
                            
                            this.loadedAssets++;
                            this.onProgress(this.loadedAssets / this.totalAssets);
                            resolve();
                        })
                        .catch(() => {
                            console.warn(`Failed to load JSON: ${asset.url}`);
                            this.loadedAssets++;
                            this.onProgress(this.loadedAssets / this.totalAssets);
                            resolve(); // Don't reject, just continue
                        });
                } else if (asset.type === 'audio') {
                    const audio = new Audio();
                    audio.oncanplaythrough = () => {
                        // Store the loaded audio
                        (window as any).preloadedAssets = (window as any).preloadedAssets || {};
                        (window as any).preloadedAssets[asset.key] = {
                            type: asset.type,
                            element: audio
                        };
                        
                        this.loadedAssets++;
                        this.onProgress(this.loadedAssets / this.totalAssets);
                        resolve();
                    };
                    audio.onerror = () => {
                        console.warn(`Failed to load audio: ${asset.url}`);
                        this.loadedAssets++;
                        this.onProgress(this.loadedAssets / this.totalAssets);
                        resolve(); // Don't reject, just continue
                    };
                    audio.src = asset.url;
                } else {
                    // Unknown asset type, just mark as loaded
                    this.loadedAssets++;
                    this.onProgress(this.loadedAssets / this.totalAssets);
                    resolve();
                }
            } catch (error) {
                console.warn(`Error loading asset ${asset.url}:`, error);
                this.loadedAssets++;
                this.onProgress(this.loadedAssets / this.totalAssets);
                resolve(); // Don't reject, just continue
            }
        });
    }

    private getStatusForProgress(progress: number): string {
        if (progress < 20) return 'Loading Game Assets...';
        if (progress < 40) return 'Loading Characters...';
        if (progress < 60) return 'Loading UI Elements...';
        if (progress < 80) return 'Loading Audio...';
        if (progress < 95) return 'Finalizing...';
        return 'Ready!';
    }

    // Clean up method
    public cleanup(): void {
        // Clear preloaded assets from memory when no longer needed
        if ((window as any).preloadedAssets) {
            const assets = (window as any).preloadedAssets;
            Object.keys(assets).forEach(key => {
                const asset = assets[key];
                if (asset.element && asset.element.src) {
                    // Revoke blob URLs to prevent memory leaks
                    if (asset.element.src.startsWith('blob:')) {
                        URL.revokeObjectURL(asset.element.src);
                    }
                }
            });
            delete (window as any).preloadedAssets;
        }
    }
}

/**
 * Start game with the provided username and selected character
 */
export function startGame(username: string, selectedCharacter: string = 'C2'): void {
    // Check if game is already initialized to avoid duplicate instances
    if (game) {
        console.log("Game is already running");
        return;
    }

    console.log("Starting new game instance for username:", username);

    gameContainer = document.getElementById("game-container");

    if (!gameContainer) {
        console.error("Game container not found");
        return;
    }

    // Ensure the game container is visible and properly sized
    gameContainer.style.display = "block";
    gameContainer.style.width = "100%";
    gameContainer.style.height = "100vh";

    // Get any room code from local storage
    const roomCode = localStorage.getItem("dhaniverse_room_code") || "";

    console.log(`Starting game with username: ${username}, room code: ${roomCode}`);

    // Start loading assets in background while showing custom loader
    startAssetLoading(username, selectedCharacter, roomCode);
}

/**
 * Start asset loading in background and update custom loader
 */
function startAssetLoading(username: string, selectedCharacter: string, roomCode: string): void {
    // Notify the custom loader to start
    window.dispatchEvent(new CustomEvent('gameAssetLoadingStart'));

    // Create asset loader with progress callbacks
    assetLoader = new AssetLoader(
        (progress: number) => {
            // Update custom loader progress
            window.dispatchEvent(new CustomEvent('gameAssetLoadingProgress', { 
                detail: { progress: Math.round(progress * 100) } 
            }));
        },
        () => {
            // Assets loaded, now initialize Phaser game
            initializePhaserGame(username, selectedCharacter, roomCode);
        }
    );

    // Start loading assets
    assetLoader.loadAssets();
}

/**
 * Initialize Phaser game after assets are preloaded
 */
function initializePhaserGame(username: string, selectedCharacter: string, roomCode: string): void {
    if (!gameContainer) {
        console.error("Game container not found");
        return;
    }

    // Configure the game
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: "100%",
        height: "100%",
        parent: "game-container",
        backgroundColor: "#2d2d2d",
        scene: [MainScene],
        physics: {
            default: "arcade",
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: Constants.SHOW_DEBUG_VISUALS,
            },
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: "100%",
            height: "100%",
        },
        render: {
            pixelArt: false,
            antialias: true,
            powerPreference: "high-performance",
            autoMobilePipeline: true,
            roundPixels: false,
            transparent: false,
            antialiasGL: true,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
            clearBeforeRender: true,
        },
        fps: {
            target: 60,
            forceSetTimeOut: true,
            smoothStep: true,
            min: 30,
            limit: 180,
            panicMax: 120,
        },
        input: {
            gamepad: true,
            mouse: true,
            touch: true,
        },
    };

    // Clear any existing canvas elements that might be causing display issues
    const existingCanvas = gameContainer.querySelector("canvas");
    if (existingCanvas) {
        gameContainer.removeChild(existingCanvas);
    }

    try {
        game = new Phaser.Game(config);

        // Register the username, room code, and selected character for the game
        game.registry.set("username", username);
        game.registry.set("roomCode", roomCode);
        game.registry.set("selectedCharacter", selectedCharacter);

        // Initialize the React HUD when game is ready
        game.events.once("ready", () => {
            // Load player state from backend and initialize HUD
            loadPlayerStateAndInitializeHUD();

            // Notify custom loader that game is ready
            window.dispatchEvent(new CustomEvent('gameAssetLoadingComplete'));

            // Setup resize handling after game is ready
            setupResizeHandling();
        });
    } catch (error) {
        console.error("Error initializing game:", error);
        // Notify custom loader of error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        window.dispatchEvent(new CustomEvent('gameAssetLoadingError', { 
            detail: { error: errorMessage } 
        }));
    }
}

/**
 * Stops and destroys the current game instance
 */
export function stopGame(): void {
    // Notify MainScene and systems to stop and disconnect first
    window.dispatchEvent(new Event("stopGame"));

    // Clean up asset loader
    if (assetLoader) {
        assetLoader = null;
    }

    // Clean up resize timeout
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
    }

    // Clean up resize event listeners
    if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
    }
    if (orientationHandler) {
        window.removeEventListener("orientationchange", orientationHandler);
        orientationHandler = null;
    }

    if (game) {
        game.destroy(true);
        game = null;
    }

    // Reset game container
    if (gameContainer) {
        gameContainer.style.display = "none";
        gameContainer = null;
    }

    // Unmount React HUD to free memory
    unmountHUD();

    // Clear map cache from localStorage to prevent storage bloat
    localStorage.removeItem("cachedMap");
}

// Expose updateHUD for MainScene to use
export function updateGameHUD(rupees: number): void {
    updateHUD(rupees);
}

/**
 * Get current game instance (for debugging)
 */
export function getCurrentGame(): Phaser.Game | null {
    return game;
}

/**
 * Debug function to refresh player state from backend
 */
export async function refreshPlayerState(): Promise<void> {
    if (game) {
        const mainScene = game.scene.getScene("MainScene") as MainScene;
        if (mainScene) {
            await mainScene.refreshPlayerStateFromBackend();
        }
    }
}

// Expose functions globally for debugging
if (typeof window !== "undefined") {
    (window as any).dhaniverse = {
        refreshPlayerState,
        getCurrentGame,
        stopGame,
        startGame,
    };
}

/**
 * Load player state from backend and initialize HUD with actual rupees
 */
async function loadPlayerStateAndInitializeHUD(): Promise<void> {
    try {
        console.log("Loading player state from backend...");

        // Load player state from backend
        const response = await playerStateApi.get();

        if (response.success && response.data) {
            const playerState = response.data;
            const rupees = playerState.financial?.rupees || 0;

            console.log("Player state loaded successfully:", {
                rupees,
                totalWealth: playerState.financial?.totalWealth,
                level: playerState.progress?.level,
            });

            // Initialize HUD with actual rupees from database
            initializeHUD(rupees);

            // Initialize MainScene with correct rupees (with retry mechanism)
            if (game) {
                const initializeScene = () => {
                    if (!game) return; // Additional null check
                    const mainScene = game.scene.getScene(
                        "MainScene"
                    ) as MainScene;
                    if (mainScene && mainScene.scene.isActive()) {
                        mainScene.initializePlayerRupees(rupees);
                        console.log(
                            `MainScene initialized with ${rupees} rupees`
                        );
                    } else {
                        // Scene not ready yet, try again in 100ms
                        setTimeout(initializeScene, 100);
                    }
                };
                initializeScene();
            }
        } else {
            console.warn("Failed to load player state from backend:", response);
            throw new Error("Invalid response from player state API");
        }
    } catch (error) {
        console.error("Error loading player state from backend:", error);

        // Show user-friendly error message
        if (loadingText) {
            loadingText.textContent =
                "Loading game data failed, using defaults...";
            setTimeout(() => {
                if (loadingText && gameContainer) {
                    gameContainer.removeChild(loadingText);
                    loadingText = null;
                }
            }, 2000);
        }

        // Fallback to default if API fails
        const defaultRupees = 0;
        console.log("Using default rupees:", defaultRupees);

        initializeHUD(defaultRupees);

        // Initialize MainScene with fallback
        if (game) {
            const initializeScene = () => {
                if (!game) return; // Additional null check
                const mainScene = game.scene.getScene("MainScene") as MainScene;
                if (mainScene && mainScene.scene.isActive()) {
                    mainScene.initializePlayerRupees(defaultRupees);
                    console.log(
                        `MainScene initialized with default ${defaultRupees} rupees`
                    );
                } else {
                    // Scene not ready yet, try again in 100ms
                    setTimeout(initializeScene, 100);
                }
            };
            initializeScene();
        }
    }
}

// Handle window resizing with debouncing and proper cleanup
let resizeTimeout: number | null = null;
let resizeHandler: (() => void) | null = null;
let orientationHandler: (() => void) | null = null;

function setupResizeHandling(): void {
    if (!game || !gameContainer) return;

    // Remove any existing listeners
    if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
    }
    if (orientationHandler) {
        window.removeEventListener("orientationchange", orientationHandler);
    }

    // Create new resize handler
    resizeHandler = () => {
        if (!game || !gameContainer) return;

        // Clear any existing timeout
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }

        // Debounce resize to avoid excessive calls
        resizeTimeout = window.setTimeout(() => {
            if (!game || !gameContainer) return;

            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;

            // Update game container size
            gameContainer.style.width = "100%";
            gameContainer.style.height = "100vh";

            // Force Phaser to resize the canvas
            game.scale.setGameSize(newWidth, newHeight);
            game.scale.refresh();

            // Trigger custom resize event for game systems
            game.events.emit("game-resize", newWidth, newHeight);

            console.log(`Game resized to: ${newWidth}x${newHeight}`);
        }, 50); // Reduced debounce for more responsive resizing
    };

    // Create orientation change handler
    orientationHandler = () => {
        // Small delay to allow orientation change to complete
        setTimeout(() => {
            if (resizeHandler) resizeHandler();
        }, 200);
    };

    // Add event listeners
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("orientationchange", orientationHandler);

    // Initial resize to ensure proper sizing
    resizeHandler();
}

// Simple, focused browser key prevention - only prevent truly problematic browser shortcuts
window.addEventListener("keydown", (event) => {
    const gameContainer = document.getElementById("game-container");
    const isGameActive =
        game && gameContainer && gameContainer.style.display !== "none";

    if (isGameActive) {
        // Only prevent specific browser shortcuts that cause major issues
        // Keep this list minimal to avoid conflicts
        const problematicKeys = [
            "F5", // Refresh
            "F11", // Fullscreen
            "F12", // Dev tools
        ];

        // Prevent Ctrl+key combinations that interfere
        if (
            event.ctrlKey &&
            ["r", "R", "f", "F", "u", "U"].includes(event.key)
        ) {
            event.preventDefault();
            return;
        }

        if (problematicKeys.includes(event.key)) {
            event.preventDefault();
        }
    }
});
