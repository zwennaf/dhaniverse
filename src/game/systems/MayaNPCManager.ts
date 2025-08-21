import { GameObjects, Input } from "phaser";
import { locationTrackerManager } from "../../services/LocationTrackerManager";
import { MainGameScene } from "../scenes/MainScene.ts";
import { Constants } from "../utils/Constants.ts";

interface NPCSprite extends GameObjects.Sprite {
    nameText?: GameObjects.Text;
}

export class MayaNPCManager {
    private scene: MainGameScene;
    private maya: NPCSprite;
    private interactionKey: Input.Keyboard.Key | null = null;
    private readonly interactionDistance: number = 150;
    private interactionText: GameObjects.Text;
    private isPlayerNearNPC: boolean = false;
    private activeDialog: boolean = false;
    private speechBubble: GameObjects.Sprite | null = null;
    private dialogContainer: GameObjects.Container | null = null;
    private dialogKeyListeners: { [key: string]: (event: KeyboardEvent) => void } = {};

    // Guided sequence state
    private guidedSequenceActive: boolean = false;
    private waypoints: Array<{ x: number; y: number }> = [];
    private currentWaypointIndex: number = 0;
    private movingTween: Phaser.Tweens.Tween | null = null;
    private movingToTarget: boolean = false;
    private moveTarget: { x: number; y: number } | null = null;
    private moveDir: { x: number; y: number } | null = null;
    private moveSpeed: number = 220; // units per second used for per-frame movement (increased)
    private pauseDurationMs: number = 1000; // 1 second pause at waypoints
    private followReminderText: GameObjects.Text | null = null;
    private alertText: GameObjects.Text | null = null;
    private distanceThreshold: number = 500; // units (increased to 500 as requested)
    private alertTimerEvent: Phaser.Time.TimerEvent | null = null;
    private alertIntervalMs: number = 60000; // 60 seconds
    private guideCompleted: boolean = false;

    // Maya's position (starting condition specified)
    public readonly x: number = 7779;
    public readonly y: number = 3581;

    constructor(scene: MainGameScene) {
        this.scene = scene;

        // Setup interaction key
        if (scene.input.keyboard) {
            this.interactionKey = scene.input.keyboard.addKey("E");
        }

        // Create Maya at specified position
        this.maya = scene.add.sprite(this.x, this.y, "maya") as NPCSprite;
        this.maya.setScale(3);
        this.maya.setDepth(50); // Set lower depth than player (1000) but higher than map
        
        // Ensure Maya is perfectly aligned at 0 degrees with no flipping
        this.maya.setFlipX(false);
        this.maya.setFlipY(false);
        this.maya.setRotation(0);
        
        this.maya.anims.play("maya-idle-down");

        // Add Maya's name text with special styling like LocationTracker
        const mayaNameText = scene.add
            .text(this.maya.x, this.maya.y - 50, "Maya", {
                fontFamily: "Tickerbit", // Use same font as LocationTracker
                fontSize: "18px", // Slightly larger for importance
                color: "#ffffff",
                align: "center",
                backgroundColor: "#000000b3", // Semi-transparent black like LocationTracker
                padding: { x: 8, y: 4 }, // More padding for better appearance
            })
            .setOrigin(0.5)
            .setDepth(51) // Name text above Maya sprite
            .setScale(1) // Ensure text scale is normal
            .setRotation(0) // Ensure text is not rotated
            .setFlipX(false) // Ensure text is not flipped horizontally
            .setFlipY(false); // Ensure text is not flipped vertically

        // Add a subtle border effect like LocationTracker
        mayaNameText.setStroke("#333333", 1); // Dark border for better visibility
        mayaNameText.setShadow(2, 2, "#000000", 3); // Drop shadow for depth

        // Add interaction text (initially hidden) with enhanced styling
        this.interactionText = scene.add
            .text(this.maya.x, this.maya.y - 80, "Press E to interact", {
                fontFamily: "Tickerbit", // Match Maya's name font
                fontSize: "16px",
                color: "#ffffff",
                align: "center",
                backgroundColor: "#1a1a1ab3", // Slightly different background
                padding: { x: 10, y: 5 }, // More padding
            })
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(52) // Above name text
            .setScale(1) // Ensure text scale is normal
            .setRotation(0) // Ensure text is not rotated
            .setFlipX(false) // Ensure text is not flipped horizontally
            .setFlipY(false); // Ensure text is not flipped vertically

        // Add border and shadow effects like Maya's name
        this.interactionText.setStroke("#444444", 1);
        this.interactionText.setShadow(2, 2, "#000000", 2);

        // Add to game container
        const gameContainer = scene.getGameContainer();
        if (gameContainer) {
            gameContainer.add(this.maya);
            gameContainer.add(mayaNameText);
            gameContainer.add(this.interactionText);
            this.maya.nameText = mayaNameText;
        }

        // Create animations for Maya
        this.createMayaAnimations();
    }

