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
  private interactionInProgress: boolean = false; // debounce guard
  private speechBubble: GameObjects.Sprite | null = null;
  private playerBankAccount: BankAccount;
  private handleBankingClosedBound = this.handleBankingClosed.bind(this);
  private handleConversationEndedBound = this.handleConversationEnded.bind(this);
  private spaceKey?: Input.Keyboard.Key;
  private enterKey?: Input.Keyboard.Key;
  // Simple cache for backend account existence to reduce rapid duplicate hits
  private lastBackendCheckAt: number = 0;
  private lastBackendCheckResult: boolean | null = null;
  private readonly backendCheckTTL = 5000; // ms

  constructor(scene: MainScene) {
    this.scene = scene;
    
    // Initialize bank onboarding manager
    this.bankOnboardingManager = new BankOnboardingManager(scene);
    
    // Initialize onboarding mode asynchronously
    this.initializeOnboardingMode();
    
    // Setup interaction key with null check
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey('E');
      // Add SPACE and ENTER as alternative interaction keys
  this.spaceKey = scene.input.keyboard.addKey('SPACE');
  this.enterKey = scene.input.keyboard.addKey('ENTER');
      
      // Make these keys also trigger the interaction
      const altTrigger = () => {
        if (this.isPlayerNearBanker && !this.activeDialog) {
          this.startBankingInteraction().catch(error => {
            console.error("Error starting bank interaction:", error);
          });
        }
      };
      this.spaceKey?.on('down', altTrigger);
      this.enterKey?.on('down', altTrigger);
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
  // Use scrollFactor=1 so text follows world coordinates (over NPC) and will
  // appear at the bank manager's position on screen. Keep depth high but under UI.
  this.interactionText = scene.add.text(this.banker.x, this.banker.y - 80, "Press E to interact", {
      fontFamily: Constants.UI_TEXT_FONT,
      fontSize: Constants.UI_TEXT_SIZE,
      color: Constants.UI_TEXT_COLOR,
      align: 'center',
      backgroundColor: Constants.UI_TEXT_BACKGROUND,
      padding: Constants.UI_TEXT_PADDING
  }).setOrigin(0.5).setAlpha(0).setScrollFactor(1).setDepth(52);
    
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
    
    // Listen for bank conversation ended event
  window.addEventListener('bank-conversation-ended', this.handleConversationEndedBound);
    
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

  /**
   * Handle bank conversation ended event from onboarding manager
   */
  private handleConversationEnded(): void {
    console.log("🏦 Bank conversation ended - resetting interaction state");
    this.endBankingInteraction();
  }
  
  /**
   * Initialize onboarding mode asynchronously
   */
  private async initializeOnboardingMode(): Promise<void> {
    try {
      // Prefer a backend check: if the player already has a bank account or non-zero balance
      // then onboarding should not be shown. Fall back to the onboarding manager's check.
      const accountOrBalanceExists = await this.checkAccountExistsOrHasBalance();
      if (accountOrBalanceExists) {
        this.isOnboardingMode = false;
        console.log('Bank onboarding disabled because account/balance exists in backend');
      } else {
        const shouldShow = await this.bankOnboardingManager.shouldShowOnboarding();
        this.isOnboardingMode = shouldShowBankOnboarding() && shouldShow;
        console.log("Bank onboarding mode initialized:", this.isOnboardingMode);
      }
    } catch (error) {
      console.error("Failed to initialize bank onboarding mode:", error);
      this.isOnboardingMode = false;
    }
  }

  /**
   * Check backend for existing bank account or non-zero balance.
   * Returns true if account exists or has balance > 0.
   */
  private async checkAccountExistsOrHasBalance(): Promise<boolean> {
    type BankingApiLike = {
      getAccount: () => Promise<{ success: boolean; data: any }>;
      getOnboardingStatus: () => Promise<{ success: boolean; data: any }>;
    };

    const now = Date.now();
    if (this.lastBackendCheckResult !== null && (now - this.lastBackendCheckAt) < this.backendCheckTTL) {
      return this.lastBackendCheckResult;
    }

    try {
      const { bankingApi } = (await import('../../utils/api')) as { bankingApi: BankingApiLike };

      // First try to get the full account
      const accountResp = await bankingApi.getAccount();
      if (accountResp && accountResp.success && accountResp.data) {
        const acc = accountResp.data;
        // If account exists and has positive balance, treat as existing
        if (typeof acc.balance === 'number' && acc.balance > 0) return true;
        // If account object exists (even zero balance) consider it an existing account
        return true;
      }

      // Fallback: query onboarding status which may indicate hasBankAccount
      const statusResp = await bankingApi.getOnboardingStatus();
      if (statusResp && statusResp.success && statusResp.data) {
        if (statusResp.data.hasBankAccount) return true;
      }

  this.lastBackendCheckAt = Date.now();
  this.lastBackendCheckResult = false;
  return this.lastBackendCheckResult;
    } catch (e) {
      console.warn('Failed to check backend bank account status:', e);
      // Conservative behavior: if we can't reach the backend, assume account exists
      // to avoid presenting onboarding that may fail or create inconsistent local-only state.
  this.lastBackendCheckAt = Date.now();
  this.lastBackendCheckResult = true;
  return this.lastBackendCheckResult;
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
        this.startBankingInteraction().catch(error => {
          console.error("Error starting bank interaction:", error);
        });
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
  private async startBankingInteraction(): Promise<void> {
  if (this.activeDialog || this.interactionInProgress) return;
  this.interactionInProgress = true;
    
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
    
    // Prefer backend check at interaction time as well: if an account exists or has balance, skip onboarding
    const backendHasAccount = await this.checkAccountExistsOrHasBalance();
    if (backendHasAccount) {
      console.log('Bank onboarding skipped: account or balance exists in backend at interaction time');
      // Directly show returning greeting (dashboard prompt)
      this.bankOnboardingManager.showReturningGreeting();
      this.interactionInProgress = false;
      return;
    }

    // Check if we should start bank onboarding (check dynamically each time)
    const managerShouldShow = await this.bankOnboardingManager.shouldShowOnboarding();
    const shouldStartOnboarding = shouldShowBankOnboarding() && managerShouldShow;
    
    console.log("🏦 Onboarding check:", {
      configEnabled: shouldShowBankOnboarding(),
      managerShouldShow,
      finalDecision: shouldStartOnboarding
    });
    
    if (shouldStartOnboarding) {
      console.log("🏦 Starting bank onboarding...");
      this.bankOnboardingManager.startOnboarding();
      this.interactionInProgress = false;
      return;
    }
    // Onboarding complete or not needed: always delegate to bank manager conversation (returning greeting + options)
    console.log("🏦 Bank onboarding already completed - showing returning greeting");
    this.bankOnboardingManager.startConversation();
    this.interactionInProgress = false;
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
  // Legacy method retained for compatibility; now delegates to unified conversation flow
  this.bankOnboardingManager.startConversation();
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
   * Public accessor for banker position (used for placing interaction hotspots)
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.banker.x, y: this.banker.y };
  }
  
  /**
   * Clean up resources when scene is being destroyed
   */
  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('closeBankingUI', this.handleBankingClosedBound);
  window.removeEventListener('bank-conversation-ended', this.handleConversationEndedBound);
    
    if (this.banker.nameText) {
      this.banker.nameText.destroy();
    }
    
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    
    this.banker.destroy();
    this.interactionText.destroy();
  // Remove key listeners explicitly (defensive)
  this.spaceKey?.removeAllListeners();
  this.enterKey?.removeAllListeners();
  this.interactionKey?.removeAllListeners();
  }
}