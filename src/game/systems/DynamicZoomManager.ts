import { Scene, Cameras } from "phaser";
import { Player } from "../entities/Player.ts";

export class DynamicZoomManager {
    private scene: Scene;
    private player: Player;
    private camera: Cameras.Scene2D.Camera;
    
    // Zoom levels
    private readonly DEFAULT_ZOOM = 0.8;
    private readonly RUNNING_ZOOM = 0.72; // Less zoom out when running
    
    // Animation settings
    private readonly ZOOM_OUT_DURATION = 800; // Slow zoom out when starting to run
    private readonly ZOOM_IN_DURATION = 200; // Quick return to default when stopping
    private readonly ZOOM_OUT_EASE = 'Power2.easeOut';
    private readonly ZOOM_IN_EASE = 'Power2.easeOut';
    
    // State tracking
    private currentZoomTarget: number = this.DEFAULT_ZOOM;
    private isRunning: boolean = false;
    private zoomTween?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.camera = scene.cameras.main;
        
        // Set initial zoom
        this.camera.setZoom(this.DEFAULT_ZOOM);
        this.currentZoomTarget = this.DEFAULT_ZOOM;
    }
    
    /**
     * Update the zoom manager - should be called every frame
     */
    update(): void {
        // Check if player is running by examining their current animation
        const currentAnimation = this.player.getCurrentAnimation();
        const playerIsRunning = currentAnimation?.includes('run') || false;
        
        // Only update zoom if running state changed
        if (playerIsRunning !== this.isRunning) {
            this.isRunning = playerIsRunning;
            this.updateZoom();
        }
    }
    
    /**
     * Smoothly transition to the appropriate zoom level
     */
    private updateZoom(): void {
        const targetZoom = this.isRunning ? this.RUNNING_ZOOM : this.DEFAULT_ZOOM;
        
        // Don't create a new tween if we're already targeting the same zoom
        if (targetZoom === this.currentZoomTarget) {
            return;
        }
        
        this.currentZoomTarget = targetZoom;
        
        // Stop any existing zoom tween
        if (this.zoomTween) {
            this.zoomTween.stop();
        }
        
        // Use different durations and easing based on zoom direction
        const duration = this.isRunning ? this.ZOOM_OUT_DURATION : this.ZOOM_IN_DURATION;
        const ease = this.isRunning ? this.ZOOM_OUT_EASE : this.ZOOM_IN_EASE;
        
        // Create smooth zoom transition
        this.zoomTween = this.scene.tweens.add({
            targets: this.camera,
            zoom: targetZoom,
            duration: duration,
            ease: ease,
            onComplete: () => {
                this.zoomTween = undefined;
            }
        });
    }
    
    /**
     * Set zoom to a specific level (for special cases like entering buildings)
     */
    setZoom(zoom: number, animate: boolean = true): void {
        this.currentZoomTarget = zoom;
        
        if (animate) {
            // Stop any existing zoom tween
            if (this.zoomTween) {
                this.zoomTween.stop();
            }
            
            this.zoomTween = this.scene.tweens.add({
                targets: this.camera,
                zoom: zoom,
                duration: this.ZOOM_IN_DURATION, // Use quick transition for building entry/exit
                ease: this.ZOOM_IN_EASE,
                onComplete: () => {
                    this.zoomTween = undefined;
                }
            });
        } else {
            this.camera.setZoom(zoom);
        }
    }
    
    /**
     * Get current zoom level
     */
    getCurrentZoom(): number {
        return this.camera.zoom;
    }
    
    /**
     * Get target zoom level
     */
    getTargetZoom(): number {
        return this.currentZoomTarget;
    }
    
    /**
     * Reset to default zoom (useful when exiting buildings)
     */
    resetToDefault(animate: boolean = true): void {
        this.isRunning = false; // Reset running state
        this.setZoom(this.DEFAULT_ZOOM, animate);
    }
    
    /**
     * Check if currently running
     */
    getIsRunning(): boolean {
        return this.isRunning;
    }
    
    /**
     * Destroy the zoom manager and clean up tweens
     */
    destroy(): void {
        if (this.zoomTween) {
            this.zoomTween.stop();
            this.zoomTween = undefined;
        }
    }
}