    private createMayaAnimations(): void {
        const anims = this.scene.anims;

        // Check if animations already exist
        if (anims.exists("maya-idle-down")) {
            return;
        }

        // Maya's animation frames based on 5 columns x 8 rows layout:
        // Row 1 (frames 0-4): 5 tiles idle animation for down facing
        anims.create({
            key: "maya-idle-down",
            frames: anims.generateFrameNumbers("maya", { frames: [0, 1, 2, 3, 4] }),
            frameRate: 3,
            repeat: -1,
        });

        // Row 2 (frames 5-9): 3 tiles left idle
        anims.create({
            key: "maya-idle-left",
            frames: anims.generateFrameNumbers("maya", { frames: [5, 6, 7] }),
            frameRate: 3,
            repeat: -1,
        });

        // Row 3 (frames 10-14): 3 tiles up idle  
        anims.create({
            key: "maya-idle-up",
            frames: anims.generateFrameNumbers("maya", { frames: [10, 11, 12] }),
            frameRate: 3,
            repeat: -1,
        });

        // Row 4 (frames 15-19): 3 tiles right idle
        anims.create({
            key: "maya-idle-right",
            frames: anims.generateFrameNumbers("maya", { frames: [15, 16, 17] }),
            frameRate: 3,
            repeat: -1,
        });

        // Row 5 (frames 20-24): 4 tiles move down
        anims.create({
            key: "maya-walk-down",
            frames: anims.generateFrameNumbers("maya", { frames: [20, 21, 22, 23] }),
            frameRate: 8,
            repeat: -1,
        });

        // Row 6 (frames 25-29): 4 tiles move left
        anims.create({
            key: "maya-walk-left",
            frames: anims.generateFrameNumbers("maya", { frames: [25, 26, 27, 28] }),
            frameRate: 8,
            repeat: -1,
        });

        // Row 7 (frames 30-34): 4 tiles move up
        anims.create({
            key: "maya-walk-up",
            frames: anims.generateFrameNumbers("maya", { frames: [30, 31, 32, 33] }),
            frameRate: 8,
            repeat: -1,
        });

        // Row 8 (frames 35-39): 4 tiles move right
        anims.create({
            key: "maya-walk-right",
            frames: anims.generateFrameNumbers("maya", { frames: [35, 36, 37, 38] }),
            frameRate: 8,
            repeat: -1,
        });
    }

    public getMayaPosition(): { x: number; y: number } {
        return { x: this.maya.x, y: this.maya.y };
    }

    public getMayaSprite(): NPCSprite {
        return this.maya;
    }

    private updateInteractionTextPosition(): void {
        if (this.interactionText && this.maya) {
            this.interactionText.x = this.maya.x;
            this.interactionText.y = this.maya.y - 80;
        }
    }

    private showDialog(): void {
        if (this.activeDialog) return;

        this.activeDialog = true;

        // Create a dialog box similar to NPCManager
        const dialogBox = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.height - 150,
            this.scene.cameras.main.width * 0.8,
            150,
            0x000000,
            0.8
        );
        dialogBox.setScrollFactor(0).setDepth(2000);

