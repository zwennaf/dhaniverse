import { Scene, GameObjects } from 'phaser';
import { MainGameScene } from '../scenes/MainScene.ts';

interface MapCache {
  width: number;
  height: number;
}

export class MapManager {
  private scene: MainGameScene;
  private map: GameObjects.Image;
  private mapCache: MapCache;
  private isInBuilding: boolean = false;
  private lastOutdoorPosition: { x: number, y: number } | null = null;
  private textureLoadPromises: Map<string, Promise<void>> = new Map();

  constructor(scene: MainGameScene) {
    this.scene = scene;
    
    // Create map image with better origin setting for performance
    this.map = scene.add.image(0, 0, 'map');
    this.map.setOrigin(0, 0);
    
    // Store map dimensions in cache for quick access
    this.mapCache = {
      width: this.map.width,
      height: this.map.height
    };
    
    // Add to game container
    const gameContainer = scene.getGameContainer();
    gameContainer.add(this.map);
    
    // Set world bounds
    scene.physics.world.setBounds(0, 0, this.mapCache.width, this.mapCache.height);
    
    // Preload interior textures to avoid stutter when entering buildings
    this.preloadTextures();
  }

  private preloadTextures(): void {
    // Make sure the interior texture is ready before needed
    if (!this.scene.textures.exists('interior')) {
      const loadPromise = new Promise<void>((resolve) => {
        this.scene.load.once('complete', () => {
          resolve();
        });
        this.scene.load.image('interior', 'test.png');
        this.scene.load.start();
      });
      this.textureLoadPromises.set('interior', loadPromise);
    }
  }

  update(): void {
    // Update can be used later for map animations or effects
  }

  enterBuilding(playerX: number, playerY: number): { x: number, y: number } {
    // Store current position
    this.lastOutdoorPosition = { x: playerX, y: playerY };
    
    // Set building state
    this.isInBuilding = true;
    
    // Switch to interior map with improved depth sorting
    this.map.setTexture('interior');
    this.map.setDepth(-10); // Ensure map is behind all other elements
    
    // Get the center position for player placement
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Adjust world and camera bounds based on interior texture
    const interiorImage = this.scene.textures.get('interior');
    const width = interiorImage.source[0].width;
    const height = interiorImage.source[0].height;
    
    this.scene.physics.world.setBounds(0, 0, width, height);
    this.scene.cameras.main.setBounds(0, 0, width, height);
    
    // Apply smooth camera transition
    this.scene.cameras.main.pan(centerX, centerY, 500, 'Power2');
    
    return { x: centerX, y: centerY };
  }

  exitBuilding(): { x: number, y: number } | null {
    if (!this.lastOutdoorPosition) return null;
    
    // Reset building state
    this.isInBuilding = false;
    
    // Switch back to outdoor map
    this.map.setTexture('map');
    this.map.setDepth(-10); // Maintain consistent depth
    
    // Reset physics and camera bounds
    this.scene.physics.world.setBounds(0, 0, this.mapCache.width, this.mapCache.height);
    this.scene.cameras.main.setBounds(0, 0, this.mapCache.width, this.mapCache.height);
    
    // Apply smooth camera transition to outdoor position
    this.scene.cameras.main.pan(
      this.lastOutdoorPosition.x,
      this.lastOutdoorPosition.y, 
      500, 'Power2'
    );
    
    return this.lastOutdoorPosition;
  }

  getMapWidth(): number {
    return this.mapCache.width;
  }

  getMapHeight(): number {
    return this.mapCache.height;
  }

  isPlayerInBuilding(): boolean {
    return this.isInBuilding;
  }
}