import { MainGameScene } from "../scenes/MainScene.ts";
import { ExtendedCamera } from "./ChunkedMapManager.ts";

/**
 * Interface representing the current drag state
 */
interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    originalCursor: string;
    isAtBoundary: boolean;
    boundaryDirection: string;
}

/**
 * Interface for boundary feedback visual elements
 */
interface BoundaryFeedback {
    graphics: Phaser.GameObjects.Graphics | null;
    tween: Phaser.Tweens.Tween | null;
    isVisible: boolean;
}



/**
 * MapDragHandler manages map dragging functionality for the game.
 * Allows players to click and drag to pan the camera view.
 */
export class MapDragHandler {
    private scene: MainGameScene;
    private camera: ExtendedCamera;
    private dragState: DragState;
    private isInitialized: boolean = false;
    private wasInBuilding: boolean = false;
    private boundaryFeedback: BoundaryFeedback;
    private cursorTransitionTween: Phaser.Tweens.Tween | null = null;

    // Performance optimization: throttling for mouse move events
    private lastMoveTime: number = 0;
    private moveThrottleDelay: number = 16; // ~60fps (16ms between updates)
    private pendingMoveUpdate: boolean = false;

    // Error handling and recovery
    private errorCount: number = 0;
    private maxErrors: number = 5;
    private lastErrorTime: number = 0;
    private errorCooldownPeriod: number = 5000; // 5 seconds

    // Bound event handlers to maintain proper 'this' context
    private onPointerDownBound: (pointer: Phaser.Input.Pointer) => void;
    private onPointerMoveBound: (pointer: Phaser.Input.Pointer) => void;
    private onPointerUpBound: (pointer: Phaser.Input.Pointer) => void;

    constructor(scene: MainGameScene) {
        try {
            // Validate required dependencies
            if (!scene) {
                throw new Error('MapDragHandler: Scene is required');
            }

            if (!scene.cameras || !scene.cameras.main) {
                throw new Error('MapDragHandler: Scene must have a main camera');
            }

            this.scene = scene;
            this.camera = scene.cameras.main as ExtendedCamera;
            
            // Initialize drag state
            this.dragState = {
                isDragging: false,
                startX: 0,
                startY: 0,
                lastX: 0,
                lastY: 0,
                originalCursor: 'default',
                isAtBoundary: false,
                boundaryDirection: ''
            };

            // Initialize boundary feedback system
            this.boundaryFeedback = {
                graphics: null,
                tween: null,
                isVisible: false
            };

            // Bind event handlers to maintain proper context
            this.onPointerDownBound = this.safeEventHandler(this.onPointerDown.bind(this));
            this.onPointerMoveBound = this.safeEventHandler(this.onPointerMove.bind(this));
            this.onPointerUpBound = this.safeEventHandler(this.onPointerUp.bind(this));
            
            // Initialize building state tracking with error handling
            this.wasInBuilding = this.scene.mapManager ? this.scene.mapManager.isPlayerInBuilding() : false;
            
            console.log('MapDragHandler: Successfully constructed');
        } catch (error) {
            console.error('MapDragHandler: Construction failed:', error);
            this.handleError(error as Error, 'constructor');
            throw error; // Re-throw to prevent invalid instance creation
        }
    }

    /**
     * Initialize the drag handler by setting up event listeners
     */
    public initialize(): void {
        try {
            if (this.isInitialized) {
                console.warn('MapDragHandler already initialized');
                return;
            }

            // Validate scene and input system
            if (!this.scene || !this.scene.input) {
                throw new Error('MapDragHandler: Scene or input system not available');
            }

            // Set up pointer event listeners
            this.scene.input.on('pointerdown', this.onPointerDownBound);
            this.scene.input.on('pointermove', this.onPointerMoveBound);
            this.scene.input.on('pointerup', this.onPointerUpBound);

            // Also listen for pointerupoutside to handle cases where mouse is released outside game area
            this.scene.input.on('pointerupoutside', this.onPointerUpBound);

            // Initialize boundary feedback graphics
            this.initializeBoundaryFeedback();

            this.isInitialized = true;
            console.log('MapDragHandler initialized');
        } catch (error) {
            console.error('MapDragHandler: Initialization failed:', error);
            this.handleError(error as Error, 'initialize');
            this.recoverFromError();
        }
    }

    /**
     * Safe event handler wrapper that catches and handles errors
     */
    private safeEventHandler<T extends any[]>(handler: (...args: T) => void): (...args: T) => void {
        return (...args: T) => {
            try {
                handler(...args);
            } catch (error) {
                console.error('MapDragHandler: Event handler error:', error);
                this.handleError(error as Error, 'eventHandler');
                this.recoverFromError();
            }
        };
    }

