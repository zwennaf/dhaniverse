// Simple chunk parser interface for binary chunks
export interface IChunkParser {
  parseMetadata(data: Uint8Array): ChunkedMapHeader;
  loadChunkImage(chunkPath: string): Promise<HTMLImageElement>;
}

// Simplified data structures
export interface ChunkedMapHeader {
  version: number;
  totalWidth: number;
  totalHeight: number;
  chunkWidth: number;
  chunkHeight: number;
  chunksX: number;
  chunksY: number;
  imageFormat: string;
}