import { Scene, GameObjects, Types } from 'phaser';
import { Constants } from '../utils/Constants.ts';

export class Player {
  private scene: Scene;
  private sprite: GameObjects.Sprite;
  private nameText: GameObjects.Text;
  private cursors: Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private currentAnimation: string = 'idle-down';
  private lastSentPosition: { x: number; y: number } | null = null;
  private lastSentAnimation: string | null = null;
  private username: string;
  private movementSmoothing: number = 0.2; // Controls movement smoothness (lower = smoother)

  constructor(scene: Scene, x: number, y: number, cursors: Types.Input.Keyboard.CursorKeys, wasd: Record<string, Phaser.Input.Keyboard.Key>) {
    this.scene = scene;
    this.cursors = cursors;
    this.wasd = wasd;
    this.username = scene.registry.get('username') || 'Player';
    
    // Create player sprite
    this.sprite = scene.add.sprite(x, y, 'character');
    this.sprite.setScale(5); // Make character bigger
    
    // Create animations
    this.createAnimations();
    
    // Set initial animation
    this.sprite.anims.play('idle-down');
    
    // Add physics to player
    scene.physics.add.existing(this.sprite);
    
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(32, 32);
      body.setOffset(8, 8);
      body.setDamping(true);
      body.setDrag(0.85, 0.85);
    }
    
    // Create username text
    this.nameText = scene.add.text(x, y - 50, this.username, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
  }

  update(deltaFactor: number = 1): void {
    this.handleMovement(deltaFactor);
    this.updateNamePosition();
  }

  private handleMovement(deltaFactor: number): void {
    // Calculate movement
    let dx = 0;
    let dy = 0;
    const speed = Constants.PLAYER_SPEED * deltaFactor;

    // Check both arrow keys and WASD
    if (this.cursors.left?.isDown || this.wasd.left?.isDown) {
      dx = -speed;
      this.sprite.anims.play('walk-left', true);
      this.currentAnimation = 'walk-left';
    } else if (this.cursors.right?.isDown || this.wasd.right?.isDown) {
      dx = speed;
      this.sprite.anims.play('walk-right', true);
      this.currentAnimation = 'walk-right';
    }

    if (this.cursors.up?.isDown || this.wasd.up?.isDown) {
      dy = -speed;
      if (dx === 0) {
        this.sprite.anims.play('walk-up', true);
        this.currentAnimation = 'walk-up';
      }
    } else if (this.cursors.down?.isDown || this.wasd.down?.isDown) {
      dy = speed;
      if (dx === 0) {
        this.sprite.anims.play('walk-down', true);
        this.currentAnimation = 'walk-down';
      }
    }

    // Handle idle animations
    if (dx === 0 && dy === 0) {
      // Get current animation key
      const currentAnim = this.sprite.anims.currentAnim;
      if (currentAnim) {
        const direction = currentAnim.key.split('-')[1];
        this.sprite.anims.play('idle-' + direction, true);
        this.currentAnimation = 'idle-' + direction;
      }
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    // Set player velocity using physics body
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(dx, dy);
      
      // Optional: Apply pixel-perfect position rounding for sharper visuals
      this.sprite.x = Math.round(this.sprite.x);
      this.sprite.y = Math.round(this.sprite.y);
    }
  }

  private createAnimations(): void {
    const { anims } = this.scene;

    // Only create animations if they don't exist already
    if (anims.exists('idle-down')) return;

    // Down animations
    anims.create({
      key: 'idle-down',
      frames: anims.generateFrameNumbers('character', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });
    anims.create({
      key: 'walk-down',
      frames: anims.generateFrameNumbers('character', { start: 2, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Up animations
    anims.create({
      key: 'idle-up',
      frames: anims.generateFrameNumbers('character', { start: 4, end: 5 }),
      frameRate: 2,
      repeat: -1
    });
    anims.create({
      key: 'walk-up',
      frames: anims.generateFrameNumbers('character', { start: 6, end: 7 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Left animations
    anims.create({
      key: 'idle-left',
      frames: anims.generateFrameNumbers('character', { start: 8, end: 9 }),
      frameRate: 2,
      repeat: -1
    });
    anims.create({
      key: 'walk-left',
      frames: anims.generateFrameNumbers('character', { start: 10, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Right animations
    anims.create({
      key: 'idle-right',
      frames: anims.generateFrameNumbers('character', { start: 12, end: 13 }),
      frameRate: 2,
      repeat: -1
    });
    anims.create({
      key: 'walk-right',
      frames: anims.generateFrameNumbers('character', { start: 14, end: 15 }),
      frameRate: 8,
      repeat: -1
    });
  }

  private updateNamePosition(): void {
    this.nameText.x = this.sprite.x;
    this.nameText.y = this.sprite.y - 50;
  }

  // Getters and utility methods
  getSprite(): GameObjects.Sprite {
    return this.sprite;
  }

  getNameText(): GameObjects.Text {
    return this.nameText;
  }

  getPosition(): { x: number, y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getCurrentAnimation(): string | null {
    return this.currentAnimation || null;
  }

  setLastSentPosition(position: { x: number, y: number }): void {
    this.lastSentPosition = position;
  }

  getLastSentPosition(): { x: number, y: number } | null {
    return this.lastSentPosition;
  }

  setLastSentAnimation(animation: string): void {
    this.lastSentAnimation = animation;
  }

  getLastSentAnimation(): string | null {
    return this.lastSentAnimation;
  }

  getUsername(): string {
    return this.username;
  }
}