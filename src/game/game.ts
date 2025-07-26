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

    console.log(
        `Starting game with username: ${username}, room code: ${roomCode}`
    );

    // Initialize the game after a short delay to allow DOM to update
    setTimeout(() => {
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

                // Remove loading indicator
                if (loadingText && gameContainer) {
                    gameContainer.removeChild(loadingText);
                    loadingText = null;
                }

                // Setup resize handling after game is ready
                setupResizeHandling();
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
            const rupees = playerState.financial?.rupees || 25000;

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
