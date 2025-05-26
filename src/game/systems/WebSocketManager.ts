import { GameObjects } from 'phaser';
import { Player } from '../entities/Player.ts';
import { Constants } from '../utils/Constants.ts';
import { MainGameScene } from '../scenes/MainScene.ts';

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

export class WebSocketManager {
  private scene: MainGameScene;
  private player: Player;
  private ws: WebSocket | null = null;
  private playerId: string | null = null;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 50; // ms between position updates
  private connected: boolean = false;
  private connectionStatusText: GameObjects.Text | null = null;
  private roomCode: string = '';
  private intentionalDisconnect: boolean = false;

  constructor(scene: MainGameScene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    // Create connection status text that will appear if connection issues occur
    this.connectionStatusText = this.scene.add.text(
      this.scene.cameras.main.width / 2, 
      20, 
      'Connecting...', 
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000).setVisible(false);
    
    // Update position on resize
    this.scene.scale.on('resize', () => {
      if (this.connectionStatusText) {
        this.connectionStatusText.setPosition(this.scene.cameras.main.width / 2, 20);
      }
    });
  }  connect(username: string): void {
    // Don't connect if already connected or connecting
    if (this.connected || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Already connected or connecting, ignoring connect request');
      return;
    }

    // Close existing connection if it exists
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.log('Closing existing WebSocket connection before creating new one');
      this.intentionalDisconnect = true;
      this.ws.close();
      this.ws = null;
    }

    // Reset intentional disconnect flag for new connection
    this.intentionalDisconnect = false;

    if (this.connectionStatusText) {
      this.connectionStatusText.setText('Connecting...').setVisible(true);
    }
    
    // Get room code from game registry
    this.roomCode = this.scene.game.registry.get('roomCode') || '';