    /**
     * Handle errors with counting and cooldown logic
     */
    private handleError(error: Error, context: string): void {
        const currentTime = Date.now();
        
        // Reset error count if enough time has passed
        if (currentTime - this.lastErrorTime > this.errorCooldownPeriod) {
            this.errorCount = 0;
        }
        
        this.errorCount++;
        this.lastErrorTime = currentTime;
        
        console.error(`MapDragHandler: Error in ${context} (count: ${this.errorCount}):`, error);
        
        // If too many errors, disable the handler temporarily
        if (this.errorCount >= this.maxErrors) {
            console.warn('MapDragHandler: Too many errors, temporarily disabling drag functionality');
            this.temporarilyDisable();
        }
    }

    /**
     * Recover from error state by resetting drag state and cleaning up
     */
    private recoverFromError(): void {
        try {
            // Reset drag state
            if (this.dragState.isDragging) {
                this.dragState.isDragging = false;
                this.hideBoundaryFeedback();
                this.restoreCursor();
            }
            
            // Clear any pending move updates
            this.pendingMoveUpdate = false;
            
            console.log('MapDragHandler: Recovered from error state');
        } catch (recoveryError) {
            console.error('MapDragHandler: Failed to recover from error:', recoveryError);
        }
    }

    /**
     * Temporarily disable drag functionality due to excessive errors
     */
    private temporarilyDisable(): void {
        try {
            // Clean up current state
            this.recoverFromError();
            
            // Remove event listeners temporarily
            if (this.scene && this.scene.input) {
                this.scene.input.off('pointerdown', this.onPointerDownBound);
                this.scene.input.off('pointermove', this.onPointerMoveBound);
                this.scene.input.off('pointerup', this.onPointerUpBound);
                this.scene.input.off('pointerupoutside', this.onPointerUpBound);
            }
            
            // Re-enable after cooldown period
            setTimeout(() => {
                this.reEnableAfterCooldown();
            }, this.errorCooldownPeriod);
            
        } catch (error) {
            console.error('MapDragHandler: Failed to temporarily disable:', error);
        }
    }

    /**
     * Re-enable drag functionality after error cooldown
     */
    private reEnableAfterCooldown(): void {
        try {
            if (!this.isInitialized || !this.scene || !this.scene.input) {
                return;
            }
            
            // Reset error count
            this.errorCount = 0;
            
            // Re-add event listeners
            this.scene.input.on('pointerdown', this.onPointerDownBound);
            this.scene.input.on('pointermove', this.onPointerMoveBound);
            this.scene.input.on('pointerup', this.onPointerUpBound);
            this.scene.input.on('pointerupoutside', this.onPointerUpBound);
            
            console.log('MapDragHandler: Re-enabled after error cooldown');
        } catch (error) {
            console.error('MapDragHandler: Failed to re-enable after cooldown:', error);
        }
    }

    /**
     * Update method to be called from MainScene to handle building state changes
     */
    public update(): void {
        if (!this.isInitialized || !this.scene.mapManager) {
            return;
        }

        // Check for building state changes
        const currentlyInBuilding = this.scene.mapManager.isPlayerInBuilding();
        
        if (this.wasInBuilding !== currentlyInBuilding) {
            // Building state changed - reset drag state
            this.handleBuildingStateChange(currentlyInBuilding);
            this.wasInBuilding = currentlyInBuilding;
        }

        // Handle zoom level changes during drag operations
        this.handleZoomDuringDrag();
    }

    /**
     * Handle zoom level changes that occur during drag operations
     * Ensures smooth interaction between zoom and drag
     */
    private handleZoomDuringDrag(): void {
        if (!this.dragState.isDragging) {
            return;
        }

        // If zoom changed significantly during drag, we might need to adjust
        // the drag sensitivity or provide visual feedback
        // For now, we maintain the drag state but the sensitivity will
        // automatically adjust based on the new zoom level
        
        // Recalculate camera bounds in case zoom affected the valid drag area
        const bounds = this.calculateCameraBounds();
        
        // Ensure camera is still within bounds after zoom change
        const clampedX = Phaser.Math.Clamp(this.camera.scrollX, bounds.minX, bounds.maxX);
        const clampedY = Phaser.Math.Clamp(this.camera.scrollY, bounds.minY, bounds.maxY);
        
        if (clampedX !== this.camera.scrollX || clampedY !== this.camera.scrollY) {
            this.camera.setScroll(clampedX, clampedY);
        }
    }

    /**
     * Get current zoom information for debugging and validation
     */
    public getZoomInfo(): { current: number; min: number; max: number; sensitivity: number } {
        const extendedCamera = this.camera as ExtendedCamera;
        return {
            current: this.camera.zoom,
            min: extendedCamera.minZoom || 0.25,
            max: extendedCamera.maxZoom || 2.0,
            sensitivity: this.getZoomAdjustedSensitivity()
        };
    }