        // Add dialog text with word wrap and typing effect
        const fullText = "Hello adventurer! I'm Maya, your quest helper.\nI can guide you on your journey through Dhaniverse!";
        const dialogText = this.scene.add
            .text(
                dialogBox.x,
                dialogBox.y,
                "", // Start with empty text for typing effect
                {
                    fontFamily: Constants.DIALOG_TEXT_FONT,
                    fontSize: Constants.DIALOG_TEXT_SIZE,
                    color: Constants.DIALOG_TEXT_COLOR,
                    align: "center",
                    wordWrap: { width: dialogBox.width - 40 },
                }
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Add typing effect
        this.addTypingEffect(dialogText, fullText);

        // Add close instruction
        const closeText = this.scene.add
            .text(
                dialogBox.x,
                dialogBox.y + 60,
                "Press E, Space or Enter to close",
                {
                    fontFamily: Constants.DIALOG_INSTRUCTION_FONT,
                    fontSize: Constants.DIALOG_INSTRUCTION_SIZE,
                    color: Constants.DIALOG_INSTRUCTION_COLOR,
                    align: "center",
                }
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Create a container for dialog elements
        this.dialogContainer = this.scene.add.container(0, 0);
        this.dialogContainer.add([dialogBox, dialogText, closeText]);

        // Create speech bubble above Maya
        this.speechBubble = this.scene.add.sprite(
            this.maya.x,
            this.maya.y - 120,
            "speech_bubble_grey"
        );
        this.speechBubble.setScale(2.5);
        this.speechBubble.setDepth(2002);
        this.speechBubble.setScrollFactor(1);

        // Play the opening animation if it exists
        if (this.scene.anims.exists("speech-bubble-open")) {
            this.speechBubble.play("speech-bubble-open");
        }

        // Setup improved keyboard listeners to close dialog
        this.setupDialogKeyListeners();
    }

    private setupDialogKeyListeners(): void {
        // Clear any existing listeners
        this.clearDialogKeyListeners();

        // Create reusable event handlers
        const closeDialogHandler = () => {
            if (this.activeDialog) {
                this.closeDialog();
            }
        };

        // Store references to the handlers for cleanup
        this.dialogKeyListeners = {
            'E': closeDialogHandler,
            'Space': closeDialogHandler,
            'Enter': closeDialogHandler,
            'Escape': closeDialogHandler, // Add escape key for better UX
        };

        // Add event listeners for multiple keys
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-E', this.dialogKeyListeners['E']);
            this.scene.input.keyboard.on('keydown-SPACE', this.dialogKeyListeners['Space']);
            this.scene.input.keyboard.on('keydown-ENTER', this.dialogKeyListeners['Enter']);
            this.scene.input.keyboard.on('keydown-ESC', this.dialogKeyListeners['Escape']);
        }
    }

    private clearDialogKeyListeners(): void {
        if (this.scene.input.keyboard && Object.keys(this.dialogKeyListeners).length > 0) {
            this.scene.input.keyboard.off('keydown-E', this.dialogKeyListeners['E']);
            this.scene.input.keyboard.off('keydown-SPACE', this.dialogKeyListeners['Space']);
            this.scene.input.keyboard.off('keydown-ENTER', this.dialogKeyListeners['Enter']);
            this.scene.input.keyboard.off('keydown-ESC', this.dialogKeyListeners['Escape']);
        }
        this.dialogKeyListeners = {};
    }

    private addTypingEffect(textObject: GameObjects.Text, fullText: string): void {
        let currentIndex = 0;
        const typingSpeed = 50; // milliseconds per character

        const typeNextCharacter = () => {
            if (currentIndex < fullText.length && this.activeDialog) {
                currentIndex++;
                textObject.setText(fullText.substring(0, currentIndex));
                
                // Continue typing if dialog is still active
                setTimeout(typeNextCharacter, typingSpeed);
            }
        };

        // Start typing
        setTimeout(typeNextCharacter, 200); // Small delay before starting
    }

