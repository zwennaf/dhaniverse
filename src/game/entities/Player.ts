import { Scene, GameObjects, Types } from "phaser";
import { Constants } from "../utils/Constants.ts";
import { ensureCharacterAnimations } from "../utils/CharacterAnimations.ts";
import { FontUtils } from "../utils/FontUtils.ts";
import { dialogueManager } from "../../services/DialogueManager";

export class Player {
    private scene: Scene;
    private sprite: GameObjects.Sprite;
    private nameText: GameObjects.Text;
    private cursors: Types.Input.Keyboard.CursorKeys;
    private wasd: Record<string, Phaser.Input.Keyboard.Key>;
    private shiftKey: Phaser.Input.Keyboard.Key; // Add shift key
    private currentAnimation: string = "idle-down";
    private lastSentPosition: { x: number; y: number } | null = null;
    private lastSentAnimation: string | null = null;
    private username: string;
    private movementSmoothing: number = 0.2; // Controls movement smoothness (lower = smoother)

    // Depth ordering: ensure player appears above NPCs but below global UI/dialogs
    private static readonly PLAYER_DEPTH = 1500;
    private static readonly PLAYER_NAME_DEPTH = Player.PLAYER_DEPTH + 1;

    constructor(
        scene: Scene,
        x: number,
        y: number,
        cursors: Types.Input.Keyboard.CursorKeys,
        wasd: Record<string, Phaser.Input.Keyboard.Key>,
        _skin?: string // optional, reserved for future per-player skin handling if needed
    ) {
        this.scene = scene;
        this.cursors = cursors;
        this.wasd = wasd;
        this.username = scene.registry.get("username") || "Player";

        // Register shift key for running
        this.shiftKey = scene.input.keyboard!.addKey("SHIFT");

        // Create player sprite
    this.sprite = scene.add.sprite(x, y, "character");
    this.sprite.setScale(0.3); // Scale up the character to be more visible
    this.sprite.setDepth(Player.PLAYER_DEPTH); // Ensure player appears above NPCs and other players

        // Ensure animations exist for the 'character' texture (local player)
        ensureCharacterAnimations(this.scene, "character");

        // Set initial animation
        this.sprite.anims.play("idle-down");

        // Add physics to player
        scene.physics.add.existing(this.sprite);

        if (this.sprite.body) {
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            body.setCollideWorldBounds(true);
            body.setSize(240, 240);
            body.setOffset(300, 480);
            body.setDamping(true);
            body.setDrag(0.85, 0.85);
        }
        // Create username text with proper font loading
        this.nameText = scene.add
            .text(x, y + 350, this.username, {
                fontFamily: FontUtils.getPlayerNameFont(),
                fontSize: Constants.PLAYER_NAME_SIZE,
                color: Constants.PLAYER_NAME_COLOR,
                align: "center",
                backgroundColor: Constants.PLAYER_NAME_BACKGROUND,
                padding: Constants.PLAYER_NAME_PADDING,
            })
            .setOrigin(0.5, 3)
                .setDepth(Player.PLAYER_NAME_DEPTH); // Player name should be above player sprite

        // Ensure font is loaded and refresh the text if needed
        FontUtils.ensureFontLoaded(
            "Tickerbit",
            Constants.PLAYER_NAME_SIZE
        ).then(() => {
            this.nameText.setStyle({
                fontFamily: FontUtils.getPlayerNameFont(),
                fontSize: Constants.PLAYER_NAME_SIZE,
                color: Constants.PLAYER_NAME_COLOR,
            });
        });
    }

    update(deltaFactor: number = 1): void {
        this.handleMovement(deltaFactor);
        this.updateNamePosition();
    }

    private handleMovement(deltaFactor: number): void {
        // Calculate movement
        let dx = 0;
        let dy = 0;
        const isRunning = this.shiftKey.isDown;
        const speed = isRunning
            ? Constants.PLAYER_SPEED * 1.6 * deltaFactor // 60% faster when running
            : Constants.PLAYER_SPEED * deltaFactor;

        // Check both arrow keys and WASD
        if (this.cursors.left?.isDown || this.wasd.left?.isDown) {
            dx = -speed;
            if (isRunning) {
                this.sprite.anims.play("run-left", true);
                this.currentAnimation = "run-left";
            } else {
                this.sprite.anims.play("walk-left", true);
                this.currentAnimation = "walk-left";
            }
        } else if (this.cursors.right?.isDown || this.wasd.right?.isDown) {
            dx = speed;
            if (isRunning) {
                this.sprite.anims.play("run-right", true);
                this.currentAnimation = "run-right";
            } else {
                this.sprite.anims.play("walk-right", true);
                this.currentAnimation = "walk-right";
            }
        }

        if (this.cursors.up?.isDown || this.wasd.up?.isDown) {
            dy = -speed;
            if (dx === 0) {
                if (isRunning) {
                    this.sprite.anims.play("run-up", true);
                    this.currentAnimation = "run-up";
                } else {
                    this.sprite.anims.play("walk-up", true);
                    this.currentAnimation = "walk-up";
                }
            }
        } else if (this.cursors.down?.isDown || this.wasd.down?.isDown) {
            dy = speed;
            if (dx === 0) {
                if (isRunning) {
                    this.sprite.anims.play("run-down", true);
                    this.currentAnimation = "run-down";
                } else {
                    this.sprite.anims.play("walk-down", true);
                    this.currentAnimation = "walk-down";
                }
            }
        }

        // Handle idle animations
        if (dx === 0 && dy === 0) {
            // Get current animation key
            const currentAnim = this.sprite.anims.currentAnim;
            if (currentAnim) {
                const direction = currentAnim.key.split("-")[1];
                this.sprite.anims.play("idle-" + direction, true);
                this.currentAnimation = "idle-" + direction;
            }
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
        }

        // Set player velocity using physics body
        if (this.sprite.body) {
            // Direct velocity setting for smoother movement
            (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
                dx,
                dy
            );

            // Apply integer pixel positions to reduce flickering
            if (dx === 0 && dy === 0) {
                // Only snap position when not moving to prevent jitter
                this.sprite.x = Math.round(this.sprite.x);
                this.sprite.y = Math.round(this.sprite.y);

                // Also stop the body velocity completely when not moving
                (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(
                    0,
                    0
                );
            }
        }
    }

    private createAnimations(): void {
        // Kept for backward compatibility; ensure animations for 'character'
        ensureCharacterAnimations(this.scene, "character");
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

    getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    getCurrentAnimation(): string | null {
        return this.currentAnimation || null;
    }

    setLastSentPosition(position: { x: number; y: number }): void {
        this.lastSentPosition = position;
    }

    getLastSentPosition(): { x: number; y: number } | null {
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
