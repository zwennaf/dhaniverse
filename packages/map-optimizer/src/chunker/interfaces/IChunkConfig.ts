// Configuration interface for chunk generation
export interface IChunkConfig {
  readonly chunkSize: number;
  readonly outputFormat: 'png' | 'webp' | 'jpg';
  readonly quality: number;
  readonly enableCompression: boolean;
  readonly outputDirectory: string;
}

export class ChunkConfig implements IChunkConfig {
  constructor(
    public readonly chunkSize: number = 1024,
    public readonly outputFormat: 'png' | 'webp' | 'jpg' = 'webp',
    public readonly quality: number = 90,
    public readonly enableCompression: boolean = true,
    public readonly outputDirectory: string = './chunks'
  ) {}

  static createDefault(): ChunkConfig {
    return new ChunkConfig();
  }

  static createOptimized(): ChunkConfig {
    return new ChunkConfig(
      512,    // Smaller chunks for better loading
      'webp', // Better compression
      85,     // Good quality/size balance
      true,   // Enable compression
      './chunks'
    );
  }
}