import { PreloadingStrategy, PreloadingConfig } from './IPreloadingStrategy.ts';

export class MovementBasedPreloader implements PreloadingStrategy {
  private config: PreloadingConfig;

  constructor(config: PreloadingConfig) {
    this.config = config;
  }

  calculatePreloadChunks(
    playerX: number,
    playerY: number,
    movementDirection: { x: number, y: number },
    chunkSize: { width: number, height: number },
    mapBounds: { chunksX: number, chunksY: number }
  ): string[] {
    const preloadChunks: string[] = [];
    
    // Calculate player's current chunk
    const playerChunkX = Math.floor(playerX / chunkSize.width);
    const playerChunkY = Math.floor(playerY / chunkSize.height);

    // Determine movement direction
    const isMovingRight = movementDirection.x > this.config.movementThreshold;
    const isMovingLeft = movementDirection.x < -this.config.movementThreshold;
    const isMovingDown = movementDirection.y > this.config.movementThreshold;
    const isMovingUp = movementDirection.y < -this.config.movementThreshold;

    // Calculate preload area based on movement
    let preloadStartX = playerChunkX - this.config.maxPreloadDistance;
    let preloadEndX = playerChunkX + this.config.maxPreloadDistance;
    let preloadStartY = playerChunkY - this.config.maxPreloadDistance;
    let preloadEndY = playerChunkY + this.config.maxPreloadDistance;

    // Extend preload area in movement direction
    if (isMovingRight) {
      preloadEndX += Math.floor(this.config.maxPreloadDistance * 0.5);
    }
    if (isMovingLeft) {
      preloadStartX -= Math.floor(this.config.maxPreloadDistance * 0.5);
    }
    if (isMovingDown) {
      preloadEndY += Math.floor(this.config.maxPreloadDistance * 0.5);
    }
    if (isMovingUp) {
      preloadStartY -= Math.floor(this.config.maxPreloadDistance * 0.5);
    }

    // Clamp to map bounds
    preloadStartX = Math.max(0, preloadStartX);
    preloadEndX = Math.min(mapBounds.chunksX - 1, preloadEndX);
    preloadStartY = Math.max(0, preloadStartY);
    preloadEndY = Math.min(mapBounds.chunksY - 1, preloadEndY);

    // Generate chunk IDs with priority ordering
    const priorityChunks: Array<{ id: string, priority: number }> = [];

    for (let y = preloadStartY; y <= preloadEndY; y++) {
      for (let x = preloadStartX; x <= preloadEndX; x++) {
        const chunkId = `${x}_${y}`;
        
        // Calculate priority based on distance and movement direction
        const distance = Math.sqrt(
          Math.pow(x - playerChunkX, 2) + Math.pow(y - playerChunkY, 2)
        );
        
        let priority = distance;
        
        // Boost priority for chunks in movement direction
        if (isMovingRight && x > playerChunkX) priority *= 0.7;
        if (isMovingLeft && x < playerChunkX) priority *= 0.7;
        if (isMovingDown && y > playerChunkY) priority *= 0.7;
        if (isMovingUp && y < playerChunkY) priority *= 0.7;
        
        // Boost priority for chunks within priority radius
        if (distance <= this.config.priorityRadius) {
          priority *= 0.5;
        }

        priorityChunks.push({ id: chunkId, priority });
      }
    }

    // Sort by priority (lower is better) and return chunk IDs
    return priorityChunks
      .sort((a, b) => a.priority - b.priority)
      .map(chunk => chunk.id);
  }

  updateConfig(config: Partial<PreloadingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PreloadingConfig {
    return { ...this.config };
  }
}