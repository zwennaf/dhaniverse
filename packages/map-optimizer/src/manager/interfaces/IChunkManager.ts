// Simple chunk manager interface for loading binary chunks
import { ChunkMetadata, ChunkedMapMetadata } from '../../types/index.js';

export interface IChunkManager {
  // Core operations
  initialize(metadata: ChunkedMapMetadata): Promise<void>;
  loadChunk(chunkId: string): Promise<HTMLImageElement>;
  getVisibleChunks(cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): string[];
}

export interface ChunkData {
  metadata: ChunkMetadata;
  imageElement: HTMLImageElement;
}