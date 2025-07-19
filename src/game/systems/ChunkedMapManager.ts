import { Scene, GameObjects, Cameras } from 'phaser';
import { MainGameScene } from '../scenes/MainScene.ts';

interface MapCache {
  width: number;
  height: number;
}

interface ChunkMetadata {
  id: string;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  filename: string;
}

interface ChunkedMapMetadata {
  version: number;
  totalWidth: number;
  totalHeight: number;
  chunkWidth: number;
  chunkHeight: number;
  chunksX: number;
  chunksY: number;
  chunks: ChunkMetadata[];
}

// Extended camera interface to support zoom constraint properties
export interface ExtendedCamera extends Cameras.Scene2D.Camera {
  _origMinZoom?: number;
  _origMaxZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export class ChunkedMapManager {
  private scene: MainGameScene;
  private mapContainer: GameObjects.Container;
  private mapCache: MapCache;
  private isInBuilding: boolean = false;
  private currentBuildingType: 'bank' | 'stockmarket' | null = null;
  private lastOutdoorPosition: { x: number, y: number } | null = null;
  private textureLoadPromises: Map<string, Promise<void>> = new Map();
  
  // Chunk management
  private chunkMetadata: ChunkedMapMetadata | null = null;
  private loadedChunks: Map<string, GameObjects.Image> = new Map();

  constructor(scene: MainGameScene) {
    this.scene = scene;
    
    // Create container for map chunks
    this.mapContainer = scene.add.container(0, 0);
    
    // Store map dimensions in cache for quick access (will be set after metadata loads)
    this.mapCache = {
      width: 12074, // Default values, will be updated
      height: 8734
    };
    
    // Add to game container
    const gameContainer = scene.getGameContainer();
    gameContainer.add(this.mapContainer);
    
    // Initialize chunks
    this.initializeChunks();
    
    // Preload interior textures to avoid stutter when entering buildings
    this.preloadTextures();
  }

  private async initializeChunks(): Promise<void> {
    try {
      await this.loadChunkMetadata();
      await this.loadInitialChunks();
    } catch (error) {
      console.error('Failed to initialize chunks:', error);
      this.createFallbackMap();
    }
  }

  private async loadChunkMetadata(): Promise<void> {
    try {
      const response = await fetch('/maps/chunks/metadata.json');
      this.chunkMetadata = await response.json();
      
      if (this.chunkMetadata) {
        // Update map cache with actual dimensions
        this.mapCache = {
          width: this.chunkMetadata.totalWidth,
          height: this.chunkMetadata.totalHeight
        };
        
        // Set world bounds
        this.scene.physics.world.setBounds(0, 0, this.mapCache.width, this.mapCache.height);
        
        console.log(`Loaded chunk metadata: ${this.chunkMetadata.chunksX}x${this.chunkMetadata.chunksY} grid`);
      }
    } catch (error) {
      console.error('Failed to load chunk metadata:', error);
    }
  }

  private async loadInitialChunks(): Promise<void> {
    if (!this.chunkMetadata) return;
    
    console.log('Loading initial chunks...');
    
    // Load only the first 4 chunks for proof of concept
    const initialChunks = this.chunkMetadata.chunks.slice(0, 4);
    
    for (const chunk of initialChunks) {
      await this.loadChunkSimple(chunk);
    }
    
    console.log(`Loaded ${this.loadedChunks.size} initial chunks`);
  }

  private async loadChunkSimple(chunk: ChunkMetadata): Promise<void> {
    try {
      const textureKey = `chunk_${chunk.id}`;
      
      // Skip if already loaded
      if (this.scene.textures.exists(textureKey)) {
        this.createChunkImage(chunk, textureKey);
        return;
      }
      
      // Create a simple image element to load the chunk
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Add texture to Phaser
            this.scene.textures.addImage(textureKey, img);
            this.createChunkImage(chunk, textureKey);
            console.log(`✓ Chunk ${chunk.id} loaded`);
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error(`Failed to load image: /maps/chunks/${chunk.filename}`));
        };
        
        img.src = `/maps/chunks/${chunk.filename}`;
      });
      
    } catch (error) {
      console.error(`Failed to load chunk ${chunk.id}:`, error);
    }
  }

  private createChunkImage(chunk: ChunkMetadata, textureKey: string): void {
    // Create image object for this chunk
    const chunkImage = this.scene.add.image(chunk.pixelX, chunk.pixelY, textureKey);
    chunkImage.setOrigin(0, 0); // Top-left origin like the original
    chunkImage.setDepth(-10); // Behind other elements
    
    // Add to container
    this.mapContainer.add(chunkImage);
    
    // Store reference
    this.loadedChunks.set(chunk.id, chunkImage);
  }

  private createFallbackMap(): void {
    console.log('Creating fallback map...');
    // Create a simple colored rectangle as fallback
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x228B22); // Forest green
    graphics.fillRect(0, 0, this.mapCache.width, this.mapCache.height);
    graphics.setDepth(-10);
    this.mapContainer.add(graphics);
  }

  private preloadTextures(): void {
    // Make sure the bank interior texture is ready before needed
    if (!this.scene.textures.exists('interior')) {
      const bankLoadPromise = new Promise<void>((resolve) => {
        this.scene.load.once('complete', () => {
          console.log('Bank interior texture loaded successfully');
          resolve();
        });
        this.scene.load.image('interior', 'test.png');
        
        // Preload door sound effects
        if (!this.scene.cache.audio.exists('door-open')) {
          this.scene.load.audio('door-open', 'assets/sounds/door-open.mp3');
        }
        if (!this.scene.cache.audio.exists('door-close')) {
          this.scene.load.audio('door-close', 'assets/sounds/door-close.mp3');
        }
        
        this.scene.load.start();
      });
      this.textureLoadPromises.set('interior', bankLoadPromise);
    }
    
    // Make sure the stock market interior texture is ready
    if (!this.scene.textures.exists('stockmarket')) {
      const stockMarketLoadPromise = new Promise<void>((resolve) => {
        this.scene.load.once('complete', () => {
          console.log('Stock market interior texture loaded successfully');
          resolve();
        });
        this.scene.load.image('stockmarket', '/maps/stockmarket.png');
        this.scene.load.start();
      });
      this.textureLoadPromises.set('stockmarket', stockMarketLoadPromise);
    }
  }

  enterBuilding(playerX: number, playerY: number, buildingType: 'bank' | 'stockmarket' = 'bank'): { x: number, y: number } {
    try {
      // Store current position
      this.lastOutdoorPosition = { x: playerX, y: playerY };
      
      // Set building state - do this first to prevent any rendering issues
      this.isInBuilding = true;
      this.currentBuildingType = buildingType;
      
      // Hide the chunked map container
      this.mapContainer.setVisible(false);
      
      // Create temporary single image for interior (same as original logic)
      const textureKey = buildingType === 'bank' ? 'interior' : 'stockmarket';
      
      // Create interior map image
      const interiorMap = this.scene.add.image(0, 0, textureKey);
      interiorMap.setDepth(-10);
      interiorMap.setOrigin(0.5, 0.5);
      
      // Apply a larger scale to make the map bigger
      const scale = 2.3;
      interiorMap.setScale(scale);
      
      // Get the device dimensions
      const deviceWidth = this.scene.scale.width;
      const deviceHeight = this.scene.scale.height;
      
      // Get interior dimensions
      let interiorWidth = 800;
      let interiorHeight = 600;
      
      if (this.scene.textures.exists(textureKey)) {
        const interiorImage = this.scene.textures.get(textureKey);
        if (interiorImage && interiorImage.source && interiorImage.source[0]) {
          interiorWidth = interiorImage.source[0].width;
          interiorHeight = interiorImage.source[0].height;
        }
      }
      
      // Apply scale factor to calculate the actual displayed dimensions
      const scaledWidth = interiorWidth * scale;
      const scaledHeight = interiorHeight * scale;
      
      // Position the interior map precisely at the center
      const centerX = Math.floor(deviceWidth / 2);
      const centerY = Math.floor(deviceHeight / 2);
      interiorMap.setPosition(centerX, centerY);
      
      // Set camera and physics bounds to match the scaled interior size and position
      const boundsX = centerX - (scaledWidth / 2);
      const boundsY = centerY - (scaledHeight / 2);
      
      this.scene.physics.world.setBounds(
        boundsX,
        boundsY,
        scaledWidth,
        scaledHeight
      );
      
      this.scene.cameras.main.setBounds(
        boundsX,
        boundsY,
        scaledWidth,
        scaledHeight
      );
      
      // Simple, fixed maxZoom for interior areas
      const maxZoom = 0.7;
      
      // Get camera and set zoom
      const camera = this.scene.cameras.main as ExtendedCamera;
      camera.setZoom(maxZoom);
      
      // Store camera settings for restoration later
      camera._origMinZoom = camera.minZoom || 0.25;
      camera._origMaxZoom = camera.maxZoom || 2.0;
      
      // Set both minZoom and maxZoom to the same value to lock zoom
      camera.minZoom = maxZoom;
      camera.maxZoom = maxZoom;
      
      // Store reference to interior map for cleanup
      (this as any).currentInteriorMap = interiorMap;
      
      return { x: centerX, y: centerY };
    } catch (error) {
      console.error('Error entering building:', error);
      this.isInBuilding = false;
      this.currentBuildingType = null;
      return { x: playerX, y: playerY };
    }
  }

  exitBuilding(): { x: number, y: number } | null {
    if (!this.lastOutdoorPosition) return null;
    
    // Reset building state immediately
    this.isInBuilding = false;
    this.currentBuildingType = null;
    
    // Clean up interior map
    if ((this as any).currentInteriorMap) {
      (this as any).currentInteriorMap.destroy();
      (this as any).currentInteriorMap = null;
    }
    
    // Show the chunked map container again
    this.mapContainer.setVisible(true);
    
    // Restore original min/max zoom constraints if they were saved
    const camera = this.scene.cameras.main as ExtendedCamera;
    
    if (camera._origMinZoom !== undefined && camera._origMaxZoom !== undefined) {
      camera.minZoom = camera._origMinZoom;
      camera.maxZoom = camera._origMaxZoom;
      
      // Reset zoom to a comfortable default value
      camera.setZoom(0.7);
    }
    
    // Reset physics world bounds to outdoor map dimensions
    this.scene.physics.world.setBounds(0, 0, this.mapCache.width, this.mapCache.height);
    
    // Use the main scene's setupCameraBounds method for consistent camera bounds handling
    if (this.scene instanceof Scene) {
      const sceneWithBounds = this.scene as { setupCameraBounds?: () => void };
      if (typeof sceneWithBounds.setupCameraBounds === 'function') {
        sceneWithBounds.setupCameraBounds();
      } else {
        this.setDefaultCameraBounds();
      }
    } else {
      this.setDefaultCameraBounds();
    }
    
    return this.lastOutdoorPosition;
  }
  
  // Fallback method for setting camera bounds
  private setDefaultCameraBounds(): void {
    const camera = this.scene.cameras.main as ExtendedCamera;
    const zoom = camera.zoom || 0.7;
    
    // Calculate the visible area based on zoom level
    const visibleWidth = camera.width / zoom;
    const visibleHeight = camera.height / zoom;
    
    // Calculate the bounds with half the visible area as padding
    const boundsX = Math.min(visibleWidth / 2, this.mapCache.width / 4);
    const boundsY = Math.min(visibleHeight / 2, this.mapCache.height / 4);
    const boundsWidth = Math.max(0, this.mapCache.width - visibleWidth);
    const boundsHeight = Math.max(0, this.mapCache.height - visibleHeight);
    
    // Set camera bounds
    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
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
  
  getCurrentBuildingType(): 'bank' | 'stockmarket' | null {
    return this.currentBuildingType;
  }
}