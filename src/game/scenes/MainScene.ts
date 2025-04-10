import { Scene, Types, GameObjects } from 'phaser';
import { Player } from '../entities/Player.ts';
import { CollisionManager } from '../systems/CollisionManager.ts';
import { MapManager } from '../systems/MapManager.ts';
import { WebSocketManager } from '../systems/WebSocketManager.ts';
import { NPCManager } from '../systems/NPCManager.ts';
import { BuildingManager } from '../systems/BuildingManager.ts';
import { ExtendedCamera } from '../systems/MapManager.ts';

// Scene interface for type safety
export interface MainGameScene extends Scene {
  getGameContainer(): GameObjects.Container;
  getPlayer(): Player;
  getCursors(): Types.Input.Keyboard.CursorKeys;
  mapManager: MapManager;
}

export class MainScene extends Scene implements MainGameScene {
  private player!: Player;
  private cursors!: Types.Input.Keyboard.CursorKeys;
  private collisionManager!: CollisionManager;
  mapManager!: MapManager;
  private webSocketManager!: WebSocketManager;
  private npcManager!: NPCManager;
  private buildingManager!: BuildingManager;
  private gameContainer!: GameObjects.Container;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private loadingProgress: number = 0;
  private progressBar?: GameObjects.Graphics;
  private progressText?: GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // Create loading progress bar
    this.createProgressBar();
    
    // Load assets with paths relative to the public directory
    this.load.image('map', '/maps/finalmap.png');
    this.load.image('interior', '/maps/bank.gif');
    
    this.load.spritesheet('character', '/characters/orange_browncap_guy.png', { 
      frameWidth: 64,
      frameHeight: 64
    });
    
    this.load.json('collisionData', '/collisions/collisions.json');
    
    // Load the speech bubble sprite sheet with proper dimensions
    this.load.spritesheet('speech_bubble_grey', '/UI/speech_bubble_grey.png', { 
      frameWidth: 64, 
      frameHeight: 64 
    });
    
    // Track loading progress
    this.load.on('progress', (value: number) => {
      this.loadingProgress = value;
      this.updateProgressBar();
    });

    this.load.on('complete', () => {
      // Remove progress bar when loading is complete
      if (this.progressBar) {
        this.progressBar.destroy();
      }
      if (this.progressText) {
        this.progressText.destroy();
      }
    });
  }
