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

/**
 * Start game with the provided username
 */
export function startGame(username: string): void {
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
    // Create loading indicator
    loadingText = document.createElement("div");
    loadingText.textContent = "Loading game assets...";
    loadingText.style.position = "absolute";
    loadingText.style.top = "50%";
    loadingText.style.left = "50%";
    loadingText.style.transform = "translate(-50%, -50%)";
    loadingText.style.color = "white";
    loadingText.style.fontSize = "24px";
    loadingText.style.fontFamily = "VCR OSD Mono, monospace";
    loadingText.style.textAlign = "center";
    loadingText.style.zIndex = "1000";
    gameContainer.appendChild(loadingText);

    // Get any room code from local storage
    const roomCode = localStorage.getItem("dhaniverse_room_code") || "";

    // Configure the game
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
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

    console.log(
        `Starting game with username: ${username}, room code: ${roomCode}`
    );

    // Initialize the game after a short delay to allow DOM to update
    setTimeout(() => {
        try {
            game = new Phaser.Game(config);

            // Register the username and room code for the game
            game.registry.set("username", username);
            game.registry.set("roomCode", roomCode);

            // Initialize the React HUD when game is ready
            game.events.once("ready", () => {
                // Load player state from backend and initialize HUD
                loadPlayerStateAndInitializeHUD();

                // Remove loading indicator
                if (loadingText && gameContainer) {
                    gameContainer.removeChild(loadingText);
                    loadingText = null;
                }
            });
        } catch (error) {
            console.error("Error initializing game:", error);
            if (loadingText) {
                loadingText.textContent =
                    "Error starting game. Please refresh the page.";
            }
        }
    }, 300);
}

/**
 * Stops and destroys the current game instance
 */
export function stopGame(): void {
    // Notify MainScene and systems to stop and disconnect first
    window.dispatchEvent(new Event("stopGame"));

    if (game) {
        game.destroy(true);
        game = null;
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
if (typeof window !== 'undefined') {
    (window as any).dhaniverse = {
        refreshPlayerState,
        getCurrentGame,
        stopGame,
        startGame
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
            const rupees = playerState.financial?.rupees || 25000;

            console.log("Player state loaded successfully:", {
                rupees,
                totalWealth: playerState.financial?.totalWealth,
                level: playerState.progress?.level
            });

            // Initialize HUD with actual rupees from database
            initializeHUD(rupees);

            // Initialize MainScene with correct rupees (with retry mechanism)
            if (game) {
                const initializeScene = () => {
                    if (!game) return; // Additional null check
                    const mainScene = game.scene.getScene("MainScene") as MainScene;
                    if (mainScene && mainScene.scene.isActive()) {
                        mainScene.initializePlayerRupees(rupees);
                        console.log(`MainScene initialized with ${rupees} rupees`);
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
            loadingText.textContent = "Loading game data failed, using defaults...";
            setTimeout(() => {
                if (loadingText && gameContainer) {
                    gameContainer.removeChild(loadingText);
                    loadingText = null;
                }
            }, 2000);
        }
        
        // Fallback to default if API fails
        const defaultRupees = 25000;
        console.log("Using default rupees:", defaultRupees);
        
        initializeHUD(defaultRupees);

        // Initialize MainScene with fallback
        if (game) {
            const initializeScene = () => {
                if (!game) return; // Additional null check
                const mainScene = game.scene.getScene("MainScene") as MainScene;
                if (mainScene && mainScene.scene.isActive()) {
                    mainScene.initializePlayerRupees(defaultRupees);
                    console.log(`MainScene initialized with default ${defaultRupees} rupees`);
                } else {
                    // Scene not ready yet, try again in 100ms
                    setTimeout(initializeScene, 100);
                }
            };
            initializeScene();
        }
    }
}

// Handle window resizing
window.addEventListener("resize", () => {
    if (game) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});

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
