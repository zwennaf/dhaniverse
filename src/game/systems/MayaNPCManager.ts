import { GameObjects, Input } from "phaser";
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

    // Maya's position
    public readonly x: number = 7768;
    public readonly y: number = 3521;

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

        // Maya looks at player based on direction (like NPCManager)
        this.updateMayaDirectionToPlayer(playerSprite);

        const wasNearNPC = this.isPlayerNearNPC;
        this.isPlayerNearNPC = distance < this.interactionDistance;

        // Show/hide interaction text with smooth fade only when dialog is not active
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

        // Hide interaction text when dialog is active
        if (this.activeDialog) {
            this.interactionText.setAlpha(0);
        }

        // Update interaction text position
        this.updateInteractionTextPosition();

        // Check for interaction key press when near Maya
        if (
            this.isPlayerNearNPC &&
            this.interactionKey &&
            Phaser.Input.Keyboard.JustDown(this.interactionKey) &&
            !this.activeDialog
        ) {
            this.showDialog();
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
