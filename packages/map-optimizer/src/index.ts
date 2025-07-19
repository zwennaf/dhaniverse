// Main exports for the map optimizer package - simplified
export * from "./chunker/index";

// Re-export types
export type {
    ChunkMetadata,
    ChunkedMapMetadata,
    ChunkConfig,
    CacheConfig,
    LoadingPriority,
    PerformanceMetrics,
} from "./types/index.js";

export { CHUNK_PRIORITY } from "./types/index.js";
