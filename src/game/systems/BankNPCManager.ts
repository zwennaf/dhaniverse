import { GameObjects, Input } from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { Constants } from '../utils/Constants.ts';
import { BankOnboardingManager } from './banking/BankOnboardingManager';
import { shouldShowBankOnboarding } from '../../config/onboarding';
import { getTaskManager } from '../tasks/TaskManager.ts';

interface NPCSprite extends GameObjects.Image {
  nameText?: GameObjects.Text;
}

interface BankAccount {
  id: string;
  balance: number;
  fixedDeposits: FixedDeposit[];
}

interface FixedDeposit {
  id: string;
  amount: number;
  interestRate: number;
  startDate: number;
  duration: number; // in days
  maturityDate: number;
  matured: boolean;
}

export class BankNPCManager {
  private scene: MainScene;
  private banker: NPCSprite;
  private interactionKey: Input.Keyboard.Key | null = null;
  private readonly interactionDistance: number = 150;
  private interactionText: GameObjects.Text;
  private isOnboardingMode: boolean = false;
  private bankOnboardingManager: BankOnboardingManager;
  private isPlayerNearBanker: boolean = false;
  private activeDialog: boolean = false;
  private speechBubble: GameObjects.Sprite | null = null;
  private playerBankAccount: BankAccount;
  private handleBankingClosedBound = this.handleBankingClosed.bind(this);

  constructor(scene: MainScene) {
    this.scene = scene;
    
    // Initialize bank onboarding manager
    this.bankOnboardingManager = new BankOnboardingManager(scene);
    
    // Check if we should start in onboarding mode based on configuration
    this.isOnboardingMode = shouldShowBankOnboarding() && this.bankOnboardingManager.shouldShowOnboarding();
    
    // Setup interaction key with null check
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey('E');
      // Add SPACE and ENTER as alternative interaction keys
      const spaceKey = scene.input.keyboard.addKey('SPACE');
      const enterKey = scene.input.keyboard.addKey('ENTER');
      
      // Make these keys also trigger the interaction
      if (spaceKey) {
        spaceKey.on('down', () => {
          if (this.isPlayerNearBanker && !this.activeDialog) {
            this.startBankingInteraction();
          }
        });
      }
      
      if (enterKey) {
        enterKey.on('down', () => {
          if (this.isPlayerNearBanker && !this.activeDialog) {
            this.startBankingInteraction();
          }
        });
      }
    }
    
    // Initialize the player's bank account
    this.playerBankAccount = {
      id: 'player-account',
      balance: 0,
      fixedDeposits: []
    };
    
    // Create banker NPC at predefined position
    const bankerX = 1000;
    const bankerY = 700;
    this.banker = scene.add.image(bankerX, bankerY, 'bank-manager') as NPCSprite;
    this.banker.setScale(0.2);
      // Add banker name text
    const bankerNameText = scene.add.text(this.banker.x, this.banker.y - 100, "Bank Teller", {
      fontFamily: Constants.NPC_NAME_FONT,
      fontSize: Constants.NPC_NAME_SIZE,
      color: Constants.NPC_NAME_COLOR,
      align: 'center',
      backgroundColor: Constants.NPC_NAME_BACKGROUND,
      padding: Constants.NPC_NAME_PADDING
    }).setOrigin(0.5).setDepth(51);
    