    try {
      // Construct WebSocket URL with room code if available
      const wsUrl = this.roomCode 
        ? `${Constants.WS_SERVER_URL}?room=${encodeURIComponent(this.roomCode)}`
        : Constants.WS_SERVER_URL;
        
      console.log(`Connecting to WebSocket server: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        
        if (this.connectionStatusText) {
          const statusText = this.roomCode 
            ? `Connected to room: ${this.roomCode}` 
            : 'Connected';
          this.connectionStatusText.setText(statusText).setVisible(true);
          // Hide after 2 seconds
          this.scene.time.delayedCall(2000, () => {
            if (this.connectionStatusText) {
              this.connectionStatusText.setVisible(false);
            }
          });
        }        // Send authentication message with token and username
        const token = localStorage.getItem('dhaniverse_token');
        if (!token) {
          console.error('No authentication token found');
          this.ws?.close();
          return;
        }

        this.ws?.send(JSON.stringify({
          type: "authenticate",
          token: token,
          gameUsername: username
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };      this.ws.onclose = (event) => {
        this.connected = false;
        
        // Don't reconnect if this was an intentional disconnect
        if (this.intentionalDisconnect) {
          console.log('WebSocket closed intentionally, not reconnecting');
          return;
        }

        // Check close code - 1000 means normal closure, 4000 means duplicate connection
        if (event.code === 1000 || event.code === 4000) {
          console.log(`WebSocket closed normally (code: ${event.code}), not reconnecting`);
          if (event.code === 4000) {
            console.log('Duplicate connection detected by server');
          }
          return;
        }

        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        
        if (this.connectionStatusText) {
          this.connectionStatusText.setText('Connection lost. Reconnecting...').setVisible(true);
        }
        
        this.handleReconnect(username);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.connectionStatusText) {
          this.connectionStatusText.setText('Connection error. Reconnecting...').setVisible(true);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
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
        console.log(`Received players list, my ID: ${this.playerId}, players:`, data.players);
        this.handleExistingPlayers(data.players);
        break;
        
      case "playerJoined":
        this.handlePlayerJoined(data.player);
        break;
        
      case "playerUpdate":
        this.handlePlayerUpdate(data.player);
        break;
        
      case "playerDisconnect":
        this.handlePlayerDisconnect(data.id, data.username);
        break;

      case "chat":
        // Dispatch incoming chat messages to the UI
        window.dispatchEvent(new CustomEvent('chat-message', { detail: { id: data.id, username: data.username, message: data.message } }));
        break;
        
      default:
        console.warn(`Unknown message type: ${(data as ServerMessageBase).type}`);
    }
  }

  private handleExistingPlayers(players: PlayerData[]): void {
    players.forEach(playerData => {
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
  private handleReconnect(username: string): void {
    // Don't reconnect if already connected or reconnecting
    if (this.connected || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (!this.connected && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
          console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
          this.connect(username);
        }
      }, Constants.WS_RECONNECT_DELAY);
    } else {
      if (this.connectionStatusText) {
        this.connectionStatusText.setText('Could not connect to server. Please try again later.').setVisible(true);
      }
      console.error('Max reconnect attempts reached');
    }
  }

  update(): void {
    // Update other players' positions with interpolation
    const time = this.scene.time.now;
    this.otherPlayers.forEach((otherPlayer) => {
      if (otherPlayer.targetX !== undefined && otherPlayer.targetY !== undefined) {
        // Interpolate position for smoother movement
        otherPlayer.sprite.x = Phaser.Math.Linear(
          otherPlayer.sprite.x, 
          otherPlayer.targetX, 
          0.2
        );
        
        otherPlayer.sprite.y = Phaser.Math.Linear(
          otherPlayer.sprite.y, 
          otherPlayer.targetY, 
          0.2
        );
        
        // Update username text
        otherPlayer.nameText.x = otherPlayer.sprite.x;
        otherPlayer.nameText.y = otherPlayer.sprite.y - 50;
      }
    });

    // Send player position update to server
    if (this.ws?.readyState === WebSocket.OPEN && time - this.lastUpdateTime > this.updateInterval) {
      this.lastUpdateTime = time;
      
      const currentPosition = this.player.getPosition();
      const lastSentPosition = this.player.getLastSentPosition();
      const currentAnimation = this.player.getCurrentAnimation();
      const lastSentAnimation = this.player.getLastSentAnimation();
      
      // Only send updates when position changes significantly or animation changes
      if (!lastSentPosition || 
          Math.abs(currentPosition.x - lastSentPosition.x) > Constants.WS_POSITION_THRESHOLD ||
          Math.abs(currentPosition.y - lastSentPosition.y) > Constants.WS_POSITION_THRESHOLD ||
          currentAnimation !== lastSentAnimation) {
        
        this.ws.send(JSON.stringify({
          type: "update",
          x: currentPosition.x,
          y: currentPosition.y,
          animation: currentAnimation
        }));
        
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
      return;
    }
    
    const otherPlayer = this.scene.add.sprite(playerData.x, playerData.y, 'character');
    otherPlayer.setScale(5);
    
    // Add username text above player
    const nameText = this.scene.add.text(playerData.x, playerData.y - 50, playerData.username, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    
    this.otherPlayers.set(playerData.id, { 
      sprite: otherPlayer, 
      nameText, 
      targetX: playerData.x,
      targetY: playerData.y,
      lastUpdate: this.scene.time.now
    });
    
    // Add to game container
    const gameContainer = this.scene.getGameContainer();
    if (gameContainer) {
      gameContainer.add(otherPlayer);
      gameContainer.add(nameText);
    }

    // Set initial animation if provided
    if (playerData.animation) {
      otherPlayer.anims.play(playerData.animation);
    } else {
      otherPlayer.anims.play('idle-down');
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
  }  // Cleanly close the WebSocket connection
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
      
      console.log('WebSocket connection closed and all players cleared');
    }
  }

  public sendChat(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "chat", message }));
    }
  }
}