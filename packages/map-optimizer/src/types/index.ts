// Core type definitions for the map optimization system

export interface ChunkMetadata {
  id: string;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  filename: string;
  checksum?: string;
}

export interface ChunkedMapMetadata {
  version: number;
  totalWidth: number;
  totalHeight: number;
  chunkWidth: number;
  chunkHeight: number;
  chunksX: number;
  chunksY: number;
  chunks: ChunkMetadata[];
  compressionType?: string;
}

export interface ChunkConfig {
  chunkSize: number;
  outputFormat: 'png' | 'webp' | 'jpg';
  quality: number;
  enableCompression: boolean;
}

export interface CacheConfig {
  maxSizeInMB: number;
  maxChunks: number;
  evictionStrategy: 'LRU' | 'LFU' | 'FIFO';
  preloadRadius: number;
}

export interface LoadingPriority {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export const CHUNK_PRIORITY: LoadingPriority = {
  CRITICAL: 0,  // Currently visible
  HIGH: 1,      // Adjacent to visible
  MEDIUM: 2,    // In preload radius
  LOW: 3        // Background preload
} as const;

export interface ChunkLoadResult {
  success: boolean;
  chunk?: ChunkMetadata;
  error?: string;
  loadTime?: number;
}

export interface PerformanceMetrics {
  totalLoadTime: number;
  chunksLoaded: number;
  cacheHitRate: number;
  memoryUsage: number;
  averageLoadTime: number;
}