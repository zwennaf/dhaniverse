import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";

interface Player {
    id: string;
    username: string;
    x: number;
    y: number;
    animation: string;
}

const players = new Map<string, Player>();
const wss = new WebSocketServer(8080);

console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", function (ws) {
    const playerId = crypto.randomUUID();
    console.log("New client connected, ID:", playerId);

    ws.on("message", function (message) {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case "join":
                    // Initialize player with username
                    const player: Player = {
                        id: playerId,
                        username: data.username,
                        x: data.x,
                        y: data.y,
                        animation: 'idle-down'
                    };
                    players.set(playerId, player);

                    // Send join confirmation
                    ws.send(JSON.stringify({
                        type: "connect",
                        id: playerId,
                        player: player
                    }));

                    // Send existing players to the new player
                    ws.send(JSON.stringify({
                        type: "players",
                        players: Array.from(players.values())
                    }));

                    // Broadcast new player to others
                    wss.clients.forEach(client => {
                        if (client !== ws) {
                            client.send(JSON.stringify({
                                type: "playerJoined",
                                player: player
                            }));
                        }
                    });
                    break;

                case "update":
                    // Update player position and animation
                    const playerData = players.get(playerId);
                    if (playerData) {
                        playerData.x = data.x;
                        playerData.y = data.y;
                        playerData.animation = data.animation;
                        players.set(playerId, playerData);

                        // Broadcast to all other clients
                        wss.clients.forEach(client => {
                            if (client !== ws) {
                                client.send(JSON.stringify({
                                    type: "playerUpdate",
                                    player: playerData
                                }));
                            }
                        });
                    }
                    break;
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on("close", function () {
        console.log("Client disconnected, ID:", playerId);
        const player = players.get(playerId);
        // Remove player and notify others
        players.delete(playerId);
        wss.clients.forEach(client => {
            if (client !== ws) {
                client.send(JSON.stringify({
                    type: "playerDisconnect",
                    id: playerId,
                    username: player?.username
                }));
            }
        });
    });
});