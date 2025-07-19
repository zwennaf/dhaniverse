export interface PreloadingStrategy {
  calculatePreloadChunks(
    playerX: number,
    playerY: number,
    movementDirection: { x: number, y: number },
    chunkSize: { width: number, height: number },
    mapBounds: { chunksX: number, chunksY: number }
  ): string[];
}

export interface PreloadingConfig {
  maxPreloadDistance: number;
  movementThreshold: number;
  preloadDelay: number;
  priorityRadius: number;
}