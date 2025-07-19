import { PreloadingStrategy, PreloadingConfig } from './IPreloadingStrategy.ts';
import { MovementBasedPreloader } from './MovementBasedPreloader.ts';
import { PriorityQueue } from './PriorityQueue.ts';

export interface PreloadRequest {
  chunkId: string;
  chunkX: number;
  chunkY: number;
  priority: number;
}

export interface PreloadingMetrics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageLoadTime: number;
  cacheHitRate: number;
  queueSize: number;
}

export class PreloadingManager {
  private strategy: PreloadingStrategy;
  private loadQueue: PriorityQueue<PreloadRequest>;
  private isProcessing: boolean = false;
  private metrics: PreloadingMetrics;
  private loadTimes: number[] = [];
  private maxLoadTimeHistory: number = 100;

  // Callbacks
  private onChunkLoad?: (chunkX: number, chunkY: number) => Promise<void>;
  private onLoadComplete?: (chunkId: string, success: boolean, loadTime: number) => void;

  constructor(
    config: PreloadingConfig,
    onChunkLoad?: (chunkX: number, chunkY: number) => Promise<void>,
    onLoadComplete?: (chunkId: string, success: boolean, loadTime: number) => void
  ) {
    this.strategy = new MovementBasedPreloader(config);
    this.loadQueue = new PriorityQueue<PreloadRequest>(50);
    this.onChunkLoad = onChunkLoad;
    this.onLoadComplete = onLoadComplete;
    
    this.metrics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      queueSize: 0
    };
  }

  public requestPreload(
    playerX: number,
    playerY: number,
    movementDirection: { x: number, y: number },
    chunkSize: { width: number, height: number },
    mapBounds: { chunksX: number, chunksY: number },
    excludeChunks: Set<string> = new Set()
  ): void {
    const preloadChunks = this.strategy.calculatePreloadChunks(
      playerX,
      playerY,
      movementDirection,
      chunkSize,
      mapBounds
    );

    // Add chunks to queue with priority
    preloadChunks.forEach((chunkId, index) => {
      if (excludeChunks.has(chunkId)) return;

      const [x, y] = chunkId.split('_').map(Number);
      const priority = index; // Lower index = higher priority

      const request: PreloadRequest = {
        chunkId,
        chunkX: x,
        chunkY: y,
        priority
      };

      // Only add if not already in queue
      if (!this.loadQueue.contains(req => req.chunkId === chunkId)) {
        this.loadQueue.enqueue(request, priority);
        this.metrics.totalRequests++;
      }
    });

    this.metrics.queueSize = this.loadQueue.size();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    while (!this.loadQueue.isEmpty()) {
      const request = this.loadQueue.dequeue();
      if (!request) break;

      await this.processRequest(request);
      
      // Small delay to prevent blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  private async processRequest(request: PreloadRequest): Promise<void> {
    const startTime = Date.now();
    let success = false;

    try {
      if (this.onChunkLoad) {
        await this.onChunkLoad(request.chunkX, request.chunkY);
        success = true;
        this.metrics.completedRequests++;
      }
    } catch (error) {
      console.warn(`Failed to preload chunk ${request.chunkId}:`, error);
      this.metrics.failedRequests++;
    }

    const loadTime = Date.now() - startTime;
    this.recordLoadTime(loadTime);

    if (this.onLoadComplete) {
      this.onLoadComplete(request.chunkId, success, loadTime);
    }

    this.metrics.queueSize = this.loadQueue.size();
  }

  private recordLoadTime(loadTime: number): void {
    this.loadTimes.push(loadTime);
    
    // Keep only recent load times
    if (this.loadTimes.length > this.maxLoadTimeHistory) {
      this.loadTimes = this.loadTimes.slice(-this.maxLoadTimeHistory);
    }

    // Update average
    this.metrics.averageLoadTime = 
      this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length;
  }

  public clearQueue(): void {
    this.loadQueue.clear();
    this.metrics.queueSize = 0;
  }

  public getMetrics(): PreloadingMetrics {
    return { ...this.metrics };
  }

  public updateStrategy(config: Partial<PreloadingConfig>): void {
    if (this.strategy instanceof MovementBasedPreloader) {
      this.strategy.updateConfig(config);
    }
  }

  public setStrategy(strategy: PreloadingStrategy): void {
    this.strategy = strategy;
  }

  public getQueueSize(): number {
    return this.loadQueue.size();
  }

  public isQueueEmpty(): boolean {
    return this.loadQueue.isEmpty();
  }

  public getQueuedChunks(): string[] {
    return this.loadQueue.toArray().map(req => req.chunkId);
  }

  // Clean up old requests that might be stale
  public cleanupStaleRequests(maxAge: number = 30000): number {
    return this.loadQueue.removeStaleItems(maxAge);
  }
}