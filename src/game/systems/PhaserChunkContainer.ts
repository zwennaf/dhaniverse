import Phaser from 'phaser';

interface ChunkTransition {
  chunkId: string;
  image: Phaser.GameObjects.Image;
  tween?: Phaser.Tweens.Tween;
}

export class PhaserChunkContainer extends Phaser.GameObjects.Container {
  private chunkTransitions: Map<string, ChunkTransition> = new Map();
  private transitionDuration: number = 300; // ms
  private fadeInAlpha: number = 0.8; // Start slightly transparent for smooth loading

  constructor(scene: Phaser.Scene, x?: number, y?: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  public addChunkWithTransition(chunkId: string, image: Phaser.GameObjects.Image): void {
    // Set initial alpha for fade-in effect
    image.setAlpha(0);

    // Add to container
    this.add(image);

    // Create fade-in tween
    const tween = this.scene.tweens.add({
      targets: image,
      alpha: this.fadeInAlpha,
      duration: this.transitionDuration,
      ease: 'Power2',
      onComplete: () => {
        // Set to full opacity after transition
        image.setAlpha(1);
        // Remove tween reference
        const transition = this.chunkTransitions.get(chunkId);
        if (transition) {
          transition.tween = undefined;
        }
      }
    });

    // Store transition info
    this.chunkTransitions.set(chunkId, {
      chunkId,
      image,
      tween
    });
  }

  public removeChunkWithTransition(chunkId: string): void {
    const transition = this.chunkTransitions.get(chunkId);
    if (!transition) return;

    // Remove from transitions map immediately to prevent double removal
    this.chunkTransitions.delete(chunkId);

    // Stop any existing tween
    if (transition.tween) {
      transition.tween.stop();
      transition.tween = undefined;
    }

    // Check if the image is still valid before creating tween
    if (!transition.image || transition.image.scene === null) {
      return;
    }

    // Create fade-out tween with error handling
    try {
      this.scene.tweens.add({
        targets: transition.image,
        alpha: 0,
        duration: this.transitionDuration / 2, // Faster fade-out
        ease: 'Power2',
        onComplete: () => {
          try {
            // Double-check the image is still valid
            if (transition.image && transition.image.scene !== null) {
              // Remove from container first
              this.remove(transition.image);
              // Then destroy the image
              transition.image.destroy();
            }
          } catch (error) {
            console.warn(`Error destroying chunk image ${chunkId}:`, error);
          }
        },
        onCompleteScope: this
      });
    } catch (error) {
      console.warn(`Error creating fade-out tween for chunk ${chunkId}:`, error);
      // Fallback: immediately remove and destroy
      try {
        this.remove(transition.image);
        transition.image.destroy();
      } catch (destroyError) {
        console.warn(`Error in fallback destruction for chunk ${chunkId}:`, destroyError);
      }
    }
  }

  public hasChunk(chunkId: string): boolean {
    return this.chunkTransitions.has(chunkId);
  }

  public getChunkImage(chunkId: string): Phaser.GameObjects.Image | null {
    const transition = this.chunkTransitions.get(chunkId);
    return transition ? transition.image : null;
  }

  public updateChunkDepth(): void {
    // Ensure all chunks are behind other game objects
    this.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Image) {
        child.setDepth(-10);
      }
    });
  }

  public getChunkCount(): number {
    return this.chunkTransitions.size;
  }

  public getAllChunkIds(): string[] {
    return Array.from(this.chunkTransitions.keys());
  }

  public clearAllChunks(): void {
    // Stop all tweens and clear chunks safely
    this.chunkTransitions.forEach((transition) => {
      if (transition.tween) {
        transition.tween.stop();
      }
      try {
        if (transition.image && transition.image.scene !== null) {
          transition.image.destroy();
        }
      } catch (error) {
        console.warn(`Error destroying chunk image during clearAll:`, error);
      }
    });

    this.chunkTransitions.clear();
    this.removeAll(true);
  }

  public safelyRemoveChunk(chunkId: string): void {
    const transition = this.chunkTransitions.get(chunkId);
    if (!transition) return;

    // Remove from map immediately
    this.chunkTransitions.delete(chunkId);

    // Stop tween if exists
    if (transition.tween) {
      transition.tween.stop();
    }

    // Safely remove and destroy
    try {
      if (transition.image && transition.image.scene !== null) {
        this.remove(transition.image);
        transition.image.destroy();
      }
    } catch (error) {
      console.warn(`Error safely removing chunk ${chunkId}:`, error);
    }
  }

  public setTransitionDuration(duration: number): void {
    this.transitionDuration = Math.max(100, duration); // Minimum 100ms
  }

  public setFadeInAlpha(alpha: number): void {
    this.fadeInAlpha = Math.max(0, Math.min(1, alpha)); // Clamp between 0 and 1
  }
}