    /**
     * Validate that drag functionality works correctly at the given zoom level
     */
    public validateZoomLevel(zoomLevel: number): boolean {
        const extendedCamera = this.camera as ExtendedCamera;
        const minZoom = extendedCamera.minZoom || 0.25;
        const maxZoom = extendedCamera.maxZoom || 2.0;

        // Check if zoom level is within valid range
        if (zoomLevel < minZoom || zoomLevel > maxZoom) {
            console.warn(`MapDragHandler: Invalid zoom level ${zoomLevel}. Must be between ${minZoom} and ${maxZoom}`);
            return false;
        }

        // Temporarily set zoom to test sensitivity calculation
        const originalZoom = this.camera.zoom;
        this.camera.setZoom(zoomLevel);
        
        const sensitivity = this.getZoomAdjustedSensitivity();
        const bounds = this.calculateCameraBounds();
        
        // Restore original zoom
        this.camera.setZoom(originalZoom);

        // Validate that sensitivity is reasonable (not too high or too low)
        const isValidSensitivity = sensitivity > 0.1 && sensitivity < 10.0;
        
        // Validate that bounds are reasonable
        const isValidBounds = bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY;

        if (!isValidSensitivity) {
            console.warn(`MapDragHandler: Invalid sensitivity ${sensitivity} at zoom level ${zoomLevel}`);
        }

        if (!isValidBounds) {
            console.warn(`MapDragHandler: Invalid bounds at zoom level ${zoomLevel}:`, bounds);
        }

        return isValidSensitivity && isValidBounds;
    }

    /**
     * Handle building state changes by resetting drag state
     */
    private handleBuildingStateChange(isInBuilding: boolean): void {
        if (this.dragState.isDragging) {
            // If we were dragging and entered/exited a building, end the drag operation
            this.dragState.isDragging = false;
            this.hideBoundaryFeedback();
            this.restoreCursorWithTransition();
            
            console.log(`MapDragHandler: Drag state reset due to building state change (inBuilding: ${isInBuilding})`);
        }
    }

    /**
     * Destroy the drag handler by cleaning up event listeners and resetting state
     */
    public destroy(): void {
        try {
            if (!this.isInitialized) {
                return;
            }

            // Remove event listeners safely
            if (this.scene && this.scene.input) {
                this.scene.input.off('pointerdown', this.onPointerDownBound);
                this.scene.input.off('pointermove', this.onPointerMoveBound);
                this.scene.input.off('pointerup', this.onPointerUpBound);
                this.scene.input.off('pointerupoutside', this.onPointerUpBound);
            }

            // Clean up boundary feedback
            this.destroyBoundaryFeedback();

            // Clean up cursor transition tween
            if (this.cursorTransitionTween) {
                this.cursorTransitionTween.destroy();
                this.cursorTransitionTween = null;
            }

            // Reset drag state and restore cursor
            if (this.dragState.isDragging) {
                this.restoreCursor();
            }
            
            // Clear any pending move updates
            this.pendingMoveUpdate = false;
            
            // Reset all state
            this.dragState = {
                isDragging: false,
                startX: 0,
                startY: 0,
                lastX: 0,
                lastY: 0,
                originalCursor: 'default',
                isAtBoundary: false,
                boundaryDirection: ''
            };

            // Reset performance tracking
            this.lastMoveTime = 0;
            this.pendingMoveUpdate = false;

            // Reset error tracking
            this.errorCount = 0;
            this.lastErrorTime = 0;

            this.isInitialized = false;
            console.log('MapDragHandler destroyed');
        } catch (error) {
            console.error('MapDragHandler: Error during destruction:', error);
            // Force reset critical state even if cleanup fails
            this.isInitialized = false;
            this.pendingMoveUpdate = false;
            if (this.dragState) {
                this.dragState.isDragging = false;
            }
        }
    }

    /**
     * Handle pointer down events - initiate drag if conditions are met
     */
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // Input validation
        if (!this.validatePointerInput(pointer, 'onPointerDown')) {
            return;
        }

        // Validate scene state
        if (!this.validateSceneState()) {
            return;
        }

        // Only handle left mouse button (prevent right-click drag)
        if (pointer.button !== 0) {
            return;
        }

        // Don't start dragging if already dragging
        if (this.dragState.isDragging) {
            return;
        }

        // Check if we're in a building - disable dragging
        if (this.scene.mapManager && this.scene.mapManager.isPlayerInBuilding()) {
            return;
        }

        // Check if clicking on interactive elements - prevent drag initiation
        if (this.isInteractiveElement(pointer)) {
            return;
        }

        // Store initial drag state
        this.dragState.isDragging = true;
        this.dragState.startX = pointer.x;
        this.dragState.startY = pointer.y;
        this.dragState.lastX = pointer.x;
        this.dragState.lastY = pointer.y;
        this.dragState.isAtBoundary = false;
        this.dragState.boundaryDirection = '';

        // Provide immediate visual feedback
        this.provideImmediateVisualFeedback();