    private closeDialog(): void {
        if (!this.activeDialog) return;

        this.activeDialog = false;

        // Clear keyboard listeners
        this.clearDialogKeyListeners();

        // Play the closing animation if speech bubble exists and animation exists
        if (this.speechBubble) {
            if (this.scene.anims.exists("speech-bubble-close")) {
                this.speechBubble.play("speech-bubble-close");

                // Wait for the closing animation to complete
                this.speechBubble.once("animationcomplete", () => {
                    if (this.speechBubble) {
                        this.speechBubble.destroy();
                        this.speechBubble = null;
                    }
                });
            } else {
                // No closing animation, destroy immediately
                this.speechBubble.destroy();
                this.speechBubble = null;
            }
        }

        // Clean up dialog container with fade out animation
        if (this.dialogContainer) {
            this.scene.tweens.add({
                targets: this.dialogContainer,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (this.dialogContainer) {
                        this.dialogContainer.destroy();
                        this.dialogContainer = null;
                    }
                },
            });
        }
    }

    public update(): void {
        if (!this.maya || !this.scene.getPlayer()) return;

        const player = this.scene.getPlayer();
        const playerSprite = player.getSprite();

        // Calculate distance between player and Maya
        const distance = Phaser.Math.Distance.Between(
            playerSprite.x,
            playerSprite.y,
            this.maya.x,
            this.maya.y
        );

        // Only auto-update Maya to face the player when a guided sequence is NOT active.
        // When guidedSequenceActive is true, Maya should face the movement direction (set by movement logic)
        if (!this.guidedSequenceActive) {
            this.updateMayaDirectionToPlayer(playerSprite);
        }

        const wasNearNPC = this.isPlayerNearNPC;
        this.isPlayerNearNPC = distance < this.interactionDistance;

        // Show/hide interaction text with smooth fade only when dialog is not active
        // and Maya is not currently moving in the guided sequence
        if (!this.movingToTarget) {
            if (this.isPlayerNearNPC && !wasNearNPC && !this.activeDialog) {
                this.scene.tweens.add({
                    targets: this.interactionText,
                    alpha: 1,
                    duration: 200,
                    ease: "Power1",
                });
            } else if (!this.isPlayerNearNPC && wasNearNPC) {
                this.scene.tweens.add({
                    targets: this.interactionText,
                    alpha: 0,
                    duration: 200,
                    ease: "Power1",
                });
            }
        }

        // Hide interaction text when dialog is active
        if (this.activeDialog) {
            this.interactionText.setAlpha(0);
        }

        // Update interaction text position
        this.updateInteractionTextPosition();

        // If guided sequence active, maintain reminder position and check follow distance
        if (this.guidedSequenceActive) {
            // Keep follow reminder positioned in case camera moves
            if (this.followReminderText) {
                this.followReminderText.x = this.scene.cameras.main.centerX;
            }

            // Check player's distance and show alerts if needed
            if (this.scene.getPlayer()) {
                this.checkFollowDistance(this.scene.getPlayer().getSprite());
            }
        }

        // Check for interaction key press when near Maya
        if (
            this.isPlayerNearNPC &&
            this.interactionKey &&
            Phaser.Input.Keyboard.JustDown(this.interactionKey) &&
            !this.activeDialog
        ) {
            // If the guide already completed and player presses E at destination,
            // show the final arrival interaction. Otherwise start the guided sequence.
            if (this.guideCompleted) {
                this.showArrivalInteraction();
            } else {
                this.startGuidedSequence();
            }
        }

        // Per-frame straight-line movement handling
        if (this.movingToTarget && this.moveTarget && this.moveDir) {
            // delta in seconds
            const deltaMs = (this.scene.game.loop && (this.scene.game.loop.delta)) || 16;
            const deltaSec = deltaMs / 1000;

            const moveStepX = this.moveDir.x * this.moveSpeed * deltaSec;
            const moveStepY = this.moveDir.y * this.moveSpeed * deltaSec;

            // Compute remaining distance to target
            const remX = this.moveTarget.x - this.maya.x;
            const remY = this.moveTarget.y - this.maya.y;
            const remDistSq = remX * remX + remY * remY;

            // If next step would overshoot, snap to target and finish
            const nextX = this.maya.x + moveStepX;
            const nextY = this.maya.y + moveStepY;
            const nextRemX = this.moveTarget.x - nextX;
            const nextRemY = this.moveTarget.y - nextY;
            const nextRemDistSq = nextRemX * nextRemX + nextRemY * nextRemY;

            if (nextRemDistSq > remDistSq) {
                // overshoot detected or very close; snap
                this.maya.x = this.moveTarget.x;
                this.maya.y = this.moveTarget.y;
            } else {
                this.maya.x = nextX;
                this.maya.y = nextY;
            }

            // Update name/interact text positions
            this.updateInteractionTextPosition();

            // Update tracker position live so HUD follows Maya along the path
            locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });

            // Check if reached target (within 2px)
            const arrived = Phaser.Math.Distance.Between(this.maya.x, this.maya.y, this.moveTarget.x, this.moveTarget.y) < 2;
            if (arrived) {
                // Stop movement
                this.movingToTarget = false;
                this.moveDir = null;
                this.moveTarget = null;

                // Play idle facing next waypoint or player
                const nextIndex = this.currentWaypointIndex + 1;
                if (nextIndex < this.waypoints.length) {
                    const nextTarget = this.waypoints[nextIndex];
                    this.faceDirectionTowards(nextTarget.x, nextTarget.y, /*useWalk=*/false);
                } else {
                    // Final arrival: face player
                    if (this.scene.getPlayer()) {
                        this.updateMayaDirectionToPlayer(this.scene.getPlayer().getSprite());
                    } else {
                        this.maya.anims.play('maya-idle-down', true);
                    }
                }

                this.playIdleForCurrentFacing();

                // Increment waypoint index and schedule next move
                this.currentWaypointIndex++;
                this.scene.time.delayedCall(this.pauseDurationMs, () => {
                    this.moveToNextWaypoint();
                });
            }
        }
    }

    /**
     * Start Maya's guided sequence: show initial message then move along waypoints.
     */
    private startGuidedSequence(): void {
    // Do not start again if the guide already completed
    if (this.guidedSequenceActive || this.guideCompleted) return;

        // Ensure the player is close enough to start
        if (!this.scene.getPlayer()) return;

        const player = this.scene.getPlayer().getSprite();
        const dist = Phaser.Math.Distance.Between(player.x, player.y, this.maya.x, this.maya.y);
        if (dist > this.interactionDistance) return; // do not start if too far

        this.guidedSequenceActive = true;

        // Hide interaction text
        this.interactionText.setAlpha(0);

    // Enable Maya tracking so HUD tracker follows her live position while she moves
    locationTrackerManager.setTargetEnabled('maya', true);
    // Ensure tracker has correct current position
    locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });

        // Show initial dialogue immediately
        this.showTemporaryDialog("Follow me, I'll take you to the Bank.", 1500);

        // Prepare single waypoint for this step: user asked to keep it simple
        // Maya should move only to this coordinate and stop; further path will be defined later.
        this.waypoints = [
            { x: 8465, y: 3626 }, // first target
            { x: 8486, y: 6378 }, // next leg towards final destination (as requested)
            { x: 9415, y: 6368 }, // final destination
            { x: 9411, y: 6297 },
        ];
        this.currentWaypointIndex = 0;

        // Create on-screen follow reminder (fixed to camera)
        this.followReminderText = this.scene.add
            .text(this.scene.cameras.main.centerX, 50, "➡️ Follow Maya to continue your journey.", {
                fontFamily: Constants.DIALOG_TEXT_FONT,
                fontSize: "18px",
                color: "#ffffff",
                align: "center",
                backgroundColor: "#000000b3",
                padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2000);

        // Start moving after a short delay so the initial message is visible
        this.scene.time.delayedCall(1600, () => {
            this.moveToNextWaypoint();
        });
    }

    private showTemporaryDialog(text: string, durationMs: number = 1500): void {
        // Simple speech bubble above Maya with text for a short duration
        const bubble = this.scene.add.rectangle(this.scene.cameras.main.centerX, this.scene.cameras.main.height - 140, this.scene.cameras.main.width * 0.7, 80, 0x000000, 0.8);
        bubble.setScrollFactor(0).setDepth(2001);
        const msg = this.scene.add
            .text(bubble.x, bubble.y, text, {
                fontFamily: Constants.DIALOG_TEXT_FONT,
                fontSize: Constants.DIALOG_TEXT_SIZE,
                color: Constants.DIALOG_TEXT_COLOR,
                align: "center",
                wordWrap: { width: bubble.width - 40 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2002);

        // Auto-destroy after duration
        this.scene.time.delayedCall(durationMs, () => {
            msg.destroy();
            bubble.destroy();
        });
    }

    private moveToNextWaypoint(): void {
        if (!this.guidedSequenceActive) return;

        // If we've finished all waypoints, handle arrival
        if (this.currentWaypointIndex >= this.waypoints.length) {
            this.onArriveAtDestination();
            return;
        }

        const target = this.waypoints[this.currentWaypointIndex];

        // Face the direction Maya will move
        // Compute direction vector and initialize per-frame movement to ensure straight-line travel
        const dx = target.x - this.maya.x;
        const dy = target.y - this.maya.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) {
            // Already at or extremely close to target — treat as arrived
            this.currentWaypointIndex++;
            this.scene.time.delayedCall(this.pauseDurationMs, () => this.moveToNextWaypoint());
            return;
        }

        // Normalize direction
        this.moveDir = { x: dx / distance, y: dy / distance };
    this.moveTarget = { x: target.x, y: target.y };
    this.movingToTarget = true;
    // Ensure interaction hint is hidden while Maya moves
    this.interactionText.setAlpha(0);

        // Face movement direction and play walking animation
        this.faceDirectionTowards(target.x, target.y, /*useWalk=*/true);
    }

    private faceDirectionTowards(targetX: number, targetY: number, useWalk: boolean = false): void {
        const dx = targetX - this.maya.x;
        const dy = targetY - this.maya.y;
        // Decide primary direction
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                if (useWalk) this.maya.anims.play("maya-walk-right", true);
                else this.maya.anims.play("maya-idle-right", true);
            } else {
                if (useWalk) this.maya.anims.play("maya-walk-left", true);
                else this.maya.anims.play("maya-idle-left", true);
            }
        } else {
            if (dy > 0) {
                if (useWalk) this.maya.anims.play("maya-walk-down", true);
                else this.maya.anims.play("maya-idle-down", true);
            } else {
                if (useWalk) this.maya.anims.play("maya-walk-up", true);
                else this.maya.anims.play("maya-idle-up", true);
            }
        }
    }

    private playIdleForCurrentFacing(): void {
        // Attempt to keep the current animation frame direction by checking current anim key
        const animKey = this.maya.anims.currentAnim?.key || '';
        if (animKey.includes('walk')) {
            const idleKey = animKey.replace('walk', 'idle');
            if (this.scene.anims.exists(idleKey)) this.maya.anims.play(idleKey, true);
            else this.maya.anims.stop();
        } else {
            // Default to down idle
            this.maya.anims.play('maya-idle-down', true);
        }
    }

    private onArriveAtDestination(): void {
        // Ensure movement stopped
        this.guidedSequenceActive = false;

    // Mark that the guided sequence completed so it cannot be retriggered
    this.guideCompleted = true;

        if (this.movingTween) {
            this.movingTween.stop();
            this.movingTween = null;
        }

        // Stop any alert timer
        if (this.alertTimerEvent) {
            this.alertTimerEvent.remove(false);
            this.alertTimerEvent = null;
        }

        // Remove follow reminder
        if (this.followReminderText) {
            this.followReminderText.destroy();
            this.followReminderText = null;
        }

        // Play idle animation and face player
        if (this.scene.getPlayer()) {
            this.updateMayaDirectionToPlayer(this.scene.getPlayer().getSprite());
        } else {
            this.maya.anims.play('maya-idle-down', true);
        }

        // Show final dialogue message
        this.showTemporaryDialog("We have arrived at the Bank. Let's go inside.", 3000);

        // Update tracker final position and disable tracker if player is near Maya
        locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });
        if (this.scene.getPlayer()) {
            const playerSprite = this.scene.getPlayer().getSprite();
            const dist = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, this.maya.x, this.maya.y);
            if (dist < this.interactionDistance) {
                locationTrackerManager.setTargetEnabled('maya', false);
            }
        }
    }

    private checkFollowDistance(playerSprite: GameObjects.Sprite): void {
        if (!this.guidedSequenceActive) return;

        const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, this.maya.x, this.maya.y);

        if (distance > this.distanceThreshold) {
            // Show alert immediately if not already showing
            if (!this.alertText) {
                this.alertText = this.scene.add
                    .text(this.scene.cameras.main.centerX, 90, "⚠️ You are too far away! Follow Maya.", {
                        fontFamily: Constants.DIALOG_TEXT_FONT,
                        fontSize: "16px",
                        color: "#ffcc00",
                        align: "center",
                        backgroundColor: "#000000b3",
                        padding: { x: 10, y: 6 },
                    })
                    .setOrigin(0.5)
                    .setScrollFactor(0)
                    .setDepth(2000);
            }

            // If no timer scheduled, create a repeating timer to re-alert every 60s
            if (!this.alertTimerEvent) {
                this.alertTimerEvent = this.scene.time.addEvent({
                    delay: this.alertIntervalMs,
                    loop: true,
                    callback: () => {
                        if (this.alertText && !this.alertText.scene) return;
                        if (!this.alertText) {
                            this.alertText = this.scene.add
                                .text(this.scene.cameras.main.centerX, 90, "⚠️ You are too far away! Follow Maya.", {
                                    fontFamily: Constants.DIALOG_TEXT_FONT,
                                    fontSize: "16px",
                                    color: "#ffcc00",
                                    align: "center",
                                    backgroundColor: "#000000b3",
                                    padding: { x: 10, y: 6 },
                                })
                                .setOrigin(0.5)
                                .setScrollFactor(0)
                                .setDepth(2000);
                        }
                    }
                });
            }
        } else {
            // Player is close enough: remove alert and timer
            if (this.alertText) {
                this.alertText.destroy();
                this.alertText = null;
            }
            if (this.alertTimerEvent) {
                this.alertTimerEvent.remove(false);
                this.alertTimerEvent = null;
            }
        }
    }

    private updateMayaDirectionToPlayer(playerSprite: GameObjects.Sprite): void {
        // Calculate direction from Maya to player
        const dx = playerSprite.x - this.maya.x;
        const dy = playerSprite.y - this.maya.y;

        // Ensure Maya sprite is never flipped and always at 0 rotation
        this.maya.setFlipX(false);
        this.maya.setFlipY(false);
        this.maya.setRotation(0);

        // Determine the strongest direction and play appropriate animation
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal movement is stronger
            if (dx > 0) {
                // Player is to the right
                this.maya.anims.play("maya-idle-right", true);
            } else {
                // Player is to the left
                this.maya.anims.play("maya-idle-left", true);
            }
        } else {
            // Vertical movement is stronger
            if (dy > 0) {
                // Player is below
                this.maya.anims.play("maya-idle-down", true);
            } else {
                // Player is above
                this.maya.anims.play("maya-idle-up", true);
            }
        }

        // Double-check: ensure sprite stays perfectly aligned after animation
        this.maya.setFlipX(false);
        this.maya.setRotation(0);
        
        // Also ensure name text stays aligned
        this.ensureTextAlignment();
    }

    private showArrivalInteraction(): void {
        // Prevent multiple activations
        if (this.activeDialog) return;

        this.activeDialog = true;

        // Show final dialog box with the requested message
        const dialogBox = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.height - 150,
            this.scene.cameras.main.width * 0.8,
            120,
            0x000000,
            0.85
        );
        dialogBox.setScrollFactor(0).setDepth(2000);

        const lines = "This is our Central Bank!\nGo inside and meet the bank manager.";
        const dialogText = this.scene.add
            .text(dialogBox.x, dialogBox.y, lines, {
                fontFamily: Constants.DIALOG_TEXT_FONT,
                fontSize: Constants.DIALOG_TEXT_SIZE,
                color: Constants.DIALOG_TEXT_COLOR,
                align: "center",
                wordWrap: { width: dialogBox.width - 40 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Close instruction
        const closeText = this.scene.add
            .text(dialogBox.x, dialogBox.y + 50, "Press E, Space or Enter to close", {
                fontFamily: Constants.DIALOG_INSTRUCTION_FONT,
                fontSize: Constants.DIALOG_INSTRUCTION_SIZE,
                color: Constants.DIALOG_INSTRUCTION_COLOR,
                align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        this.dialogContainer = this.scene.add.container(0, 0);
        this.dialogContainer.add([dialogBox, dialogText, closeText]);

        // Register key listeners to close
        this.setupDialogKeyListeners();
    }

    private ensureTextAlignment(): void {
        // Ensure Maya's name text is never transformed
        if (this.maya.nameText) {
            this.maya.nameText.setScale(1);
            this.maya.nameText.setRotation(0);
            this.maya.nameText.setFlipX(false);
            this.maya.nameText.setFlipY(false);
        }
        
        // Ensure interaction text is never transformed
        if (this.interactionText) {
            this.interactionText.setScale(1);
            this.interactionText.setRotation(0);
            this.interactionText.setFlipX(false);
            this.interactionText.setFlipY(false);
        }
    }

    public destroy(): void {
        // Clean up dialog system
        this.clearDialogKeyListeners();
        
        if (this.activeDialog) {
            this.closeDialog();
        }

        if (this.maya) {
            if (this.maya.nameText) {
                this.maya.nameText.destroy();
            }
            this.maya.destroy();
        }

        if (this.interactionText) {
            this.interactionText.destroy();
        }

        if (this.speechBubble) {
            this.speechBubble.destroy();
            this.speechBubble = null;
        }

        if (this.dialogContainer) {
            this.dialogContainer.destroy();
            this.dialogContainer = null;
        }
    }
}