    // Add interaction text (initially hidden)
    this.interactionText = scene.add.text(this.banker.x, this.banker.y - 80, "Press E to interact", {
      fontFamily: Constants.UI_TEXT_FONT,
      fontSize: Constants.UI_TEXT_SIZE,
      color: Constants.UI_TEXT_COLOR,
      align: 'center',
      backgroundColor: Constants.UI_TEXT_BACKGROUND,
      padding: Constants.UI_TEXT_PADDING
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(52);
    
    // Add to game container
    const gameContainer = scene.getGameContainer();
    if (gameContainer) {
      gameContainer.add(this.banker);
      gameContainer.add(bankerNameText);
      gameContainer.add(this.interactionText);
      this.banker.nameText = bankerNameText;
    }
    
    // Hide the banker initially - will show only in the bank
    this.toggleVisibility(false);
    
    // Setup speech bubble animations
    this.setupSpeechBubbleAnimations();
    
    // Listen for banking UI closure to sync any changes
    window.addEventListener('closeBankingUI', this.handleBankingClosedBound);
    
    console.log("Bank NPC created at position:", bankerX, bankerY);
  }

  /**
   * Handle banking UI closure and sync any money changes with backend
   */
  private async handleBankingClosed(): Promise<void> {
    console.log("Banking UI closed - syncing any changes with backend");
    
    try {
      // Refresh player state from backend to ensure consistency
      await this.scene.refreshPlayerStateFromBackend();
    } catch (error) {
      console.error("Failed to sync banking changes with backend:", error);
    }
  }
  
  private setupSpeechBubbleAnimations(): void {
    try {
      // Check if the texture exists and animations are already created
      if (this.scene.anims.exists('speech-bubble-open')) {
        return; // Animations already set up
      }
      
      // Check if the texture exists first
      if (!this.scene.textures.exists('speech_bubble_grey')) {
        console.warn("speech_bubble_grey texture not found for bank NPC");
        return;
      }
      
      // Create opening animation (frames 8-14)
      this.scene.anims.create({
        key: 'speech-bubble-open',
        frames: this.scene.anims.generateFrameNumbers('speech_bubble_grey', { 
          start: 8, 
          end: 14 
        }),
        frameRate: 15,
        repeat: 0
      });
      
      // Create closing animation (frames 15-21)
      this.scene.anims.create({
        key: 'speech-bubble-close',
        frames: this.scene.anims.generateFrameNumbers('speech_bubble_grey', { 
          start: 15, 
          end: 21 
        }),
        frameRate: 15,
        repeat: 0
      });
    } catch (error) {
      console.error("Failed to create speech bubble animations for bank:", error);
    }
  }

  /**
   * Toggle banker visibility based on player location
   */
  public toggleVisibility(visible: boolean): void {
    if (this.banker) {
      this.banker.setVisible(visible);
      if (this.banker.nameText) {
        this.banker.nameText.setVisible(visible);
      }
    }
    
    // Also hide interaction text when banker is hidden
    if (!visible) {
      this.interactionText.setAlpha(0);
    }
  }

  /**
   * Main update function to be called each frame
   */
  public update(): void {
    if (!this.banker.visible) return;
    
    const player = this.scene.getPlayer();
    const playerPosition = player.getPosition();
    const playerX = playerPosition.x;
    const playerY = playerPosition.y;
    
    // Calculate distance between player and banker
    const distance = Phaser.Math.Distance.Between(
      playerX, playerY,
      this.banker.x, this.banker.y
    );
    
    // Check if player is close enough to interact
    const wasNearBanker = this.isPlayerNearBanker;
    this.isPlayerNearBanker = distance < this.interactionDistance;
    
    // Show interaction prompt if player is in range and no dialog is active
    if (this.isPlayerNearBanker && !this.activeDialog) {
      this.interactionText.setAlpha(1);
      this.interactionText.setPosition(this.banker.x, this.banker.y - 80);
      
      // Make the banker face the player
      this.updateBankerOrientation(playerX, playerY);
      
      // Check for interaction key press
      if (this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
        this.startBankingInteraction();
      }
    } else if (!this.isPlayerNearBanker && wasNearBanker) {
      // Player just left interaction zone
      this.interactionText.setAlpha(0);
      // Bank manager is static, no animation needed
    }
  }
  
  /**
   * Update the banker's facing direction to look at the player
   * Bank manager is static, so no visual changes needed
   */
  private updateBankerOrientation(playerX: number, playerY: number): void {
    // Bank manager is a static image, no orientation changes needed
    // This method is kept for compatibility but does nothing
  }
  
  /**
   * Start the bank manager interaction - only onboarding or simple dialogue
   */
  private startBankingInteraction(): void {
    if (this.activeDialog) return;
    
    console.log("🏦 Starting bank manager interaction");
    this.activeDialog = true;
    this.interactionText.setAlpha(0);
    
    // Complete the bank entry task when player talks to bank manager
    const tm = getTaskManager();
    const bankTask = tm.getTasks().find(t => t.id === 'enter-bank-speak-teller');
    if (bankTask && bankTask.active && !bankTask.completed) {
      console.log("🏦 Completing bank entry task - player spoke to bank manager");
      tm.completeTask('enter-bank-speak-teller');
    }
    
    // Check if we should start bank onboarding (check dynamically each time)
    const shouldStartOnboarding = shouldShowBankOnboarding() && this.bankOnboardingManager.shouldShowOnboarding();
    
    console.log("🏦 Onboarding check:", {
      configEnabled: shouldShowBankOnboarding(),
      managerShouldShow: this.bankOnboardingManager.shouldShowOnboarding(),
      finalDecision: shouldStartOnboarding
    });
    
    if (shouldStartOnboarding) {
      console.log("🏦 Starting bank onboarding...");
      this.bankOnboardingManager.startOnboarding();
      return;
    }
    
    // If onboarding is complete, show a simple dialogue
    console.log("🏦 Bank onboarding already completed - showing simple dialogue");
    this.showCompletedOnboardingDialogue();
  }
  
  /**
   * Show a speech bubble over the banker's head
   * Note: This is no longer used for bank teller interactions
   * but kept for potential future use
   */
  private showSpeechBubble(): void {
    // ...existing code...
  }
  
  /**
   * Show a simple dialogue for when onboarding is already completed
   */
  private showCompletedOnboardingDialogue(): void {
    // Create a simple dialogue event
    window.dispatchEvent(new CustomEvent('show-dialogue', {
      detail: {
        text: "Welcome back! Your account is all set up. Use the banking terminal to access all banking services.",
        characterName: 'Bank Manager',
        allowAdvance: true
      }
    }));

    // When dialogue is closed, reset the interaction state
    const onAdvance = () => {
      this.endBankingInteraction();
      window.removeEventListener('dialogue-advance' as any, onAdvance as any);
    };
    window.addEventListener('dialogue-advance' as any, onAdvance as any);
  }

  /**
   * Close the bank manager interaction
   */
  public endBankingInteraction(): void {
    // Don't end interaction if bank onboarding is still active
    if (this.bankOnboardingManager && this.bankOnboardingManager.isOnboardingActiveNow()) {
      console.log("Not ending interaction - bank onboarding still active");
      return;
    }
    
    if (!this.activeDialog) return;
    
    console.log("Ending bank manager interaction");
    this.activeDialog = false;
    
    // Show interaction text again if player is still nearby
    if (this.isPlayerNearBanker) {
      this.interactionText.setAlpha(1);
    }
  }
  
  /**
   * Get the current player bank account data
   * This is kept for compatibility but banking functionality moved to terminals
   */
  public getBankAccountData(): BankAccount {
    return this.playerBankAccount;
  }
  
  /**
   * Called when the player enters a building
   * @param buildingType The type of building entered (optional)
   */
  public onEnterBuilding(buildingType?: string): void {
    // Show the banker only if the player is in the bank building
    // If buildingType isn't provided, we'll assume it's the bank for now
    // In a more complex game, you'd check if buildingType === 'bank'
    this.toggleVisibility(true);
    console.log("Player entered bank building, showing banker");
  }

  /**
   * Called when the player exits a building
   */
  public onExitBuilding(): void {
    // Hide the banker when exiting any building
    this.toggleVisibility(false);
    console.log("Player exited building, hiding banker");
  }
  
  /**
   * Set onboarding mode
   */
  public setOnboardingMode(enabled: boolean): void {
    this.isOnboardingMode = enabled;
    console.log("Bank onboarding mode set to:", enabled);
  }
  
  /**
   * Check if currently in onboarding mode
   */
  public isInOnboardingMode(): boolean {
    return this.isOnboardingMode;
  }
  
  /**
   * Get bank onboarding manager
   */
  public getBankOnboardingManager(): BankOnboardingManager {
    return this.bankOnboardingManager;
  }
  
  /**
   * Clean up resources when scene is being destroyed
   */
  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('closeBankingUI', this.handleBankingClosedBound);
    
    if (this.banker.nameText) {
      this.banker.nameText.destroy();
    }
    
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    
    this.banker.destroy();
    this.interactionText.destroy();
  }
}