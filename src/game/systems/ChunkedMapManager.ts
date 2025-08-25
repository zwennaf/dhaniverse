import { Scene, GameObjects, Cameras } from "phaser";
import { MainGameScene } from "../scenes/MainScene.ts";
import { PhaserChunkContainer } from "./PhaserChunkContainer.ts";
import { PreloadingManager } from "./preloading/PreloadingManager.ts";
import { PreloadingConfig } from "./preloading/IPreloadingStrategy.ts";
import { ErrorHandlerChain } from "./error-handling/ErrorHandlerChain.ts";
import { getChunkDataUrl, storeChunk } from "../cache/mapChunkCache.ts";
import { getPersistentChunkBlob, storePersistentChunk } from "../cache/persistentChunkStore.ts";
import { dialogueManager } from "../../services/DialogueManager.ts";

// Global flag to persist all loaded chunks in memory & storage without eviction.
// Set true per user requirement to "store forever". Can be toggled for debugging.
const ALWAYS_KEEP_CHUNKS = true;

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
    private mapContainer: PhaserChunkContainer;
    private mapCache: MapCache;
    private isInBuilding: boolean = false;
    private currentBuildingType: "bank" | "stockmarket" | null = null;
    private lastOutdoorPosition: { x: number; y: number } | null = null;
    private textureLoadPromises: Map<string, Promise<void>> = new Map();

    // Chunk management
    private chunkMetadata: ChunkedMapMetadata | null = null;
    private loadedChunks: Map<string, GameObjects.Image> = new Map();

    // Dynamic loading system
    private visibleChunks: Set<string> = new Set();
    private loadingChunks: Set<string> = new Set();
    private viewDistance: number = 2; // How many chunks to load in each direction
    private lastCheckedChunkId: string = "";
    
    // Continuous async loading system
    private continuousLoadingActive: boolean = false;
    private loadingInterval: number | null = null;
    private chunkSize: { width: number; height: number } = {
        width: 0,
        height: 0,
    };
    private lastPlayerPosition: { x: number; y: number } = { x: 0, y: 0 };
    private playerMovementDirection: { x: number; y: number } = { x: 0, y: 0 };

    // Memory management - reduce to prevent overwhelming the system
    private maxLoadedChunks: number = 40; // Reduced from 50 (ignored when ALWAYS_KEEP_CHUNKS)
    private maxConcurrentLoads: number = 2; // Reduced from 4 to prevent stuttering
    private chunkAccessTimes: Map<string, number> = new Map(); // LRU tracking
    private inFlightLoads: Map<string, Promise<void>> = new Map(); // de-dupe simultaneous requests
    private lastRequestTimes: Map<string, number> = new Map(); // throttle rapid re-requests
    private minConcurrentLoads: number = 1;
    private maxAdaptiveConcurrentLoads: number = 4; // upper bound when network is good
    private recentLoadDurations: number[] = []; // ms durations for adaptive tuning
    private adaptiveTuningInterval: number | null = null;

    // Error handling
    private failedChunks: Map<string, number> = new Map(); // Track failed chunks and retry count
    private maxRetries: number = 3;

    // Preloading system
    private preloadingManager: PreloadingManager;

    // Error handling system
    private errorHandler: ErrorHandlerChain;

    constructor(scene: MainGameScene) {
        this.scene = scene;
    // Global flag to keep every chunk permanently in this session as soon as loaded.
    // For now always true per requirement.
        

        // Create specialized container for map chunks with smooth transitions
        this.mapContainer = new PhaserChunkContainer(scene, 0, 0);

        // Store map dimensions in cache for quick access (will be set after metadata loads)
        this.mapCache = {
            width: 12074, // Default values, will be updated
            height: 8734,
        };

        // Initialize smart preloading system with gradual loading
        const preloadConfig: PreloadingConfig = {
            maxPreloadDistance: 4, // Moderate distance for balanced loading
            movementThreshold: 3, // Lower threshold for more responsive detection
            preloadDelay: 150, // Balanced delay for smooth loading
            priorityRadius: 2, // Focus on immediate area first
        };

        this.preloadingManager = new PreloadingManager(
            preloadConfig,
            (chunkX, chunkY) => this.loadChunkByIdWithPriority(chunkX, chunkY, "low"),
            (chunkId, success, loadTime) => {
                if (success) {
                    console.log(`Smart loaded chunk ${chunkId} in ${loadTime}ms`);
                }
            }
        );

        // Initialize error handling system
        this.errorHandler = new ErrorHandlerChain();

        // Set up global error handling for WebGL issues
        this.setupGlobalErrorHandling();

        // Add to game container
        const gameContainer = scene.getGameContainer();
        gameContainer.add(this.mapContainer);

        // Initialize chunks
        this.initializeChunks();

        // Preload interior textures to avoid stutter when entering buildings
        this.preloadTextures();
        
        // Start continuous loading system
        this.startContinuousLoading();

        // Apply initial network-based tuning
        this.applyNetworkHeuristics();
        // Start periodic adaptive tuning
        this.startAdaptiveTuning();
    }

    /**
     * Use browser network information (if available) to set conservative defaults
     * for slow connections and more aggressive ones for fast networks.
     */
    private applyNetworkHeuristics(): void {
        const navAny = navigator as any;
        const connection: any = navAny?.connection || navAny?.mozConnection || navAny?.webkitConnection;
        const type: string | undefined = connection?.effectiveType;
        if (type) {
            if (type === 'slow-2g' || type === '2g') {
                this.viewDistance = 1;
                this.maxConcurrentLoads = 1;
            } else if (type === '3g') {
                this.viewDistance = 2;
                this.maxConcurrentLoads = 2;
            } else if (type === '4g') {
                this.viewDistance = 2;
                this.maxConcurrentLoads = 3;
            }
        }
    }

    /** Adaptive tuning based on recent average load duration. */
    private startAdaptiveTuning(): void {
        if (this.adaptiveTuningInterval) return;
        this.adaptiveTuningInterval = window.setInterval(() => {
            this.adjustLoadingStrategy();
        }, 4000); // adjust every 4s
    }

    private stopAdaptiveTuning(): void {
        if (this.adaptiveTuningInterval) {
            clearInterval(this.adaptiveTuningInterval);
            this.adaptiveTuningInterval = null;
        }
    }

    private recordLoadDuration(ms: number): void {
        this.recentLoadDurations.push(ms);
        if (this.recentLoadDurations.length > 20) {
            this.recentLoadDurations.shift();
        }
    }

    private adjustLoadingStrategy(): void {
        if (!this.recentLoadDurations.length) return;
        const avg = this.recentLoadDurations.reduce((a,b)=>a+b,0)/this.recentLoadDurations.length;
        // If loads are very fast, cautiously increase concurrency
        if (avg < 250 && this.maxConcurrentLoads < this.maxAdaptiveConcurrentLoads) {
            this.maxConcurrentLoads++;
            // console.log(`[ChunkedMapManager] Increasing concurrency -> ${this.maxConcurrentLoads} (avg ${avg.toFixed(0)}ms)`);
        } else if (avg > 900 && this.maxConcurrentLoads > this.minConcurrentLoads) {
            this.maxConcurrentLoads--;
            // console.log(`[ChunkedMapManager] Decreasing concurrency -> ${this.maxConcurrentLoads} (avg ${avg.toFixed(0)}ms)`);
        }
        // Clear durations so next window is fresh
        this.recentLoadDurations = [];
    }

    private async initializeChunks(): Promise<void> {
        try {
            await this.loadChunkMetadata();
            await this.loadInitialChunks();
        } catch (error) {
            console.error("Failed to initialize chunks:", error);
            this.createFallbackMap();
        }
    }

    private async loadChunkMetadata(): Promise<void> {
        try {
            const response = await fetch("/maps/chunks/metadata.json");
            this.chunkMetadata = await response.json();

            if (this.chunkMetadata) {
                // Update map cache with actual dimensions
                this.mapCache = {
                    width: this.chunkMetadata.totalWidth,
                    height: this.chunkMetadata.totalHeight,
                };

                // Set world bounds
                this.scene.physics.world.setBounds(
                    0,
                    0,
                    this.mapCache.width,
                    this.mapCache.height
                );

                console.log(
                    `Loaded chunk metadata: ${this.chunkMetadata.chunksX}x${this.chunkMetadata.chunksY} grid`
                );
            }
        } catch (error) {
            console.error("Failed to load chunk metadata:", error);
        }
    }

    private async loadInitialChunks(): Promise<void> {
        if (!this.chunkMetadata) return;

        console.log("Loading initial chunks...");

        // Store chunk size for convenience
        this.chunkSize = {
            width: this.chunkMetadata.chunkWidth,
            height: this.chunkMetadata.chunkHeight,
        };

        // Get player position for initial chunk loading
        const player = this.scene.getPlayer();
        const playerPos = player.getPosition();

        // Update visible chunks based on player position
        this.updateVisibleChunks(playerPos.x, playerPos.y);

        console.log(`Loaded ${this.loadedChunks.size} initial chunks`);
    }

    // Smart async loading system
    private startContinuousLoading(): void {
        if (this.continuousLoadingActive) return;
        
        this.continuousLoadingActive = true;
        console.log("Starting smart chunk loading system");
        
        // Start the smart loading loop with longer intervals to prevent stuttering
        this.loadingInterval = window.setInterval(() => {
            this.performSmartLoading();
        }, 1000); // Load chunks every 1 second for smoother performance
    }
    
    private stopContinuousLoading(): void {
        this.continuousLoadingActive = false;
        if (this.loadingInterval !== null) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        console.log("Stopped smart chunk loading system");
    }
    
    private performSmartLoading(): void {
        if (!this.chunkMetadata || this.isInBuilding) return;
        
        const player = this.scene.getPlayer();
        if (!player) return;
        
        const playerPos = player.getPosition();
        
        // Use the existing preloading manager for smart loading
        this.preloadingManager.requestPreload(
            playerPos.x,
            playerPos.y,
            this.playerMovementDirection,
            this.chunkSize,
            {
                chunksX: this.chunkMetadata.chunksX,
                chunksY: this.chunkMetadata.chunksY,
            },
            new Set([
                ...this.loadedChunks.keys(),
                ...this.loadingChunks,
            ])
        );
    }

    private async loadChunkSimple(chunk: ChunkMetadata): Promise<void> {
        const retryCount = this.failedChunks.get(chunk.id) || 0;

        try {
            const textureKey = `chunk_${chunk.id}`;
            const startTime = performance.now();

            // 1. Try persistent IndexedDB blob first
            const persistent = await getPersistentChunkBlob(chunk.id);
            if (persistent) {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            if (!this.scene.textures.exists(textureKey)) {
                                this.scene.textures.addImage(textureKey, img);
                            }
                            this.createChunkImage(chunk, textureKey);
                            resolve();
                        } catch (e) { reject(e); }
                    };
                    img.onerror = () => reject(new Error(`Failed to decode persistent chunk ${chunk.id}`));
                    img.src = URL.createObjectURL(persistent);
                });
                this.failedChunks.delete(chunk.id);
                const duration = performance.now() - startTime;
                this.recordLoadDuration(duration);
                this.dispatchChunkProgressEvent();
                return;
            }

            // If already an in-flight load for this chunk, await it
            const existing = this.inFlightLoads.get(chunk.id);
            if (existing) {
                await existing;
                return;
            }

            // Skip if already loaded
            if (this.scene.textures.exists(textureKey)) {
                this.createChunkImage(chunk, textureKey);
                // Clear any previous failure record
                this.failedChunks.delete(chunk.id);
                return;
            }

            const cachedDataUrl = getChunkDataUrl(chunk.id);
            if (cachedDataUrl) {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            this.scene.textures.addImage(textureKey, img);
                            this.createChunkImage(chunk, textureKey);
                            console.log(`✓ Chunk ${chunk.id} loaded (cache)`);
                            resolve();
                        } catch (e) { reject(e); }
                    };
                    img.onerror = () => reject(new Error(`Failed to decode cached chunk ${chunk.id}`));
                    img.src = cachedDataUrl;
                });
            } else {
                // Fetch with timeout & cache
                const loadPromise = new Promise<void>((resolve, reject) => {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => {
                        controller.abort();
                        reject(new Error(`Timeout loading chunk ${chunk.id}`));
                    }, 10000);
                    fetch(`/maps/chunks/${chunk.filename}`, { signal: controller.signal })
                        .then(async resp => {
                            clearTimeout(timeout);
                            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                            const blob = await resp.blob();
                            // Persist original binary blob for future sessions
                            storePersistentChunk(chunk.id, blob);
                            const dataUrl = await new Promise<string>((res, rej) => {
                                const reader = new FileReader();
                                reader.onload = () => res(reader.result as string);
                                reader.onerror = rej;
                                reader.readAsDataURL(blob);
                            });
                            // Attempt to store (may evict others)
                            storeChunk(chunk.id, dataUrl);
                            const img = new Image();
                            img.onload = () => {
                                try {
                                    this.scene.textures.addImage(textureKey, img);
                                    this.createChunkImage(chunk, textureKey);
                                    console.log(`✓ Chunk ${chunk.id} loaded`);
                                    resolve();
                                } catch (e) { reject(e); }
                            };
                            img.onerror = () => reject(new Error(`Failed to decode image for chunk ${chunk.id}`));
                            img.src = dataUrl;
                        })
                        .catch(err => {
                            clearTimeout(timeout);
                            reject(err);
                        });
                });
                this.inFlightLoads.set(chunk.id, loadPromise);
                try { await loadPromise; } finally { this.inFlightLoads.delete(chunk.id); }
            }

            // Clear any previous failure record on success
            this.failedChunks.delete(chunk.id);

            // Record duration & dispatch progress event
            const duration = performance.now() - startTime;
            this.recordLoadDuration(duration);
            this.dispatchChunkProgressEvent();
        } catch (error) {
            await this.handleChunkLoadError(
                chunk.id,
                error as Error,
                retryCount
            );
        }
    }

    /** Dispatch a lightweight global event so UI (loader/profilers) can reflect chunk progress */
    private dispatchChunkProgressEvent(): void {
        try {
            const total = this.chunkMetadata?.chunks.length || 0;
            window.dispatchEvent(new CustomEvent('chunkLoadProgress', {
                detail: {
                    loaded: this.loadedChunks.size,
                    total,
                    loading: this.loadingChunks.size
                }
            }));
        } catch {}
    }

    private async handleChunkLoadError(
        chunkId: string,
        error: Error,
        retryCount: number
    ): Promise<void> {
        // Determine error type
        let errorType: "NETWORK" | "TIMEOUT" | "PARSE" | "MEMORY" | "UNKNOWN" =
            "UNKNOWN";

        if (error.message.includes("Timeout")) {
            errorType = "TIMEOUT";
        } else if (error.message.includes("Failed to load image")) {
            errorType = "NETWORK";
        } else if (
            error.message.includes("memory") ||
            error.message.includes("Memory") ||
            error.message.includes("glTexture") ||
            error.message.includes("WebGL")
        ) {
            errorType = "MEMORY";
            // Force cleanup on WebGL/memory errors
            this.forceCleanup();
        } else if (
            error.message.includes("parse") ||
            error.message.includes("Parse")
        ) {
            errorType = "PARSE";
        }

        // Create error object
        const chunkError = this.errorHandler.createError(
            chunkId,
            errorType,
            error.message,
            retryCount,
            error
        );

        // Handle the error through the chain
        const result = await this.errorHandler.handleError(chunkError);

        // Act on the result
        if (result.shouldRetry && result.retryDelay) {
            this.failedChunks.set(chunkId, retryCount + 1);

            setTimeout(() => {
                const chunkMetadata = this.chunkMetadata?.chunks.find(
                    (c) => c.id === chunkId
                );
                if (chunkMetadata) {
                    this.loadChunkSimple(chunkMetadata);
                }
            }, result.retryDelay);
        } else if (!result.handled) {
            // Mark as permanently failed
            this.failedChunks.set(chunkId, retryCount + 1);
            console.error(
                `Chunk ${chunkId} failed permanently after error handling`
            );
        }

        // Show user message if provided
        if (result.userMessage) {
            // Could integrate with a notification system
            console.info(`User notification: ${result.userMessage}`);
        }
    }

    private createChunkImage(chunk: ChunkMetadata, textureKey: string): void {
        // Create image object for this chunk
        const chunkImage = this.scene.add.image(
            chunk.pixelX,
            chunk.pixelY,
            textureKey
        );
        chunkImage.setOrigin(0, 0); // Top-left origin like the original
        chunkImage.setDepth(-10); // Behind other elements

        // Add to container with smooth transition
        this.mapContainer.addChunkWithTransition(chunk.id, chunkImage);

        // Store reference and mark as accessed
        this.loadedChunks.set(chunk.id, chunkImage);
        this.markChunkAccessed(chunk.id);

        // Enforce memory limits
        this.enforceMemoryLimits();
    }

    private createFallbackMap(): void {
        console.log("Creating fallback map...");
        // Create a simple colored rectangle as fallback
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x228b22); // Forest green
        graphics.fillRect(0, 0, this.mapCache.width, this.mapCache.height);
        graphics.setDepth(-10);
        this.mapContainer.add(graphics);
    }

    // Dynamic chunk loading methods
    private getChunkCoordForPosition(
        x: number,
        y: number
    ): { x: number; y: number } {
        if (!this.chunkMetadata) return { x: 0, y: 0 };
        const chunkX = Math.floor(x / this.chunkMetadata.chunkWidth);
        const chunkY = Math.floor(y / this.chunkMetadata.chunkHeight);
        return { x: chunkX, y: chunkY };
    }

    private getChunkId(chunkX: number, chunkY: number): string {
        return `${chunkX}_${chunkY}`;
    }

    public updateVisibleChunks(playerX: number, playerY: number): void {
        if (!this.chunkMetadata) return;

        // Get player's current chunk
        const playerChunk = this.getChunkCoordForPosition(playerX, playerY);

        // Calculate which chunks should be visible
        const newVisibleChunks = new Set<string>();
        const criticalChunks: Array<{ x: number, y: number }> = [];
        const deferredChunks: Array<{ x: number, y: number }> = [];

        // Load chunks in a square around the player
        for (
            let y = playerChunk.y - this.viewDistance;
            y <= playerChunk.y + this.viewDistance;
            y++
        ) {
            for (
                let x = playerChunk.x - this.viewDistance;
                x <= playerChunk.x + this.viewDistance;
                x++
            ) {
                // Skip invalid chunks
                if (
                    x < 0 ||
                    y < 0 ||
                    x >= this.chunkMetadata.chunksX ||
                    y >= this.chunkMetadata.chunksY
                ) {
                    continue;
                }

                const chunkId = this.getChunkId(x, y);
                newVisibleChunks.add(chunkId);

                // If this chunk isn't loaded, categorize for loading
                if (
                    !this.loadedChunks.has(chunkId) &&
                    !this.loadingChunks.has(chunkId)
                ) {
                    // Critical chunks: current player chunk and immediate neighbors
                    const distance = Math.abs(x - playerChunk.x) + Math.abs(y - playerChunk.y);
                    if (distance <= 1) {
                        criticalChunks.push({ x, y });
                    } else {
                        deferredChunks.push({ x, y });
                    }
                } else if (this.loadedChunks.has(chunkId)) {
                    // Mark as accessed for LRU tracking
                    this.markChunkAccessed(chunkId);
                }
            }
        }

        // Load critical chunks immediately (max 2 to prevent stuttering)
        const maxCritical = Math.min(2, criticalChunks.length);
        for (let i = 0; i < maxCritical; i++) {
            const chunk = criticalChunks[i];
            this.loadChunkByIdWithPriority(chunk.x, chunk.y, "high");
        }

        // Defer remaining critical chunks
        for (let i = maxCritical; i < criticalChunks.length; i++) {
            const chunk = criticalChunks[i];
            setTimeout(() => {
                this.loadChunkByIdWithPriority(chunk.x, chunk.y, "high");
            }, i * 100); // Stagger loading
        }

        // Defer all non-critical chunks with longer delays
        deferredChunks.forEach((chunk, index) => {
            setTimeout(() => {
                this.loadChunkByIdWithPriority(chunk.x, chunk.y, "low");
            }, (index + criticalChunks.length) * 200);
        });

        // Update visible chunks set
        this.visibleChunks = newVisibleChunks;
    }

    // Display-only version that doesn't trigger loading
    private updateVisibleChunksDisplay(playerX: number, playerY: number): void {
        if (!this.chunkMetadata) return;

        // Get player's current chunk
        const playerChunk = this.getChunkCoordForPosition(playerX, playerY);

        // Calculate which chunks should be visible
        const newVisibleChunks = new Set<string>();

        // Check chunks in a square around the player for visibility only
        for (
            let y = playerChunk.y - this.viewDistance;
            y <= playerChunk.y + this.viewDistance;
            y++
        ) {
            for (
                let x = playerChunk.x - this.viewDistance;
                x <= playerChunk.x + this.viewDistance;
                x++
            ) {
                // Skip invalid chunks
                if (
                    x < 0 ||
                    y < 0 ||
                    x >= this.chunkMetadata.chunksX ||
                    y >= this.chunkMetadata.chunksY
                ) {
                    continue;
                }

                const chunkId = this.getChunkId(x, y);
                newVisibleChunks.add(chunkId);

                // Only mark as accessed if already loaded, don't trigger loading
                if (this.loadedChunks.has(chunkId)) {
                    this.markChunkAccessed(chunkId);
                }
            }
        }

        // Update visible chunks set
        this.visibleChunks = newVisibleChunks;
    }

    private async loadChunkById(chunkX: number, chunkY: number): Promise<void> {
        return this.loadChunkByIdWithPriority(chunkX, chunkY, "high");
    }

    // Unload chunks when memory limits are exceeded
    private unloadChunk(chunkId: string): void {
    if (ALWAYS_KEEP_CHUNKS) return; // no unloading in permanent mode
        const chunk = this.loadedChunks.get(chunkId);
        if (chunk) {
            // Remove from all tracking
            this.loadedChunks.delete(chunkId);
            this.chunkAccessTimes.delete(chunkId);
            
            // Remove from container with smooth transition
            this.mapContainer.removeChunkWithTransition(chunkId);
            
            console.log(`Unloaded chunk ${chunkId}`);
        }
    }

    private enforceMemoryLimits(): void {
    if (ALWAYS_KEEP_CHUNKS) return; // skip memory pruning
        // Only enforce hard limits when we have way too many chunks
        const hardLimit = this.maxLoadedChunks * 1.5; // 50% more than normal limit
        
        if (this.loadedChunks.size <= hardLimit) return;

        console.log(`Memory pressure detected: ${this.loadedChunks.size} chunks loaded`);

        // Get chunks sorted by last access time (LRU)
        const sortedChunks = Array.from(this.chunkAccessTimes.entries())
            .sort((a, b) => a[1] - b[1]) // Sort by access time (oldest first)
            .map((entry) => entry[0]);

        // Only unload chunks that are not currently visible
        const chunksToUnload = sortedChunks.filter(
            (chunkId) => !this.visibleChunks.has(chunkId)
        );
        
        const excessCount = this.loadedChunks.size - this.maxLoadedChunks;
        const chunksToActuallyUnload = Math.min(excessCount, chunksToUnload.length, 5); // Max 5 at a time

        for (let i = 0; i < chunksToActuallyUnload; i++) {
            this.unloadChunk(chunksToUnload[i]);
        }
        
        console.log(`Unloaded ${chunksToActuallyUnload} chunks due to memory pressure`);
    }

    private markChunkAccessed(chunkId: string): void {
        this.chunkAccessTimes.set(chunkId, Date.now());
    }

    public update(): void {
        if (this.isInBuilding) return;

        // Get player position
        const player = this.scene.getPlayer();
        if (player) {
            const playerPos = player.getPosition();

            // Calculate movement direction for the preloading system
            this.updateMovementDirection(playerPos);

            // Only update chunks if player has moved to a different chunk
            const currentChunk = this.getChunkCoordForPosition(
                playerPos.x,
                playerPos.y
            );
            const currentChunkId = this.getChunkId(
                currentChunk.x,
                currentChunk.y
            );

            if (this.lastCheckedChunkId !== currentChunkId) {
                // Use smart visibility system that staggers loading
                this.updateVisibleChunks(playerPos.x, playerPos.y);
                this.lastCheckedChunkId = currentChunkId;

                // Optimize rendering after chunk changes (with delay to avoid conflicts)
                setTimeout(() => this.optimizeRendering(), 500);
            }
        }
    }

    private updateMovementDirection(currentPos: {
        x: number;
        y: number;
    }): void {
        // Calculate movement direction
        this.playerMovementDirection = {
            x: currentPos.x - this.lastPlayerPosition.x,
            y: currentPos.y - this.lastPlayerPosition.y,
        };

        this.lastPlayerPosition = currentPos;
    }

    private async loadChunkByIdWithPriority(
        chunkX: number,
        chunkY: number,
        priority: "high" | "low" = "high"
    ): Promise<void> {
        if (!this.chunkMetadata) return;

        const chunkId = this.getChunkId(chunkX, chunkY);

        // Skip if already loaded or loading
        if (this.loadedChunks.has(chunkId) || this.loadingChunks.has(chunkId)) {
            return;
        }

        // Throttle rapid re-requests (e.g., oscillating visibility) within 250ms
        const now = performance.now();
        const last = this.lastRequestTimes.get(chunkId) || 0;
        if (now - last < 250) {
            return; // too soon, skip duplicate scheduling
        }
        this.lastRequestTimes.set(chunkId, now);

        // Check if we're already at max concurrent loads
        if (this.loadingChunks.size >= this.maxConcurrentLoads) {
            if (priority === "low") {
                console.log(
                    `Deferring low priority chunk ${chunkId} - too many concurrent loads`
                );
                // Defer low priority chunks when system is busy
                setTimeout(() => {
                    this.loadChunkByIdWithPriority(chunkX, chunkY, priority);
                }, 1000 + Math.random() * 1000); // Random delay to spread load
                return;
            } else {
                // For high priority, wait a bit and try again
                setTimeout(() => {
                    this.loadChunkByIdWithPriority(chunkX, chunkY, priority);
                }, 200);
                return;
            }
        }

        // Mark as loading to prevent duplicate loads
        this.loadingChunks.add(chunkId);

        // Find the chunk metadata
        const chunkMetadata = this.chunkMetadata.chunks.find(
            (c) => c.id === chunkId
        );
        if (chunkMetadata) {
            try {
                // Add a small delay for low priority chunks to prevent rapid loading
                if (priority === "low") {
                    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                }
                
                await this.loadChunkSimple(chunkMetadata);
            } catch (error) {
                console.warn(`Failed to load chunk ${chunkId}:`, error);
            } finally {
                this.loadingChunks.delete(chunkId);
            }
        } else {
            console.warn(`Chunk metadata not found for ${chunkId}`);
            this.loadingChunks.delete(chunkId);
        }
    }

    private preloadTextures(): void {
        // Make sure the bank interior texture is ready before needed
        if (!this.scene.textures.exists("interior")) {
            const bankLoadPromise = new Promise<void>((resolve) => {
                this.scene.load.once("complete", () => {
                    console.log("Bank interior texture loaded successfully");
                    resolve();
                });
                this.scene.load.image("interior", "test.png");

                // Preload door sound effects
                if (!this.scene.cache.audio.exists("door-open")) {
                    this.scene.load.audio(
                        "door-open",
                        "assets/sounds/door-open.mp3"
                    );
                }
                if (!this.scene.cache.audio.exists("door-close")) {
                    this.scene.load.audio(
                        "door-close",
                        "assets/sounds/door-close.mp3"
                    );
                }

                this.scene.load.start();
            });
            this.textureLoadPromises.set("interior", bankLoadPromise);
        }

        // Make sure the stock market interior texture is ready
        if (!this.scene.textures.exists("stockmarket")) {
            const stockMarketLoadPromise = new Promise<void>((resolve) => {
                this.scene.load.once("complete", () => {
                    console.log(
                        "Stock market interior texture loaded successfully"
                    );
                    resolve();
                });
                this.scene.load.image("stockmarket", "/maps/stockmarket.png");
                this.scene.load.start();
            });
            this.textureLoadPromises.set("stockmarket", stockMarketLoadPromise);
        }
    }

    enterBuilding(
        playerX: number,
        playerY: number,
        buildingType: "bank" | "stockmarket" = "bank"
    ): { x: number; y: number } {
        try {
            // Store current position
            this.lastOutdoorPosition = { x: playerX, y: playerY };

            // Set building state - do this first to prevent any rendering issues
            this.isInBuilding = true;
            this.currentBuildingType = buildingType;

            // Stop continuous loading while in building
            this.stopContinuousLoading();

            // Hide the chunked map container
            this.mapContainer.setVisible(false);

            // Create temporary single image for interior (same as original logic)
            const textureKey =
                buildingType === "bank" ? "interior" : "stockmarket";

            // Create interior map image
            const interiorMap = this.scene.add.image(0, 0, textureKey);
            interiorMap.setDepth(-10);
            interiorMap.setOrigin(0.5, 0.5);

            // Apply a larger scale to make the map bigger
            const scale = 1.5;
            interiorMap.setScale(scale);

            // Get the device dimensions
            const deviceWidth = this.scene.scale.width;
            const deviceHeight = this.scene.scale.height;

            // Get interior dimensions
            let interiorWidth = 800;
            let interiorHeight = 600;

            if (this.scene.textures.exists(textureKey)) {
                const interiorImage = this.scene.textures.get(textureKey);
                if (
                    interiorImage &&
                    interiorImage.source &&
                    interiorImage.source[0]
                ) {
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

            // Add bank manager if this is a bank interior
            if (buildingType === "bank") {
                // Position bank manager relative to the interior center
                // Adjust these coordinates based on where you want the banker in the bank
                const bankManagerX = 1383; // Slightly to the right of center
                const bankManagerY = 835; // Slightly above center
                
                // Access the bank NPC manager from the scene
                const mainScene = this.scene as any;
                if (mainScene.bankNPCManager && mainScene.bankNPCManager.banker) {
                    const banker = mainScene.bankNPCManager.banker;
                    banker.setPosition(bankManagerX, bankManagerY);
                    banker.setVisible(true);
                    banker.setDepth(10); // Ensure banker appears above the map
                    
                    // Also update the banker's name text position if it exists
                    if (banker.nameText) {
                        banker.nameText.setPosition(bankManagerX, bankManagerY - 50);
                    }
                    
                    console.log(`Positioned bank manager at (${bankManagerX}, ${bankManagerY})`);
                }
            }

            // Set camera and physics bounds to match the scaled interior size and position
            const boundsX = centerX - scaledWidth / 2;
            const boundsY = centerY - scaledHeight / 2;

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

            // Get camera and set zoom using dynamic zoom manager
            const camera = this.scene.cameras.main as ExtendedCamera;
            const scene = this.scene as any;
            if (scene.dynamicZoomManager) {
                scene.dynamicZoomManager.setZoom(maxZoom, true);
            } else {
                camera.setZoom(maxZoom);
            }

            // Store camera settings for restoration later
            camera._origMinZoom = camera.minZoom || 0.25;
            camera._origMaxZoom = camera.maxZoom || 2.0;

            // Set both minZoom and maxZoom to the same value to lock zoom
            camera.minZoom = maxZoom;
            camera.maxZoom = maxZoom;

            // Store reference to interior map for cleanup
            (this as any).currentInteriorMap = interiorMap;

            // Calculate player spawn position for bank
            let playerSpawnX = centerX;
            let playerSpawnY = centerY;
            
            if (buildingType === "bank") {
                // Spawn player horizontally center - 200px, vertically at the bottom (at the gate)
                // playerSpawnX = centerX - 250; // Horizontally centered minus 200px as requested
                // playerSpawnY = centerY + (scaledHeight / 2) - 100; // Near the bottom (gate), with some padding
                playerSpawnX = 586; // Horizontally centered minus 200px as requested
                playerSpawnY = 2918; // Near the bottom (gate), with some padding
                console.log(`Bank spawn position: (${playerSpawnX}, ${playerSpawnY})`);
            }

            return { x: playerSpawnX, y: playerSpawnY };
        } catch (error) {
            console.error("Error entering building:", error);
            this.isInBuilding = false;
            this.currentBuildingType = null;
            return { x: playerX, y: playerY };
        }
    }

    exitBuilding(): { x: number; y: number } | null {
        if (!this.lastOutdoorPosition) return null;

        // Reset building state immediately
        this.isInBuilding = false;
        this.currentBuildingType = null;

        // Restart smart loading when exiting building
        this.startContinuousLoading();

        // Clean up interior map
        if ((this as any).currentInteriorMap) {
            (this as any).currentInteriorMap.destroy();
            (this as any).currentInteriorMap = null;
        }

        // Show the chunked map container again
        this.mapContainer.setVisible(true);

        // Restore bank manager to outdoor position if exiting bank
        if (this.currentBuildingType === "bank") {
            const mainScene = this.scene as any;
            if (mainScene.bankNPCManager && mainScene.bankNPCManager.banker) {
                const banker = mainScene.bankNPCManager.banker;
                // Restore to original outdoor position
                const originalX = 1000;
                const originalY = 700;
                banker.setPosition(originalX, originalY);
                
                // Also update the banker's name text position if it exists
                if (banker.nameText) {
                    banker.nameText.setPosition(originalX, originalY - 50);
                }
                
                console.log(`Restored bank manager to outdoor position (${originalX}, ${originalY})`);
            }
        }

        // Restore original min/max zoom constraints if they were saved
        const camera = this.scene.cameras.main as ExtendedCamera;

        if (
            camera._origMinZoom !== undefined &&
            camera._origMaxZoom !== undefined
        ) {
            camera.minZoom = camera._origMinZoom;
            camera.maxZoom = camera._origMaxZoom;

            // Reset zoom to a comfortable default value using dynamic zoom manager
            const scene = this.scene as any;
            if (scene.dynamicZoomManager) {
                scene.dynamicZoomManager.resetToDefault(true);
            } else {
                camera.setZoom(0.8);
            }
        }

        // Reset physics world bounds to outdoor map dimensions
        this.scene.physics.world.setBounds(
            0,
            0,
            this.mapCache.width,
            this.mapCache.height
        );

        // Use the main scene's setupCameraBounds method for consistent camera bounds handling
        if (this.scene instanceof Scene) {
            const sceneWithBounds = this.scene as {
                setupCameraBounds?: () => void;
            };
            if (typeof sceneWithBounds.setupCameraBounds === "function") {
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
        const zoom = camera.zoom || 0.8;

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

    getCurrentBuildingType(): "bank" | "stockmarket" | null {
        return this.currentBuildingType;
    }

    // Performance monitoring and debugging methods
    public getLoadedChunkCount(): number {
        return this.loadedChunks.size;
    }

    public getLoadingChunkCount(): number {
        return this.loadingChunks.size;
    }

    public getFailedChunkCount(): number {
        return Array.from(this.failedChunks.values()).filter(
            (count) => count > this.maxRetries
        ).length;
    }

    public getPerformanceStats(): {
        loadedChunks: number;
        loadingChunks: number;
        failedChunks: number;
        visibleChunks: number;
        memoryUsage: string;
        preloadQueue: number;
        preloadMetrics: any;
        errorStats: any;
    } {
        return {
            loadedChunks: this.loadedChunks.size,
            loadingChunks: this.loadingChunks.size,
            failedChunks: this.getFailedChunkCount(),
            visibleChunks: this.visibleChunks.size,
            memoryUsage: `${this.loadedChunks.size}/${this.maxLoadedChunks}`,
            preloadQueue: this.preloadingManager.getQueueSize(),
            preloadMetrics: this.preloadingManager.getMetrics(),
            errorStats: this.errorHandler.getErrorStats(),
        };
    }

    public debugLogChunkStatus(): void {
        const stats = this.getPerformanceStats();
        console.log("Chunk Manager Status:", stats);
        console.log("Visible chunks:", Array.from(this.visibleChunks));
        console.log("Loading chunks:", Array.from(this.loadingChunks));
    }

    public optimizeRendering(): void {
        // Update chunk depths to ensure proper z-ordering
        this.mapContainer.updateChunkDepth();

        // Force texture cache cleanup for unused textures
        this.cleanupUnusedTextures();
    }

    private cleanupUnusedTextures(): void {
    if (ALWAYS_KEEP_CHUNKS) return; // keep all textures resident
        // Defer texture cleanup to prevent WebGL errors
        setTimeout(() => {
            try {
                const textureManager = this.scene.textures;
                const loadedChunkIds = Array.from(this.loadedChunks.keys());
                const visibleChunkIds = Array.from(this.visibleChunks);

                // Get all chunk textures
                const chunkTextures = textureManager.list;

                Object.keys(chunkTextures).forEach((textureKey) => {
                    if (textureKey.startsWith("chunk_")) {
                        const chunkId = textureKey.replace("chunk_", "");

                        // Only remove texture if chunk is not loaded AND not visible
                        // This prevents removing textures that are still being used
                        if (
                            !loadedChunkIds.includes(chunkId) &&
                            !visibleChunkIds.includes(chunkId)
                        ) {
                            // Additional safety check - make sure no GameObjects are using this texture
                            const texture = textureManager.get(textureKey);
                            if (
                                texture &&
                                texture.source &&
                                texture.source.length > 0
                            ) {
                                // Check if the texture has any active references
                                const hasActiveReferences =
                                    this.mapContainer.list.some((child) => {
                                        if (
                                            child instanceof GameObjects.Image
                                        ) {
                                            return (
                                                child.texture &&
                                                child.texture.key === textureKey
                                            );
                                        }
                                        return false;
                                    });

                                if (!hasActiveReferences) {
                                    textureManager.remove(textureKey);
                                    console.log(
                                        `Cleaned up unused texture: ${textureKey}`
                                    );
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn("Error during texture cleanup:", error);
            }
        }, 1000); // 1 second delay to ensure all transitions are complete
    }

    public setTransitionSettings(
        duration: number,
        fadeAlpha: number = 0.8
    ): void {
        this.mapContainer.setTransitionDuration(duration);
        this.mapContainer.setFadeInAlpha(fadeAlpha);
    }

    public configurePreloading(config: Partial<PreloadingConfig>): void {
        this.preloadingManager.updateStrategy(config);
    }

    public clearPreloadQueue(): void {
        this.preloadingManager.clearQueue();
    }

    public getPreloadingMetrics() {
        return this.preloadingManager.getMetrics();
    }

    public getErrorStats() {
        return this.errorHandler.getErrorStats();
    }

    public getRecentErrors(count: number = 10) {
        return this.errorHandler.getRecentErrors(count);
    }

    public clearErrorLogs(): void {
        this.errorHandler.clearErrorLogs();
    }

    public configureErrorHandling(
        maxRetries: number,
        baseDelay: number,
        maxDelay: number
    ): void {
        this.errorHandler.configureRetryHandler(
            maxRetries,
            baseDelay,
            maxDelay
        );
    }

    private setupGlobalErrorHandling(): void {
        // Listen for WebGL context lost events
        const canvas = this.scene.game.canvas;
        if (canvas) {
            canvas.addEventListener("webglcontextlost", (event) => {
                console.error(
                    "WebGL context lost - triggering emergency cleanup"
                );
                event.preventDefault();
                this.forceCleanup();
            });

            canvas.addEventListener("webglcontextrestored", () => {
                console.log("WebGL context restored - reinitializing chunks");
                // Clear all loaded chunks and reload visible ones
                this.loadedChunks.clear();
                this.chunkAccessTimes.clear();
                this.mapContainer.clearAllChunks();

                // Reload visible chunks
                const player = this.scene.getPlayer();
                if (player) {
                    const playerPos = player.getPosition();
                    this.updateVisibleChunks(playerPos.x, playerPos.y);
                }
            });
        }
    }

    public forceCleanup(): void {
        console.log("Forcing cleanup to prevent WebGL issues...");

        // Clear preload queue to reduce memory pressure
        this.clearPreloadQueue();

        if (!ALWAYS_KEEP_CHUNKS) {
            // Aggressively clean up non-visible chunks
            const chunksToRemove = Array.from(this.loadedChunks.keys()).filter(
                (chunkId) => !this.visibleChunks.has(chunkId)
            );
            chunksToRemove.forEach((chunkId) => {
                this.unloadChunk(chunkId);
            });
        }

        // Force texture cleanup immediately
        this.cleanupUnusedTextures();

        // Reduce max loaded chunks temporarily
        if (!ALWAYS_KEEP_CHUNKS) {
            this.maxLoadedChunks = Math.max(8, this.maxLoadedChunks - 4);
        }

        console.log(
            `Cleanup complete. Loaded chunks: ${this.loadedChunks.size}, Max: ${this.maxLoadedChunks}`
        );
    }

    // Cleanup method for proper disposal
    public destroy(): void {
        console.log("Destroying ChunkedMapManager...");
        
        // Stop continuous loading
        this.stopContinuousLoading();
        
        // In permanent mode keep runtime chunk references (let browser reclaim on tab close)
        if (!ALWAYS_KEEP_CHUNKS) {
            this.loadedChunks.clear();
            this.loadingChunks.clear();
            this.visibleChunks.clear();
            this.chunkAccessTimes.clear();
            this.failedChunks.clear();
        }
        
        // Clear preload queue
        this.clearPreloadQueue();

    // Stop adaptive tuning
    this.stopAdaptiveTuning();
        
        // Clean up container
        if (this.mapContainer) {
            this.mapContainer.clearAllChunks();
        }
        
        console.log("ChunkedMapManager destroyed");
    }
}
