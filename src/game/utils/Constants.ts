/**
 * Game-wide constants
 */
export const Constants = {
    // Player settings
    PLAYER_SPEED: 500,

    // Interaction distances
    BUILDING_INTERACTION_DISTANCE: 100,
    INTERACTION_DISTANCE: 100,

    // WebSocket settings - hardcoded URLs
    get WS_SERVER_URL() {
        // Check if we're in production (deployed environment)
        if (
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1"
        ) {
            return "wss://dhaniverse-ws.azurewebsites.net";
        }

        // For local development
        return "ws://localhost:8001";
    },
    WS_RECONNECT_DELAY: 5000,
    WS_POSITION_THRESHOLD: 1, // Very low threshold for ultra-smooth updates
    WS_UPDATE_RATE: 33, // Send updates every 33ms (30 FPS) for ultra-smooth movement
    // Font settings for consistent styling
    PLAYER_NAME_FONT: "Tickerbit",
    PLAYER_NAME_SIZE: "24px",
    PLAYER_NAME_COLOR: "#ffffff",
    PLAYER_NAME_BACKGROUND: "#00000050",
    PLAYER_NAME_PADDING: { x: 6, y: 0 },
    // NPC name styling (different color to distinguish from players)
    NPC_NAME_FONT: "Tickerbit",
    NPC_NAME_SIZE: "16px",
    NPC_NAME_COLOR: "#ffff00",
    NPC_NAME_BACKGROUND: "#00000080",
    NPC_NAME_PADDING: { x: 4, y: 2 },

    // Stock broker specific styling (cyan color)
    BROKER_NAME_COLOR: "#00ffff",
    // UI text styling
    UI_TEXT_FONT: "Pixeloid",
    UI_TEXT_SIZE: "16px",
    UI_TEXT_COLOR: "#ffffff",
    UI_TEXT_BACKGROUND: "#00000080",
    UI_TEXT_PADDING: { x: 8, y: 4 },
    // System message styling (connection status, etc.)
    SYSTEM_TEXT_FONT: "Pixeloid",
    SYSTEM_TEXT_SIZE: "18px",
    SYSTEM_TEXT_COLOR: "#ffffff",
    SYSTEM_TEXT_BACKGROUND: "#333333",
    SYSTEM_TEXT_PADDING: { x: 10, y: 5 },
    // Debug text styling
    DEBUG_TEXT_FONT: "Pixeloid",
    DEBUG_TEXT_SIZE: "14px",
    DEBUG_TEXT_COLOR: "#ffffff",
    DEBUG_TEXT_BACKGROUND: "#000000",
    DEBUG_TEXT_PADDING: { x: 4, y: 2 },

    // Dialog text styling
    DIALOG_TEXT_FONT: "Pixeloid",
    DIALOG_TEXT_SIZE: "18px",
    DIALOG_TEXT_COLOR: "#ffffff",

    DIALOG_INSTRUCTION_FONT: "Pixeloid",
    DIALOG_INSTRUCTION_SIZE: "16px",
    DIALOG_INSTRUCTION_COLOR: "#aaaaaa",

    // Debug settings
    SHOW_DEBUG_VISUALS: false,
    COLLISION_COLOR: 0xff0000,
    COLLISION_ALPHA: 0.3,
};
