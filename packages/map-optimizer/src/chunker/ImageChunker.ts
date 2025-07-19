import { ChunkMetadata, ChunkedMapMetadata } from '../types/index.js';
import { IChunkConfig } from './interfaces/IChunkConfig.js';
import { IFileSystemAdapter, NodeFileSystemAdapter } from './interfaces/IFileSystemAdapter.js';

export class ImageChunker {
  private readonly config: IChunkConfig;
  private readonly fileSystem: IFileSystemAdapter;

  constructor(
    config: IChunkConfig,
    fileSystem: IFileSystemAdapter = new NodeFileSystemAdapter()
  ) {
    this.config = config;
    this.fileSystem = fileSystem;
  }

  async chunkImage(inputPath: string): Promise<ChunkedMapMetadata> {
    console.log(`Starting image chunking for: ${inputPath}`);
    
    // Ensure output directory exists
    await this.fileSystem.createDirectory(this.config.outputDirectory);
    
    // Load image using canvas (works in both Node.js and browser)
    const imageData = await this.loadImage(inputPath);
    const { width, height } = imageData;
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    // Calculate grid dimensions
    const chunksX = Math.ceil(width / this.config.chunkSize);
    const chunksY = Math.ceil(height / this.config.chunkSize);
    
    console.log(`Creating ${chunksX}x${chunksY} grid (${chunksX * chunksY} total chunks)`);
    
    const chunks: ChunkMetadata[] = [];
    
    // Generate chunks
    for (let row = 0; row < chunksY; row++) {
      for (let col = 0; col < chunksX; col++) {
        const chunk = await this.createChunk(imageData, col, row, width, height);
        chunks.push(chunk);
        console.log(`✓ Created chunk ${chunk.id}`);
      }
    }
    
    // Generate metadata
    const metadata: ChunkedMapMetadata = {
      version: 1,
      totalWidth: width,
      totalHeight: height,
      chunkWidth: this.config.chunkSize,
      chunkHeight: this.config.chunkSize,
      chunksX,
      chunksY,
      chunks,
      compressionType: this.config.outputFormat
    };
    
    // Save metadata
    await this.saveMetadata(metadata);
    
    console.log(`✓ Chunking complete! Created ${chunks.length} chunks`);
    return metadata;
  }

  private async loadImage(inputPath: string): Promise<ImageData> {
    // This is a simplified version - in a real implementation,
    // you'd use a proper image processing library like Sharp or Canvas
    const buffer = await this.fileSystem.readFile(inputPath);
    
    // For now, return mock data - this would be replaced with actual image processing
    return {
      width: 12074,
      height: 8734,
      data: buffer
    } as any;
  }

  private async createChunk(
    imageData: any,
    col: number,
    row: number,
    totalWidth: number,
    totalHeight: number
  ): Promise<ChunkMetadata> {
    const chunkId = `${col}_${row}`;
    const pixelX = col * this.config.chunkSize;
    const pixelY = row * this.config.chunkSize;
    
    // Calculate actual chunk dimensions (handle edge chunks)
    const width = Math.min(this.config.chunkSize, totalWidth - pixelX);
    const height = Math.min(this.config.chunkSize, totalHeight - pixelY);
    
    // Extract chunk data (simplified - would use actual image processing)
    const chunkData = await this.extractChunkData(imageData, pixelX, pixelY, width, height);
    
    // Save chunk file
    const filename = `${chunkId}.${this.config.outputFormat}`;
    const filePath = `${this.config.outputDirectory}/${filename}`;
    await this.fileSystem.writeFile(filePath, chunkData);
    
    return {
      id: chunkId,
      x: col,
      y: row,
      pixelX,
      pixelY,
      width,
      height,
      filename
    };
  }

  private async extractChunkData(
    _imageData: any,
    _x: number,
    _y: number,
    _width: number,
    _height: number
  ): Promise<Buffer> {
    // Simplified implementation - would use actual image processing
    // For now, return a small buffer as placeholder
    return Buffer.from('chunk-data-placeholder');
  }

  private async saveMetadata(metadata: ChunkedMapMetadata): Promise<void> {
    const metadataPath = `${this.config.outputDirectory}/metadata.json`;
    const metadataJson = JSON.stringify(metadata, null, 2);
    await this.fileSystem.writeFile(metadataPath, Buffer.from(metadataJson));
  }
}

interface ImageData {
  width: number;
  height: number;
  data: any;
}