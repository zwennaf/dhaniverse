import { GameObjects, Input } from "phaser";
import { locationTrackerManager } from "../../services/LocationTrackerManager";
import { balanceManager } from "../../services/BalanceManager";
import { MainGameScene } from "../scenes/MainScene.ts";
import { getTaskManager } from "../tasks/TaskManager.ts";
import { Constants } from "../utils/Constants.ts";
import { dialogueManager } from "../../services/DialogueManager";

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
    private moveSpeed: number = 400; // increased movement speed for better pacing
    private pauseDurationMs: number = 1000; // 1 second pause at waypoints
    private followReminderText: GameObjects.Text | null = null;
    private alertText: GameObjects.Text | null = null;
    private distanceThreshold: number = 1000; // units (show "too far" only when > 1000)
    
    // Bank task location monitoring
    private bankTaskLocationInterval: NodeJS.Timeout | null = null;
    private alertTimerEvent: Phaser.Time.TimerEvent | null = null;
    private alertIntervalMs: number = 60000; // 60 seconds
    private guideCompleted: boolean = false;
    // Secondary guidance to stock market
    private stockMarketGuideActive: boolean = false;
    private stockMarketGuideCompleted: boolean = false;
    private initialDialogueTaskResolved: boolean = false; // ensures tasks update once

    // Track player's initial position and whether they have started moving
    private playerInitialPosition: { x: number; y: number } | null = null;
    private playerHasMoved: boolean = false;

    // Fixed initial tracker start point (points A-D as requested)
    private readonly initialTrackerPoint = { x: 1043, y: 669 };

    // State management flags to prevent duplicate initialization
    private isInitializing: boolean = false;
    private initializationComplete: boolean = false;
    private eventListenersSetup: boolean = false;

    // Maya's position (determined by player progression state)
    public x: number = 7779; // Default position
    public y: number = 3581; // Default position

    private async initializeMayaPosition(): Promise<void> {
        // Prevent duplicate initialization
        if (this.isInitializing || this.initializationComplete) {
            console.log('🚀 Maya: Initialization already in progress or complete, skipping...');
            return;
        }
        
        this.isInitializing = true;
        
        try {
            // Import and get position from progression manager
            const { progressionManager } = await import('../../services/ProgressionManager');
            
            // Check if progression manager has been initialized with player state
            const state = progressionManager.getState();
            if (!state || (state.onboardingStep === 'not_started' && !state.hasMetMaya && !state.hasFollowedMaya && !state.hasClaimedMoney)) {
                // Progression manager hasn't been initialized with player state yet
                // Retry after a delay (only once more to prevent infinite recursion)
                console.log('🚀 Maya: Progression manager not ready, retrying once in 1000ms...');
                this.isInitializing = false; // Reset flag to allow retry
                this.scene.time.delayedCall(1000, () => {
                    if (!this.initializationComplete) {
                        this.initializeMayaPosition();
                    }
                });
                return;
            }
            
            const position = progressionManager.getMayaPosition();
            
            // Only update position if it's different from default
            if (position.x !== 7779 || position.y !== 3581) {
                // Update Maya's position properties
                this.x = position.x;
                this.y = position.y;
                
                // Update Maya sprite position
                if (this.maya) {
                    this.maya.x = this.x;
                    this.maya.y = this.y;
                    this.updateInteractionTextPosition();
                    if (this.maya.nameText) {
                        this.maya.nameText.x = this.maya.x;
                        this.maya.nameText.y = this.maya.y - 50;
                    }
                }
                
                console.log('🚀 Maya: Updated position from progression state:', { x: this.x, y: this.y });
            } else {
                console.log('🚀 Maya: Using default position for new player');
            }
            
            // Set Maya's state flags based on progression
            if (state.hasFollowedMaya) {
                this.guideCompleted = true;
            }
            if (state.hasReachedStockMarket) {
                this.stockMarketGuideCompleted = true;
            }
            
            // For mid-journey restoration, determine if Maya should be in active guidance mode
            this.restoreJourneyState(state);
            
            // Update location tracker for existing players
            this.updateLocationTrackerForProgress();
            
            // Mark initialization as complete
            this.initializationComplete = true;
            
            console.log('🚀 Maya: Initialized from progression state:', {
                position: { x: this.x, y: this.y },
                guideCompleted: this.guideCompleted,
                stockMarketGuideCompleted: this.stockMarketGuideCompleted,
                state: state
            });
        } catch (e) {
            console.log('🚀 Maya: Error accessing progression, retrying once in 1000ms:', e);
            this.isInitializing = false; // Reset flag to allow retry
            // Retry after a delay (only once more to prevent infinite recursion)
            this.scene.time.delayedCall(1000, () => {
                if (!this.initializationComplete) {
                    this.initializeMayaPosition();
                }
            });
        } finally {
            this.isInitializing = false;
        }
    }

    private restoreJourneyState(state: any): void {
        // If player has met Maya but not yet reached certain checkpoints,
        // Maya should be ready to continue guiding from her current position
        
        if (state.hasMetMaya && !state.hasFollowedMaya) {
            // Player met Maya but hasn't completed the bank journey yet
            // Maya should be ready to guide to bank
            console.log('🚀 Maya: Player met Maya but hasn\'t completed bank journey - ready to guide');
        }
        
        if (state.hasCompletedBankOnboarding && !state.hasReachedStockMarket) {
            // Player completed bank onboarding but hasn't reached stock market
            // Maya should be ready for stock market guidance
            console.log('🚀 Maya: Player completed bank onboarding - ready for stock market guidance');
        }
        
        // Don't restart any active sequences - let the normal interaction flow handle it
    }

    constructor(scene: MainGameScene) {
        this.scene = scene;

        // Setup interaction key
        if (scene.input.keyboard) {
            this.interactionKey = scene.input.keyboard.addKey("E");
        }

        // Create Maya at default position first (will be updated once progression loads)
        this.maya = scene.add.sprite(this.x, this.y, "maya") as NPCSprite;
        this.maya.setScale(3);
        
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

        // Capture player's initial position (for movement detection) if available.
        const player = this.scene.getPlayer && this.scene.getPlayer();
        if (player) {
            const ps = player.getSprite();
            this.playerInitialPosition = { x: ps.x, y: ps.y };
        }

        // Initialize location tracker with default target - will be updated when progression loads
        locationTrackerManager.setTargetEnabled('maya', true);
        locationTrackerManager.updateTargetPosition('maya', { x: this.initialTrackerPoint.x, y: this.initialTrackerPoint.y });

        // Delay Maya position initialization to allow progression manager to be ready
        // This ensures player state is loaded before Maya tries to access it
        scene.time.delayedCall(100, () => {
            this.initializeMayaPosition();
        });

        // Set up event listeners for dynamic objective updates
        this.setupObjectiveListeners();
    }

    /**
     * Set up event listeners for dynamic objective updates based on progression
     */
    private setupObjectiveListeners(): void {
        // Prevent duplicate event listener setup
        if (this.eventListenersSetup) {
            console.log('🚀 Maya: Event listeners already set up, skipping...');
            return;
        }

        // Listen for bank onboarding completion to trigger stock market guidance
        const handleBankOnboardingComplete = () => {
            console.log('MayaNPCManager: Bank onboarding completed, updating objective for stock market guidance');
            this.updateObjectiveFollowMayaToStockMarket();
        };

        // Listen for stock market arrival
        const handleStockMarketArrival = () => {
            console.log('MayaNPCManager: Stock market arrival, updating objective to explore stocks');
            this.updateObjectiveExploreStockMarket();
        };

        // Store references to handlers for potential cleanup
        (this as any).bankOnboardingHandler = handleBankOnboardingComplete;
        (this as any).stockMarketArrivalHandler = handleStockMarketArrival;

        window.addEventListener('bank-onboarding-complete' as any, handleBankOnboardingComplete);
        window.addEventListener('stock-market-arrival' as any, handleStockMarketArrival);
        
        this.eventListenersSetup = true;
        console.log('🚀 Maya: Event listeners set up successfully');
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

        // Use DialogueManager directly
        dialogueManager.showDialogue({
            text: "Hello adventurer! I'm Maya, your quest helper.\nI can guide you on your journey through Dhaniverse!",
            characterName: 'M.A.Y.A',
            showBackdrop: false,
            allowSpaceAdvance: true
        }, {
            onAdvance: () => {
                // Close local dialog state and cleanup visuals
                this.closeDialog();
                this.handlePostInitialDialogue();
                dialogueManager.closeDialogue();
            },
            onComplete: () => {
                // Dialogue typing completed
            }
        });
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

        // If we don't yet have the player's initial position (player may not have been
        // available in the constructor), capture it now and set the tracker to point
        // to the player's starting spot.
        if (!this.playerInitialPosition) {
            this.playerInitialPosition = { x: playerSprite.x, y: playerSprite.y };
            locationTrackerManager.setTargetEnabled('maya', true);
            locationTrackerManager.updateTargetPosition('maya', { x: playerSprite.x, y: playerSprite.y });
        }

        // If we have recorded a player initial position and the player hasn't moved yet,
        // check whether they've started moving. If so, switch the tracker to point to
        // Maya's initial location (where Maya spawned).
        if (this.playerInitialPosition && !this.playerHasMoved) {
            const movedDist = Phaser.Math.Distance.Between(
                playerSprite.x,
                playerSprite.y,
                this.playerInitialPosition.x,
                this.playerInitialPosition.y
            );

            // Consider movement if player moved more than 4 pixels
            if (movedDist > 4) {
                this.playerHasMoved = true;

                // Now switch the HUD tracker to point at Maya's initial position
                locationTrackerManager.setTargetEnabled('maya', true);
                locationTrackerManager.updateTargetPosition('maya', { x: this.x, y: this.y });
            }
        }

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

        // Always show interaction text if player is near Maya and no dialog is active
        if (this.isPlayerNearNPC && !this.activeDialog) {
            this.interactionText.setAlpha(1);
        } else {
            this.interactionText.setAlpha(0);
        }

        // Update interaction text position
        this.updateInteractionTextPosition();
        // Ensure name text follows Maya during movement
        if (this.maya.nameText) {
            this.maya.nameText.x = this.maya.x;
            this.maya.nameText.y = this.maya.y - 50;
        }

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
                        (async () => {
                            try {
                                const { progressionManager } = await import('../../services/ProgressionManager');
                                const ps = progressionManager.getState();
                                // ORIGINAL CHAIN (unchanged behavior): until claimed money
                                if (!ps.hasClaimedMoney) {
                                    let completed = ps.hasClaimedMoney; // immediate state
                                    if (completed) return; // safety
                                    if (this.guideCompleted) {
                                        this.showArrivalInteraction();
                                    } else {
                                        this.startGuidedSequence();
                                    }
                                    return;
                                }
                                // Failure case: claimed money but bank onboarding not completed
                                if (ps.hasClaimedMoney && !ps.hasCompletedBankOnboarding) {
                                    dialogueManager.showDialogue({
                                        text: 'You need to complete your bank onboarding and create your account before we continue.',
                                        characterName: 'M.A.Y.A',
                                        allowSpaceAdvance: true,
                                        showBackdrop: false
                                    }, { onAdvance: () => dialogueManager.closeDialogue() });
                                    return;
                                }
                                // Stock market guidance branch
                                if (ps.hasCompletedBankOnboarding && !ps.hasReachedStockMarket) {
                                    console.log('🚀 Maya: Bank onboarding completed, checking stock market guidance...');
                                    console.log('🚀 Maya: stockMarketGuideCompleted:', this.stockMarketGuideCompleted, 'stockMarketGuideActive:', this.stockMarketGuideActive);
                                    console.log('🚀 Maya: Current Maya position:', { x: this.maya.x, y: this.maya.y });
                                    
                                    if (!this.stockMarketGuideCompleted && !this.stockMarketGuideActive) {
                                        console.log('🚀 Maya: Starting stock market guidance...');
                                        this.startStockMarketGuidance();
                                    } else {
                                        console.log('🚀 Maya: Stock market guidance already completed or active');
                                    }
                                    return;
                                }
                                // After everything is complete - provide a friendly message
                                if (ps.hasCompletedBankOnboarding && ps.hasReachedStockMarket) {
                                    console.log('🚀 Maya: All guidance completed, showing completion message');
                                    dialogueManager.showDialogue({
                                        text: 'Great job! You\'ve completed the financial onboarding. You now have access to both the bank and stock market. Continue exploring Dhaniverse!',
                                        characterName: 'M.A.Y.A',
                                        allowSpaceAdvance: true,
                                        showBackdrop: false
                                    }, { onAdvance: () => dialogueManager.closeDialogue() });
                                    return;
                                }
                                // Fallback: silent
                            } catch(e) { console.warn('Maya interaction error', e); }
                        })();
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
                
                // Update Maya's position in state at each waypoint for mid-journey persistence
                this.updateMayaPositionInState();
                
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
        console.log('🚀 Maya: startGuidedSequence called');
        console.log('🚀 Maya: guidedSequenceActive:', this.guidedSequenceActive, 'guideCompleted:', this.guideCompleted);
        
        // Do not start again if the guide already completed
        if (this.guidedSequenceActive || this.guideCompleted) {
            console.log('🚀 Maya: Guide already active or completed, returning');
            return;
        }

        // Ensure the player is close enough to start
        if (!this.scene.getPlayer()) {
            console.log('🚀 Maya: No player found, returning');
            return;
        }

        const player = this.scene.getPlayer().getSprite();
        const dist = Phaser.Math.Distance.Between(player.x, player.y, this.maya.x, this.maya.y);
        console.log('🚀 Maya: Distance to player:', dist, 'interaction distance:', this.interactionDistance);
        
        if (dist > this.interactionDistance) {
            console.log('🚀 Maya: Player too far away, returning');
            return; // do not start if too far
        }

        console.log('🚀 Maya: Starting guided sequence...');
        this.guidedSequenceActive = true;

        // Progression: mark hasMetMaya
    (async () => { try { const { progressionManager } = await import('../../services/ProgressionManager'); progressionManager.markMetMaya(); } catch(e) { console.warn('Could not mark hasMetMaya', e); } })();

        // Hide interaction text
        this.interactionText.setAlpha(0);

        // Enable Maya tracking so HUD tracker follows her live position while she moves
        locationTrackerManager.setTargetEnabled('maya', true);
        // Ensure tracker has correct current position
        locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });

        console.log('🚀 Maya: Showing dialogue with DialogueManager...');
        
        // Use DialogueManager directly instead of events
        dialogueManager.showDialogue({
            text: "Follow me. I'll guide you to the Central Bank.",
            characterName: 'M.A.Y.A',
            showBackdrop: false,
            allowSpaceAdvance: true
        }, {
            onAdvance: () => {
                console.log('🚀 Maya: DialogueManager onAdvance called, starting movement!');
                
                // Complete the "meet-maya" task and set new objective to follow Maya
                this.updateObjectiveToFollowMaya();
                
                console.log('🚀 Maya: About to start moving to next waypoint...');
                this.scene.time.delayedCall(40, () => this.moveToNextWaypoint());
                
                // Close the dialogue
                dialogueManager.closeDialogue();
            },
            onComplete: () => {
                console.log('🚀 Maya: DialogueManager onComplete called');
            }
        });

        // Prepare single waypoint for this step: user asked to keep it simple
        // Maya should move only to this coordinate and stop; further path will be defined later.
        this.waypoints = [
            { x: 8465, y: 3626 }, // first target
            { x: 8465, y: 6378 }, // next leg towards final destination (as requested)
            { x: 9415, y: 6378 }, // final destination
            { x: 9415, y: 6297 },
        ];
        this.currentWaypointIndex = 0;
        
        console.log('🚀 Maya: Waypoints set:', this.waypoints);
    }

    private showTemporaryDialog(text: string, durationMs: number = 1500): void {
        // Emit a temporary HUD dialogue (small) so the HUD can show consistent styling
        window.dispatchEvent(new CustomEvent('show-temporary-dialog', {
            detail: {
                text,
                durationMs: durationMs
            }
        }));
    }

    private moveToNextWaypoint(): void {
        console.log('🚀 Maya: moveToNextWaypoint called, guidedSequenceActive:', this.guidedSequenceActive);
        console.log('🚀 Maya: currentWaypointIndex:', this.currentWaypointIndex, 'waypoints.length:', this.waypoints.length);
        
        if (!this.guidedSequenceActive) return;

        // If we've finished all waypoints, handle arrival
        if (this.currentWaypointIndex >= this.waypoints.length) {
            console.log('🚀 Maya: All waypoints completed, arriving at destination');
            if (this.stockMarketGuideActive) this.completeStockMarketGuidance();
            else this.onArriveAtDestination();
            return;
        }

        const target = this.waypoints[this.currentWaypointIndex];
        console.log('🚀 Maya: Moving to waypoint', this.currentWaypointIndex, 'target:', target);

        // Face the direction Maya will move
        // Compute direction vector and initialize per-frame movement to ensure straight-line travel
        const dx = target.x - this.maya.x;
        const dy = target.y - this.maya.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        console.log('🚀 Maya: Current position:', { x: this.maya.x, y: this.maya.y });
        console.log('🚀 Maya: Target position:', target);
        console.log('🚀 Maya: Distance to target:', distance);
        
        if (distance < 1) {
            // Already at or extremely close to target — treat as arrived
            console.log('🚀 Maya: Already at target, moving to next waypoint');
            this.currentWaypointIndex++;
            this.scene.time.delayedCall(this.pauseDurationMs, () => this.moveToNextWaypoint());
            return;
        }

        // Normalize direction
        this.moveDir = { x: dx / distance, y: dy / distance };
        this.moveTarget = { x: target.x, y: target.y };
        this.movingToTarget = true;
        
        console.log('🚀 Maya: Movement initialized - moveDir:', this.moveDir, 'movingToTarget:', this.movingToTarget);
        
        // Ensure interaction hint is hidden while Maya moves
        this.interactionText.setAlpha(0);

        // Face movement direction and play walking animation
        this.faceDirectionTowards(target.x, target.y, /*useWalk=*/true);
        console.log('🚀 Maya: Started walking animation');
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

    private updateMayaPositionInState(): void {
        // Update Maya's position in progression state for persistence
        (async () => {
            try {
                const { progressionManager } = await import('../../services/ProgressionManager');
                progressionManager.updateMayaPosition(this.maya.x, this.maya.y);
                console.log('🚀 Maya: Updated position in state:', { x: this.maya.x, y: this.maya.y });
            } catch (e) {
                console.warn('Could not update Maya position in state', e);
            }
        })();
    }

    private async updateLocationTrackerForProgress(): Promise<void> {
        try {
            const { progressionManager } = await import('../../services/ProgressionManager');
            const state = progressionManager.getState();
            
            // For existing players who have already met Maya, point directly to her
            if (state.hasMetMaya) {
                locationTrackerManager.updateTargetPosition('maya', { x: this.x, y: this.y });
                console.log('🚀 Maya: Updated tracker to point to Maya for existing player at:', { x: this.x, y: this.y });
            }
            
            // If all guidance is complete, disable the tracker
            if (state.hasReachedStockMarket) {
                locationTrackerManager.setTargetEnabled('maya', false);
                console.log('🚀 Maya: Disabled tracker for completed player');
            }
        } catch (e) {
            console.warn('Could not update location tracker for progress', e);
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

        // Progression: player has followed Maya to bank (will still need interaction to claim)
    (async () => { try { const { progressionManager } = await import('../../services/ProgressionManager'); progressionManager.markFollowedMaya(); } catch(e) { console.warn('Could not mark hasFollowedMaya', e); } })();

        // Update objective to claim joining bonus now that destination is reached
        this.updateObjectiveClaimBonus();

        // Update Maya position in progression state
        this.updateMayaPositionInState();

        // Update tracker final position and disable tracker since we've arrived at destination
        locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });
        // Disable the tracker since Maya has completed guiding the player to the bank
        locationTrackerManager.setTargetEnabled('maya', false);
        console.log("MayaNPCManager: Disabled Maya tracker as she arrived at the bank");

        // Restore interaction text if player is near Maya and no dialog is active
        const player = this.scene.getPlayer && this.scene.getPlayer();
        if (player) {
            const playerSprite = player.getSprite();
            const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, this.maya.x, this.maya.y);
            if (distance < this.interactionDistance && !this.activeDialog) {
                this.interactionText.setAlpha(1);
            }
        }
    }

        // --- Stock Market Guidance ---
        private startStockMarketGuidance(): void {
            if (this.stockMarketGuideActive || this.stockMarketGuideCompleted) return;
            if (!this.scene.getPlayer()) return;
            
            // Ensure the player is close enough to start
            const player = this.scene.getPlayer().getSprite();
            const dist = Phaser.Math.Distance.Between(player.x, player.y, this.maya.x, this.maya.y);
            
            if (dist > this.interactionDistance) {
                console.log('🚀 Maya: Player too far away for stock market guidance, returning');
                return; // do not start if too far
            }
            
            this.stockMarketGuideActive = true;
            this.guidedSequenceActive = true; // Reuse the guided sequence system
            
            console.log('🚀 Maya: Starting stock market guidance from bank to stock market');
            
            // Hide interaction text
            this.interactionText.setAlpha(0);
            
            // Dialogue prompt
            dialogueManager.showDialogue({
                text: 'Follow me, we\'ll now go to the stock market and explore Dhani Stocks.',
                characterName: 'M.A.Y.A',
                allowSpaceAdvance: true,
                showBackdrop: false
            }, {
                onAdvance: () => {
                    dialogueManager.closeDialogue();
                    // Path from bank (x: 9415, y: 6297) to stock market as specified by user
                    this.waypoints = [
                        { x: 9415, y: 6378 },  // First move down from bank entrance
                        { x: 8465, y: 6378 },  // Then move left
                        { x: 8465, y: 3626 },  // Then move up
                        { x: 2598, y: 3736 }   // Finally to stock market entrance
                    ];
                    this.currentWaypointIndex = 0;
                    
                    console.log('🚀 Maya: Stock market waypoints set:', this.waypoints);
                    console.log('🚀 Maya: Current Maya position:', { x: this.maya.x, y: this.maya.y });
                    
                    // Reuse movement system
                    locationTrackerManager.setTargetEnabled('maya', true);
                    locationTrackerManager.updateTargetPosition('maya', { x: this.maya.x, y: this.maya.y });
                    this.scene.time.delayedCall(40, () => this.moveToNextWaypoint());
                }
            });
        }

        // Hook into existing arrival logic by checking if stock market guidance active & last waypoint reached
        private completeStockMarketGuidance(): void {
            console.log('🚀 Maya: Completing stock market guidance');
            
            // Stop the guided sequence
            this.guidedSequenceActive = false;
            this.stockMarketGuideActive = false;
            this.stockMarketGuideCompleted = true;
            
            // Stop any movement
            this.movingToTarget = false;
            this.moveDir = null;
            this.moveTarget = null;
            
            // Stop any alert timer
            if (this.alertTimerEvent) {
                this.alertTimerEvent.remove(false);
                this.alertTimerEvent = null;
            }
            
            // Remove follow reminder if present
            if (this.followReminderText) {
                this.followReminderText.destroy();
                this.followReminderText = null;
            }
            
            // Face the player
            if (this.scene.getPlayer()) {
                this.updateMayaDirectionToPlayer(this.scene.getPlayer().getSprite());
            } else {
                this.maya.anims.play('maya-idle-down', true);
            }
            
            // Update objective to explore stock market
            this.updateObjectiveExploreStockMarket();
            
            // Show completion dialogue
            dialogueManager.showDialogue({
                text: 'We have reached Dhani Stocks. This is where you can learn about investing and trading!',
                characterName: 'M.A.Y.A',
                allowSpaceAdvance: true,
                showBackdrop: false
            }, { onAdvance: () => dialogueManager.closeDialogue() });
            
            // Mark in progression manager
            (async () => { 
                try { 
                    const { progressionManager } = await import('../../services/ProgressionManager'); 
                    progressionManager.markReachedStockMarket();
                    console.log('🚀 Maya: Marked reached stock market in progression');
                } catch(e) { 
                    console.warn('Could not mark stock market reached', e);
                } 
            })();
            
            // Update Maya position in progression state
            this.updateMayaPositionInState();
            
            // Disable the tracker since Maya has completed guiding the player to the stock market
            locationTrackerManager.setTargetEnabled('maya', false);
            console.log("🚀 Maya: Disabled Maya tracker as she arrived at the stock market");
            
            // Restore interaction text if player is near Maya and no dialog is active
            const player = this.scene.getPlayer && this.scene.getPlayer();
            if (player) {
                const playerSprite = player.getSprite();
                const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, this.maya.x, this.maya.y);
                if (distance < this.interactionDistance && !this.activeDialog) {
                    this.interactionText.setAlpha(1);
                }
            }
        }

    private checkFollowDistance(playerSprite: GameObjects.Sprite): void {
        if (!this.guidedSequenceActive) return;

        const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, this.maya.x, this.maya.y);

        if (distance > this.distanceThreshold) {
            // Dispatch a temporary HUD dialog alert so it uses the DialogueBox UI
            window.dispatchEvent(new CustomEvent('show-temporary-dialog', {
                detail: {
                    text: '⚠️ You are too far away! Follow Maya.',
                    durationMs: 5000
                }
            }));

            // Ensure we keep re-alerting via a Phaser timer if not already scheduled
            if (!this.alertTimerEvent) {
                this.alertTimerEvent = this.scene.time.addEvent({
                    delay: this.alertIntervalMs,
                    loop: true,
                    callback: () => {
                        window.dispatchEvent(new CustomEvent('show-temporary-dialog', {
                            detail: {
                                text: '⚠️ You are too far away! Follow Maya.',
                                durationMs: 5000
                            }
                        }));
                    }
                });
            }
        } else {
            // Player is close enough: stop the repeating alert timer
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
        if (this.activeDialog) return;
        this.activeDialog = true;

        (async () => {
            // Use unified auth token key used across app (see AuthContext & api utils)
            const token = window.localStorage.getItem('dhaniverse_token');
            // Backend game routes are mounted at root (e.g. /game/...), NOT under /api
            const baseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
                ? 'http://localhost:8000'
                : 'https://api.dhaniverse.in';
            let claimed = false;
            try {
                if (!token) {
                    // Without a token the request would 401; skip fetch & force claimed=false so we can prompt login
                    throw new Error('unauthenticated');
                }
                const resp = await fetch(`${baseUrl}/game/player-state/starter-status`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    claimed = !!data.claimed;
                }
            } catch (e) {
                console.warn('Starter status check failed or unauthenticated, defaulting to claimed=false', e);
            }

            if (claimed) {
                dialogueManager.showDialogue({
                    text: "This is our Central Bank! Here you can manage your finances and learn about money.",
                    characterName: 'M.A.Y.A',
                    allowSpaceAdvance: true,
                    showBackdrop: false
                }, {
                    onAdvance: () => {
                        dialogueManager.closeDialogue();
                        this.closeDialog();
                    }
                });
                return;
            }

            // If no token, prompt user to sign in instead of showing claim button
            if (!token) {
                dialogueManager.showDialogue({
                    text: "This is our Central Bank! Sign in to claim your starter money and begin your journey.",
                    characterName: 'M.A.Y.A',
                    allowSpaceAdvance: true,
                    showBackdrop: false
                }, {
                    onAdvance: () => {
                        dialogueManager.closeDialogue();
                        this.closeDialog();
                    }
                });
            } else {
                dialogueManager.showDialogue({
                    text: "This is our Central Bank! Here you can manage your finances and learn about money.",
                    characterName: 'M.A.Y.A',
                    allowSpaceAdvance: true,
                    showBackdrop: false
                }, {
                    onAdvance: () => {
                        dialogueManager.closeDialogue();
                        dialogueManager.showDialogue({
                            text: "You can claim your starter money here. Press the button below to claim your funds and begin your journey!",
                            characterName: 'M.A.Y.A',
                            allowSpaceAdvance: true,
                            showBackdrop: false,
                            options: [ { id: 'claim', text: 'Claim Money', action: () => this.handleClaimMoney() } ],
                            showOptions: true
                        }, {
                            onAdvance: () => { dialogueManager.closeDialogue(); this.closeDialog(); },
                            onOptionSelect: (optionId: string) => { if (optionId === 'claim') this.handleClaimMoney(); }
                        });
                    }
                });
            }
        })();
    }

    // Handles the claim money logic after dialogue
    private handleClaimMoney(): void {
    // Prevent multiple rapid clicks triggering duplicate requests
    if ((this as any).__claimInFlight) return;
    (this as any).__claimInFlight = true;
    (async () => {
            let persistentClaimDialogueShown = false;
            try {
                const token = window.localStorage.getItem('dhaniverse_token');
                if (!token) {
                    console.warn('Claim money: missing auth token');
                    this.showTemporaryDialog('Please sign in first to claim.', 1500);
                    dialogueManager.closeDialogue();
                    this.closeDialog();
            (this as any).__claimInFlight = false;
                    return;
                }

                const baseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
                    ? 'http://localhost:8000'
                    : 'https://api.dhaniverse.in';
                const resp = await fetch(`${baseUrl}/game/player-state/claim-starter`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    console.warn('Starter claim failed', err);
                    this.showTemporaryDialog(err.error || 'Already claimed or failed', 1500);
                } else {
                    const data = await resp.json();
                    if (typeof balanceManager?.updateCash === 'function') {
                        balanceManager.updateCash(data.rupees ?? balanceManager.getBalance().cash);
                    }
                    const newlyClaimed = (data.newlyClaimed === true) || ((data.amount ?? 0) > 0);
                    const creditedAmount = data.amount ?? (newlyClaimed ? 1000 : 0);
                    if (newlyClaimed) {
                        // Progression: mark claimed money, unlock bank
                        (async () => { try { const { progressionManager } = await import('../../services/ProgressionManager'); progressionManager.markClaimedMoney(); } catch(e) { console.warn('Could not mark claimed money', e); } })();
                        
                        // Update objective to enter bank after claiming money
                        this.updateObjectiveEnterBank();
                        
                        // Show persistent dialogue requiring user advance instead of auto-dismiss alert
                        dialogueManager.showDialogue({
                            text: `Congrats! ₹${creditedAmount} credited to your current balance.`,
                            characterName: 'M.A.Y.A',
                            allowSpaceAdvance: true,
                            showBackdrop: false
                        }, {
                            onAdvance: () => { dialogueManager.closeDialogue(); this.closeDialog(); }
                        });
                        persistentClaimDialogueShown = true;
                    } else {
                        this.showTemporaryDialog('Already claimed.', 1500);
                    }
                }
            } catch (e) {
                console.error('Error claiming starter money', e);
                this.showTemporaryDialog('Error claiming starter money', 1500);
            } finally {
                // Only auto-close if we did NOT show the persistent congrats dialogue
                if (!persistentClaimDialogueShown) {
                    try { dialogueManager.closeDialogue(); } catch {}
                    this.closeDialog();
                }
                (this as any).__claimInFlight = false;
            }
        })();
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
        console.log('🚀 Maya: Cleaning up resources...');
        
        // Clean up event listeners first
        if (this.eventListenersSetup) {
            const bankHandler = (this as any).bankOnboardingHandler;
            const stockHandler = (this as any).stockMarketArrivalHandler;
            
            if (bankHandler) {
                window.removeEventListener('bank-onboarding-complete' as any, bankHandler);
            }
            if (stockHandler) {
                window.removeEventListener('stock-market-arrival' as any, stockHandler);
            }
            
            this.eventListenersSetup = false;
            console.log('🚀 Maya: Event listeners cleaned up');
        }
        
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

        // Clean up additional UI elements
        if (this.followReminderText) {
            this.followReminderText.destroy();
            this.followReminderText = null;
        }
        
        if (this.alertText) {
            this.alertText.destroy();
            this.alertText = null;
        }

        // Clean up timers and intervals
        if (this.alertTimerEvent) {
            this.alertTimerEvent.destroy();
            this.alertTimerEvent = null;
        }

        // Cleanup bank task location monitoring interval
        if (this.bankTaskLocationInterval) {
            clearInterval(this.bankTaskLocationInterval);
            this.bankTaskLocationInterval = null;
        }

        // Clean up movement tweens
        if (this.movingTween) {
            this.movingTween.destroy();
            this.movingTween = null;
        }

        // Cleanup any pending global listener for starting Maya move
        const pending = (this as any).__pendingMayaStartMove;
        if (pending) {
            window.removeEventListener('dialogue-gotit' as any, pending as any);
            (this as any).__pendingMayaStartMove = null;
        }

        console.log('🚀 Maya: Resource cleanup complete');
    }

    /**
     * Update objective when player has met Maya and she starts moving to bank
     */
    private updateObjectiveToFollowMaya(): void {
        const tm = getTaskManager();
        
        // Complete the "meet-maya" task
        const meetTask = tm.getActiveTasks().find(t => t.id === 'meet-maya');
        if (meetTask) {
            console.log("MayaNPCManager: Completing 'meet-maya' task as Maya starts walking to bank");
            tm.completeTask('meet-maya');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('meet-maya');
            }, 1000);
        }
        
        // Add new objective to follow Maya to the bank
        if (!tm.getActiveTasks().some(t => t.id === 'follow-maya-to-bank')) {
            console.log("MayaNPCManager: Setting new objective to follow Maya to Central Bank");
            tm.addTask({
                id: 'follow-maya-to-bank',
                title: 'Follow Maya',
                description: 'Follow Maya to reach the Central Bank',
                active: true,
                completed: false
            });
        }
        
        // Re-enable the location tracker so player can follow Maya to the bank
        locationTrackerManager.setTargetEnabled('maya', true);
    }

    /**
     * Update objective when Maya and player reach the bank destination
     */
    private updateObjectiveClaimBonus(): void {
        const tm = getTaskManager();
        
        // Complete the follow Maya task
        const followTask = tm.getActiveTasks().find(t => t.id === 'follow-maya-to-bank');
        if (followTask) {
            console.log("MayaNPCManager: Completing 'follow-maya-to-bank' task as destination reached");
            tm.completeTask('follow-maya-to-bank');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('follow-maya-to-bank');
            }, 1000);
        }
        
        // Add new objective to claim joining bonus
        if (!tm.getActiveTasks().some(t => t.id === 'claim-joining-bonus')) {
            console.log("MayaNPCManager: Setting new objective to claim joining bonus");
            tm.addTask({
                id: 'claim-joining-bonus',
                title: 'Claim Joining Bonus',
                description: 'Claim your joining bonus from Maya',
                active: true,
                completed: false
            });
        }
    }

    /**
     * Update objective after player claims money to enter bank
     */
    private updateObjectiveEnterBank(): void {
        const tm = getTaskManager();
        
        // Complete the claim bonus task
        const claimTask = tm.getActiveTasks().find(t => t.id === 'claim-joining-bonus');
        if (claimTask) {
            console.log("MayaNPCManager: Completing 'claim-joining-bonus' task as money claimed");
            tm.completeTask('claim-joining-bonus');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('claim-joining-bonus');
            }, 1000);
        }
        
        // Add new objective to enter bank and interact with bank manager
        if (!tm.getActiveTasks().some(t => t.id === 'enter-bank-speak-manager')) {
            console.log("MayaNPCManager: Setting new objective to enter bank and speak to manager");
            tm.addTask({
                id: 'enter-bank-speak-manager',
                title: 'Enter Bank',
                description: 'Go inside the bank and interact with the bank manager',
                active: true,
                completed: false
            });
            
            // Start monitoring player location for dynamic task updates
            this.startBankTaskLocationMonitoring();
        }
    }

    /**
     * Update objective after bank onboarding to follow Maya to stock market
     */
    private updateObjectiveFollowMayaToStockMarket(): void {
        const tm = getTaskManager();
        
        // Complete the bank task
        const bankTask = tm.getActiveTasks().find(t => t.id === 'enter-bank-speak-manager');
        if (bankTask) {
            console.log("MayaNPCManager: Completing 'enter-bank-speak-manager' task as bank onboarding completed");
            tm.completeTask('enter-bank-speak-manager');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('enter-bank-speak-manager');
            }, 1000);
        }
        
        // Add new objective to go back to Maya for stock market guidance
        if (!tm.getActiveTasks().some(t => t.id === 'return-to-maya-stock-market')) {
            console.log("MayaNPCManager: Setting new objective to return to Maya for stock market guidance");
            tm.addTask({
                id: 'return-to-maya-stock-market',
                title: 'Return to Maya',
                description: 'Go back to Maya and follow her to the Dhaniverse Stock Market',
                active: true,
                completed: false
            });
        }
    }

    /**
     * Update objective when Maya and player reach stock market
     */
    private updateObjectiveExploreStockMarket(): void {
        const tm = getTaskManager();
        
        // Complete the return to Maya task
        const returnTask = tm.getActiveTasks().find(t => t.id === 'return-to-maya-stock-market');
        if (returnTask) {
            console.log("MayaNPCManager: Completing 'return-to-maya-stock-market' task as stock market reached");
            tm.completeTask('return-to-maya-stock-market');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('return-to-maya-stock-market');
            }, 1000);
        }
        
        // Clean up ALL Maya onboarding objectives when tutorial completes
        this.cleanupMayaOnboardingObjectives();
        
        // Add new objective to explore stock market
        if (!tm.getActiveTasks().some(t => t.id === 'explore-dhani-stocks')) {
            console.log("MayaNPCManager: Setting new objective to explore Dhani stocks");
            tm.addTask({
                id: 'explore-dhani-stocks',
                title: 'Explore Stock Market',
                description: 'Go inside and explore Dhani stocks',
                active: true,
                completed: false
            });
        }
    }

    /**
     * Clean up all Maya onboarding objectives when the tutorial is complete
     */
    private cleanupMayaOnboardingObjectives(): void {
        const tm = getTaskManager();
        const activeTasks = tm.getActiveTasks();
        
        // List of all Maya onboarding task IDs that should be cleaned up
        const mayaOnboardingTaskIds = [
            'meet-maya',
            'follow-maya-to-bank',
            'claim-joining-bonus',
            'enter-bank-speak-manager',
            'return-to-maya-stock-market'
        ];
        
        console.log("MayaNPCManager: Cleaning up Maya onboarding objectives...");
        
        // Find and clean up any remaining Maya onboarding tasks
        mayaOnboardingTaskIds.forEach(taskId => {
            const task = activeTasks.find(t => t.id === taskId);
            if (task) {
                console.log(`MayaNPCManager: Completing and removing Maya task: ${taskId}`);
                tm.completeTask(taskId);
                
                // Remove the task after a short delay
                setTimeout(() => {
                    tm.removeTask(taskId);
                }, 1000);
            }
        });
        
        console.log("MayaNPCManager: Maya onboarding cleanup complete");
    }

    // Handle adding the next objective after the initial Maya intro dialogue is fully closed
    private handlePostInitialDialogue(): void {
        if (this.initialDialogueTaskResolved) return;
        this.initialDialogueTaskResolved = true;
        const tm = getTaskManager();
        // Only add follow-up if not already present
        if (!tm.getActiveTasks().some(t => t.id === 'enter-bank')) {
            tm.addTask({
                id: 'enter-bank',
                title: 'Enter the Bank',
                description: 'Enter the Central Bank to continue your financial orientation.',
                active: true,
                completed: false
            });
        }
    }

    /**
     * Complete the "meet-maya" task when Maya starts walking towards the bank
     */
    private completeMeetMayaTask(): void {
        const tm = getTaskManager();
        const meetTask = tm.getActiveTasks().find(t => t.id === 'meet-maya');
        if (meetTask) {
            console.log("MayaNPCManager: Completing 'meet-maya' task as Maya starts walking to bank");
            tm.completeTask('meet-maya');
            
            // Clean up the task after a short delay
            setTimeout(() => {
                tm.removeTask('meet-maya');
            }, 1000);
        }
    }

    /**
     * Set new objective to enter the bank and speak to bank teller
     */
    private setEnterBankTask(): void {
        const tm = getTaskManager();
        // Only add if not already present
        if (!tm.getActiveTasks().some(t => t.id === 'enter-bank-speak-teller')) {
            console.log("MayaNPCManager: Setting new objective to enter bank and speak to teller");
            tm.addTask({
                id: 'enter-bank-speak-teller',
                title: 'Enter Bank & Meet Teller',
                description: 'Go inside the Central Bank building to continue your journey.',
                active: true,
                completed: false
            });
            
            // Start monitoring player location for dynamic task updates
            this.startBankTaskLocationMonitoring();
        }
    }

    /**
     * Monitor player location and update bank task description dynamically
     */
    private startBankTaskLocationMonitoring(): void {
        // Check location every second
        const checkLocation = () => {
            const tm = getTaskManager();
            const bankTask = tm.getTasks().find(t => t.id === 'enter-bank-speak-manager');
            
            // If task no longer exists or is completed, stop monitoring
            if (!bankTask || bankTask.completed || !bankTask.active) {
                this.stopBankTaskLocationMonitoring();
                return;
            }
            
            const mapManager = this.scene.mapManager;
            const currentBuilding = mapManager ? mapManager.getCurrentBuildingType() : null;
            
            let newDescription: string;
            if (currentBuilding === 'bank') {
                // Player is inside the bank
                newDescription = 'Speak to the bank manager to learn about financial services.';
            } else {
                // Player is outside the bank
                newDescription = 'Go inside the bank and interact with the bank manager';
            }
            
            // Only update if description has changed
            if (bankTask.description !== newDescription) {
                console.log(`MayaNPCManager: Updating bank task description based on location - inside bank: ${currentBuilding === 'bank'}`);
                tm.updateTask({
                    id: 'enter-bank-speak-manager',
                    changes: { description: newDescription }
                });
            }
        };
        
        // Initial check
        checkLocation();
        
        // Set up interval to check location periodically
        this.bankTaskLocationInterval = setInterval(checkLocation, 1000);
    }

    /**
     * Stop monitoring bank task location (called when task is completed)
     */
    private stopBankTaskLocationMonitoring(): void {
        if (this.bankTaskLocationInterval) {
            clearInterval(this.bankTaskLocationInterval);
            this.bankTaskLocationInterval = null;
            console.log('MayaNPCManager: Stopped bank task location monitoring');
        }
    }
}