        // Change cursor to indicate dragging with smooth transition
        this.setCursorWithTransition('grabbing');
    }

    /**
     * Handle pointer move events - update camera position during drag (with throttling)
     */
    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        // Input validation
        if (!this.validatePointerInput(pointer, 'onPointerMove')) {
            return;
        }

        if (!this.dragState.isDragging) {
            return;
        }

        // Validate scene state
        if (!this.validateSceneState()) {
            this.recoverFromError();
            return;
        }

        // Check if we're in a building - stop dragging immediately
        if (this.scene.mapManager && this.scene.mapManager.isPlayerInBuilding()) {
            this.dragState.isDragging = false;
            this.restoreCursorWithTransition();
            return;
        }

        // Performance optimization: throttle mouse move events
        const currentTime = Date.now();
        if (currentTime - this.lastMoveTime < this.moveThrottleDelay) {
            // If we're throttling, schedule an update for later if one isn't already pending
            if (!this.pendingMoveUpdate) {
                this.pendingMoveUpdate = true;
                setTimeout(() => {
                    if (this.pendingMoveUpdate && this.dragState.isDragging) {
                        this.processMoveUpdate(pointer);
                    }
                    this.pendingMoveUpdate = false;
                }, this.moveThrottleDelay - (currentTime - this.lastMoveTime));
            }
            return;
        }

        this.processMoveUpdate(pointer);
    }

    /**
     * Process the actual move update (separated for throttling)
     */
    private processMoveUpdate(pointer: Phaser.Input.Pointer): void {
        try {
            this.lastMoveTime = Date.now();

            // Calculate movement delta
            const deltaX = pointer.x - this.dragState.lastX;
            const deltaY = pointer.y - this.dragState.lastY;

            // Update camera position and get boundary information
            const boundaryInfo = this.updateCameraPosition(deltaX, deltaY);

            // Update boundary feedback based on camera position
            this.updateBoundaryFeedback(boundaryInfo);

            // Update last position
            this.dragState.lastX = pointer.x;
            this.dragState.lastY = pointer.y;
        } catch (error) {
            console.error('MapDragHandler: Error in processMoveUpdate:', error);
            this.handleError(error as Error, 'processMoveUpdate');
            this.recoverFromError();
        }
    }

    /**
     * Handle pointer up events - end drag operation
     */
    private onPointerUp(pointer: Phaser.Input.Pointer): void {
        // Input validation
        if (!this.validatePointerInput(pointer, 'onPointerUp')) {
            return;
        }

        // Only handle left mouse button
        if (pointer.button !== 0) {
            return;
        }

        if (!this.dragState.isDragging) {
            return;
        }

        // End drag operation
        this.dragState.isDragging = false;
        
        // Clear any pending move updates
        this.pendingMoveUpdate = false;
        
        // Hide boundary feedback
        this.hideBoundaryFeedback();
        
        // Restore cursor with smooth transition
        this.restoreCursorWithTransition();
    }

    /**
     * Validate pointer input for safety
     */
    private validatePointerInput(pointer: Phaser.Input.Pointer, context: string): boolean {
        if (!pointer) {
            console.warn(`MapDragHandler: Invalid pointer in ${context}`);
            return false;
        }

        if (typeof pointer.x !== 'number' || typeof pointer.y !== 'number') {
            console.warn(`MapDragHandler: Invalid pointer coordinates in ${context}`);
            return false;
        }

        if (isNaN(pointer.x) || isNaN(pointer.y)) {
            console.warn(`MapDragHandler: NaN pointer coordinates in ${context}`);
            return false;
        }

        return true;
    }

    /**
     * Validate scene state for safety
     */
    private validateSceneState(): boolean {
        if (!this.scene) {
            console.warn('MapDragHandler: Scene is null or undefined');
            return false;
        }

        if (!this.camera) {
            console.warn('MapDragHandler: Camera is null or undefined');
            return false;
        }

        if (!this.scene.cameras || !this.scene.cameras.main) {
            console.warn('MapDragHandler: Scene camera system is invalid');
            return false;
        }

        return true;
    }

    /**
     * Update camera position based on mouse movement delta with boundary checking
     * Returns boundary information for visual feedback
     */
    private updateCameraPosition(deltaX: number, deltaY: number): { 
        isAtBoundary: boolean; 
        direction: string; 
        intensity: number 
    } {
        if (!this.camera) {
            console.warn('MapDragHandler: Camera not available for position update');
            return { isAtBoundary: false, direction: '', intensity: 0 };
        }

        try {
            // Validate input parameters
            if (typeof deltaX !== 'number' || typeof deltaY !== 'number' || 
                isNaN(deltaX) || isNaN(deltaY)) {
                console.warn('MapDragHandler: Invalid delta values for camera update');
                return { isAtBoundary: false, direction: '', intensity: 0 };
            }

            // Convert screen space movement to world space movement
            // Invert the delta to make dragging feel natural (drag right = move camera left)
            const sensitivity = this.getZoomAdjustedSensitivity();
            const worldDeltaX = -deltaX * sensitivity;
            const worldDeltaY = -deltaY * sensitivity;

            // Validate sensitivity calculation
            if (typeof sensitivity !== 'number' || isNaN(sensitivity) || sensitivity <= 0) {
                console.warn('MapDragHandler: Invalid sensitivity calculation');
                return { isAtBoundary: false, direction: '', intensity: 0 };
            }

            // Calculate new camera position
            const newScrollX = this.camera.scrollX + worldDeltaX;
            const newScrollY = this.camera.scrollY + worldDeltaY;

            // Apply boundary checking and set camera position
            const bounds = this.calculateCameraBounds();
            const clampedX = Phaser.Math.Clamp(newScrollX, bounds.minX, bounds.maxX);
            const clampedY = Phaser.Math.Clamp(newScrollY, bounds.minY, bounds.maxY);

            // Determine boundary information for visual feedback
            const boundaryInfo = this.calculateBoundaryInfo(newScrollX, newScrollY, clampedX, clampedY, bounds);

            // Apply smooth camera movement
            this.camera.setScroll(clampedX, clampedY);

            return boundaryInfo;
        } catch (error) {
            console.error('MapDragHandler: Error updating camera position:', error);
            this.handleError(error as Error, 'updateCameraPosition');
            return { isAtBoundary: false, direction: '', intensity: 0 };
        }
    }

    /**
     * Calculate camera bounds based on map dimensions and current zoom level
     */
    private calculateCameraBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
        try {
            if (!this.camera || !this.scene.mapManager) {
                console.warn('MapDragHandler: Camera or mapManager not available for bounds calculation');
                return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
            }

            const mapWidth = this.scene.mapManager.getMapWidth();
            const mapHeight = this.scene.mapManager.getMapHeight();
            
            // Validate map dimensions
            if (typeof mapWidth !== 'number' || typeof mapHeight !== 'number' || 
                isNaN(mapWidth) || isNaN(mapHeight) || mapWidth <= 0 || mapHeight <= 0) {
                console.warn('MapDragHandler: Invalid map dimensions');
                return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
            }
            
            // Validate camera properties
            if (typeof this.camera.width !== 'number' || typeof this.camera.height !== 'number' ||
                typeof this.camera.zoom !== 'number' || isNaN(this.camera.zoom) || this.camera.zoom <= 0) {
                console.warn('MapDragHandler: Invalid camera properties');
                return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
            }

            // Get camera viewport dimensions in world space
            const cameraWidth = this.camera.width / this.camera.zoom;
            const cameraHeight = this.camera.height / this.camera.zoom;

            // Calculate bounds to prevent camera from showing areas outside the map
            // Camera scroll position represents the top-left corner of the viewport
            const minX = 0;
            const minY = 0;
            const maxX = Math.max(0, mapWidth - cameraWidth);
            const maxY = Math.max(0, mapHeight - cameraHeight);

            return { minX, minY, maxX, maxY };
        } catch (error) {
            console.error('MapDragHandler: Error calculating camera bounds:', error);
            this.handleError(error as Error, 'calculateCameraBounds');
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
    }

    /**
     * Get zoom-adjusted sensitivity for drag operations
     * Ensures consistent drag feel across all zoom levels
     */
    private getZoomAdjustedSensitivity(): number {
        try {
            if (!this.camera) {
                console.warn('MapDragHandler: Camera not available for sensitivity calculation');
                return 1.0;
            }

            const currentZoom = this.camera.zoom;
            const minZoom = (this.camera as ExtendedCamera).minZoom || 0.25;
            const maxZoom = (this.camera as ExtendedCamera).maxZoom || 2.0;

            // Validate zoom values
            if (typeof currentZoom !== 'number' || isNaN(currentZoom) || currentZoom <= 0) {
                console.warn('MapDragHandler: Invalid current zoom value');
                return 1.0;
            }

            if (typeof minZoom !== 'number' || typeof maxZoom !== 'number' || 
                isNaN(minZoom) || isNaN(maxZoom) || minZoom <= 0 || maxZoom <= 0 || minZoom >= maxZoom) {
                console.warn('MapDragHandler: Invalid zoom range values');
                return 1.0;
            }

            // Clamp current zoom to valid range
            const clampedZoom = Phaser.Math.Clamp(currentZoom, minZoom, maxZoom);

            // Base sensitivity - how much the camera moves per pixel of mouse movement
            const baseSensitivity = 1.0;

            // Calculate zoom-adjusted sensitivity
            // At higher zoom levels (zoomed in), we want less camera movement per pixel
            // At lower zoom levels (zoomed out), we want more camera movement per pixel
            // This creates a consistent "feel" regardless of zoom level
            const zoomSensitivity = baseSensitivity / clampedZoom;

            // Apply additional scaling to ensure smooth operation across the full zoom range
            const zoomRange = maxZoom - minZoom;
            const normalizedZoom = (clampedZoom - minZoom) / zoomRange;
            
            // Use a curve that provides good sensitivity at all zoom levels
            // Higher zoom = lower sensitivity multiplier for precise control
            // Lower zoom = higher sensitivity multiplier for faster navigation
            const sensitivityCurve = 0.5 + (0.5 * (1 - normalizedZoom));
            
            const finalSensitivity = zoomSensitivity * sensitivityCurve;

            // Validate final result
            if (typeof finalSensitivity !== 'number' || isNaN(finalSensitivity) || finalSensitivity <= 0) {
                console.warn('MapDragHandler: Invalid sensitivity calculation result');
                return 1.0;
            }

            return finalSensitivity;
        } catch (error) {
            console.error('MapDragHandler: Error calculating zoom-adjusted sensitivity:', error);
            this.handleError(error as Error, 'getZoomAdjustedSensitivity');
            return 1.0;
        }
    }

    /**
     * Initialize boundary feedback graphics
     */
    private initializeBoundaryFeedback(): void {
        // Create graphics object for boundary feedback
        this.boundaryFeedback.graphics = this.scene.add.graphics();
        this.boundaryFeedback.graphics.setDepth(1000); // High depth to appear above other elements
        this.boundaryFeedback.graphics.setVisible(false);
        this.boundaryFeedback.isVisible = false;
    }

    /**
     * Destroy boundary feedback graphics
     */
    private destroyBoundaryFeedback(): void {
        if (this.boundaryFeedback.graphics) {
            this.boundaryFeedback.graphics.destroy();
            this.boundaryFeedback.graphics = null;
        }
        
        if (this.boundaryFeedback.tween) {
            this.boundaryFeedback.tween.destroy();
            this.boundaryFeedback.tween = null;
        }
        
        this.boundaryFeedback.isVisible = false;
    }

    /**
     * Calculate boundary information for visual feedback
     */
    private calculateBoundaryInfo(
        newScrollX: number, 
        newScrollY: number, 
        clampedX: number, 
        clampedY: number, 
        bounds: { minX: number; minY: number; maxX: number; maxY: number }
    ): { isAtBoundary: boolean; direction: string; intensity: number } {
        const isAtBoundaryX = newScrollX !== clampedX;
        const isAtBoundaryY = newScrollY !== clampedY;
        const isAtBoundary = isAtBoundaryX || isAtBoundaryY;

        let direction = '';
        let intensity = 0;

        if (isAtBoundary) {
            // Determine direction
            const directions = [];
            if (clampedX === bounds.minX) directions.push('left');
            if (clampedX === bounds.maxX) directions.push('right');
            if (clampedY === bounds.minY) directions.push('top');
            if (clampedY === bounds.maxY) directions.push('bottom');
            
            direction = directions.join('-');

            // Calculate intensity based on how much the movement was restricted
            const deltaX = Math.abs(newScrollX - clampedX);
            const deltaY = Math.abs(newScrollY - clampedY);
            intensity = Math.min(1.0, Math.max(deltaX, deltaY) / 50); // Normalize to 0-1 range
        }

        return { isAtBoundary, direction, intensity };
    }

    /**
     * Update boundary feedback based on current boundary state
     */
    private updateBoundaryFeedback(boundaryInfo: { isAtBoundary: boolean; direction: string; intensity: number }): void {
        if (!this.boundaryFeedback.graphics) {
            return;
        }

        this.dragState.isAtBoundary = boundaryInfo.isAtBoundary;
        this.dragState.boundaryDirection = boundaryInfo.direction;

        if (boundaryInfo.isAtBoundary) {
            this.showBoundaryFeedback(boundaryInfo.direction, boundaryInfo.intensity);
        } else {
            this.hideBoundaryFeedback();
        }
    }

    /**
     * Show boundary feedback visual effect
     */
    private showBoundaryFeedback(direction: string, intensity: number): void {
        if (!this.boundaryFeedback.graphics || this.boundaryFeedback.isVisible) {
            return;
        }

        const graphics = this.boundaryFeedback.graphics;
        const camera = this.camera;
        
        // Clear previous graphics
        graphics.clear();

        // Set up visual style based on intensity
        const alpha = Math.min(0.6, 0.2 + (intensity * 0.4));
        const color = 0xff6b6b; // Red color for boundary indication
        const thickness = Math.max(2, intensity * 8);

        // Get camera viewport in world coordinates
        const viewportLeft = camera.scrollX;
        const viewportTop = camera.scrollY;
        const viewportRight = camera.scrollX + (camera.width / camera.zoom);
        const viewportBottom = camera.scrollY + (camera.height / camera.zoom);

        // Draw boundary indicators based on direction
        graphics.lineStyle(thickness, color, alpha);

        if (direction.includes('left')) {
            graphics.beginPath();
            graphics.moveTo(viewportLeft, viewportTop);
            graphics.lineTo(viewportLeft, viewportBottom);
            graphics.strokePath();
        }

        if (direction.includes('right')) {
            graphics.beginPath();
            graphics.moveTo(viewportRight, viewportTop);
            graphics.lineTo(viewportRight, viewportBottom);
            graphics.strokePath();
        }

        if (direction.includes('top')) {
            graphics.beginPath();
            graphics.moveTo(viewportLeft, viewportTop);
            graphics.lineTo(viewportRight, viewportTop);
            graphics.strokePath();
        }

        if (direction.includes('bottom')) {
            graphics.beginPath();
            graphics.moveTo(viewportLeft, viewportBottom);
            graphics.lineTo(viewportRight, viewportBottom);
            graphics.strokePath();
        }

        // Show the graphics with a pulsing effect
        graphics.setVisible(true);
        this.boundaryFeedback.isVisible = true;

        // Create pulsing animation
        if (this.boundaryFeedback.tween) {
            this.boundaryFeedback.tween.destroy();
        }

        this.boundaryFeedback.tween = this.scene.tweens.add({
            targets: graphics,
            alpha: { from: alpha, to: alpha * 0.3 },
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Hide boundary feedback visual effect
     */
    private hideBoundaryFeedback(): void {
        if (!this.boundaryFeedback.graphics || !this.boundaryFeedback.isVisible) {
            return;
        }

        // Stop pulsing animation
        if (this.boundaryFeedback.tween) {
            this.boundaryFeedback.tween.destroy();
            this.boundaryFeedback.tween = null;
        }

        // Hide graphics
        this.boundaryFeedback.graphics.setVisible(false);
        this.boundaryFeedback.graphics.clear();
        this.boundaryFeedback.isVisible = false;
    }

    /**
     * Provide immediate visual feedback when drag operation starts
     */
    private provideImmediateVisualFeedback(): void {
        // Add a subtle visual effect to indicate drag mode is active
        if (this.boundaryFeedback.graphics) {
            const graphics = this.boundaryFeedback.graphics;
            const camera = this.camera;
            
            // Clear any existing graphics
            graphics.clear();
            
            // Create a subtle overlay effect to indicate drag mode
            const viewportLeft = camera.scrollX;
            const viewportTop = camera.scrollY;
            const viewportRight = camera.scrollX + (camera.width / camera.zoom);
            const viewportBottom = camera.scrollY + (camera.height / camera.zoom);
            
            // Draw a very subtle border around the viewport
            graphics.lineStyle(1, 0x4a90e2, 0.1); // Light blue, very transparent
            graphics.strokeRect(viewportLeft, viewportTop, viewportRight - viewportLeft, viewportBottom - viewportTop);
            
            // Show briefly then fade out
            graphics.setVisible(true);
            graphics.setAlpha(1);
            
            // Fade out the immediate feedback after a short time
            this.scene.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 200,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    graphics.clear();
                    graphics.setVisible(false);
                }
            });
        }
    }

    /**
     * Set the cursor style with smooth transition
     */
    private setCursorWithTransition(cursor: string): void {
        // Store original cursor if this is the first change
        if (!this.dragState.isDragging || this.dragState.originalCursor === 'default') {
            this.dragState.originalCursor = document.body.style.cursor || 'default';
        }

        // Clean up any existing cursor transition
        if (this.cursorTransitionTween) {
            this.cursorTransitionTween.destroy();
            this.cursorTransitionTween = null;
        }

        // Create smooth cursor transition effect
        const body = document.body;
        const originalTransition = body.style.transition;
        
        // Add CSS transition for smooth cursor change
        body.style.transition = 'cursor 0.1s ease-in-out';
        body.style.cursor = cursor;

        // Create a tween to manage the transition timing
        this.cursorTransitionTween = this.scene.tweens.add({
            targets: {},
            duration: 100,
            onComplete: () => {
                // Restore original transition after cursor change
                body.style.transition = originalTransition;
                this.cursorTransitionTween = null;
            }
        });
    }

    /**
     * Restore the original cursor style with smooth transition
     */
    private restoreCursorWithTransition(): void {
        // Clean up any existing cursor transition
        if (this.cursorTransitionTween) {
            this.cursorTransitionTween.destroy();
            this.cursorTransitionTween = null;
        }

        const body = document.body;
        const originalTransition = body.style.transition;
        
        // Add CSS transition for smooth cursor restoration
        body.style.transition = 'cursor 0.1s ease-in-out';
        body.style.cursor = this.dragState.originalCursor;

        // Create a tween to manage the transition timing
        this.cursorTransitionTween = this.scene.tweens.add({
            targets: {},
            duration: 100,
            onComplete: () => {
                // Restore original transition after cursor change
                body.style.transition = originalTransition;
                this.cursorTransitionTween = null;
            }
        });
    }

    /**
     * Set the cursor style (legacy method for backward compatibility)
     */
    private setCursor(cursor: string): void {
        // Store original cursor if this is the first change
        if (!this.dragState.isDragging || this.dragState.originalCursor === 'default') {
            this.dragState.originalCursor = document.body.style.cursor || 'default';
        }

        // Set new cursor
        document.body.style.cursor = cursor;
    }

    /**
     * Restore the original cursor style (legacy method for backward compatibility)
     */
    private restoreCursor(): void {
        document.body.style.cursor = this.dragState.originalCursor;
    }

    /**
     * Check if the pointer is over an interactive element that should prevent dragging
     * Priority order: UI elements > NPCs > Player > Map
     */
    private isInteractiveElement(pointer: Phaser.Input.Pointer): boolean {
        // Convert screen coordinates to world coordinates
        const worldX = this.camera.scrollX + (pointer.x / this.camera.zoom);
        const worldY = this.camera.scrollY + (pointer.y / this.camera.zoom);

        // Check for UI elements (highest priority)
        if (this.isOverUIElement(pointer)) {
            return true;
        }

        // Check for NPCs (second priority)
        if (this.isOverNPC(worldX, worldY)) {
            return true;
        }

        // Check for player character (third priority)
        if (this.isOverPlayer(worldX, worldY)) {
            return true;
        }

        // Check for other interactive game objects
        if (this.isOverInteractiveGameObject(worldX, worldY)) {
            return true;
        }

        return false;
    }

    /**
     * Check if pointer is over UI elements (React components, HUD, etc.)
     */
    private isOverUIElement(pointer: Phaser.Input.Pointer): boolean {
        // Check if any React UI components are open
        const bankingUI = document.querySelector('[data-testid="banking-dashboard"]');
        const stockMarketUI = document.querySelector('[data-testid="stock-market-dashboard"]');
        const atmUI = document.querySelector('[data-testid="atm-dashboard"]');
        const gameHUD = document.querySelector('.game-hud');

        // If any UI is open, consider the entire screen as UI area
        if (bankingUI || stockMarketUI || atmUI) {
            return true;
        }

        // Check if pointer is over HUD elements
        if (gameHUD) {
            const hudRect = gameHUD.getBoundingClientRect();
            if (pointer.x >= hudRect.left && pointer.x <= hudRect.right &&
                pointer.y >= hudRect.top && pointer.y <= hudRect.bottom) {
                return true;
            }
        }

        // Check for other UI elements by class or data attributes
        const uiElements = document.querySelectorAll('.ui-element, [data-ui="true"], .phaser-ui');
        for (let i = 0; i < uiElements.length; i++) {
            const element = uiElements[i];
            const rect = element.getBoundingClientRect();
            if (pointer.x >= rect.left && pointer.x <= rect.right &&
                pointer.y >= rect.top && pointer.y <= rect.bottom) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if pointer is over an NPC
     */
    private isOverNPC(worldX: number, worldY: number): boolean {
        // Check Village Elder NPC from NPCManager
        if (this.scene.npcManager) {
            // Village Elder is at position (737, 3753) with interaction distance of 150
            const npcX = 737;
            const npcY = 3753;
            const interactionDistance = 150;
            
            const distance = Phaser.Math.Distance.Between(worldX, worldY, npcX, npcY);
            if (distance <= interactionDistance) {
                return true;
            }
        }

        // Check Bank NPCs
        if (this.scene.bankNPCManager) {
            // Bank NPCs are typically at building entrances
            // Check if near bank entrance (9383, 6087)
            const bankEntranceX = 9383;
            const bankEntranceY = 6087;
            const bankInteractionDistance = 200;
            
            const bankDistance = Phaser.Math.Distance.Between(worldX, worldY, bankEntranceX, bankEntranceY);
            if (bankDistance <= bankInteractionDistance) {
                return true;
            }
        }

        // Check Stock Market NPCs
        if (this.scene.stockMarketManager) {
            // Stock Market entrance (2565, 3550)
            const stockMarketX = 2565;
            const stockMarketY = 3550;
            const stockMarketInteractionDistance = 200;
            
            const stockMarketDistance = Phaser.Math.Distance.Between(worldX, worldY, stockMarketX, stockMarketY);
            if (stockMarketDistance <= stockMarketInteractionDistance) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if pointer is over the player character
     */
    private isOverPlayer(worldX: number, worldY: number): boolean {
        const player = this.scene.getPlayer();
        if (!player) {
            return false;
        }

        const playerSprite = player.getSprite();
        if (!playerSprite) {
            return false;
        }

        // Check if click is within player bounds (considering sprite size and scale)
        const playerBounds = playerSprite.getBounds();
        const clickBuffer = 50; // Add some buffer for easier clicking
        
        return worldX >= playerBounds.x - clickBuffer &&
               worldX <= playerBounds.x + playerBounds.width + clickBuffer &&
               worldY >= playerBounds.y - clickBuffer &&
               worldY <= playerBounds.y + playerBounds.height + clickBuffer;
    }

    /**
     * Check if pointer is over other interactive game objects (ATMs, buildings, etc.)
     */
    private isOverInteractiveGameObject(worldX: number, worldY: number): boolean {
        // Check ATM locations
        if (this.scene.atmManager) {
            // ATMs are typically near building entrances
            // Add specific ATM locations if known
            const atmLocations = [
                { x: 9383, y: 6087 }, // Near bank
                { x: 2565, y: 3550 }  // Near stock market
            ];

            for (const atm of atmLocations) {
                const distance = Phaser.Math.Distance.Between(worldX, worldY, atm.x, atm.y);
                if (distance <= 100) { // ATM interaction distance
                    return true;
                }
            }
        }

        // Check building entrances
        if (this.scene.buildingManager) {
            const buildingEntrances = [
                { x: 9383, y: 6087 },  // Bank entrance
                { x: 2565, y: 3550 }   // Stock market entrance
            ];

            for (const entrance of buildingEntrances) {
                const distance = Phaser.Math.Distance.Between(worldX, worldY, entrance.x, entrance.y);
                if (distance <= 150) { // Building interaction distance
                    return true;
                }
            }
        }

        return false;
    }
}