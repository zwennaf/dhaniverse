import { GameObjects, Input } from 'phaser';
import { Constants } from '../utils/Constants.ts';
import { MainGameScene } from '../scenes/MainScene';
import { shouldAutoOpenBankingUI } from '../../config/onboarding';
import { dialogueManager } from '../../services/DialogueManager';
import { progressionManager } from '../../services/ProgressionManager';

export class BuildingManager {
  private scene: MainGameScene;
  private buildingEntrance: { x: number, y: number };
  private stockMarketEntrance: { x: number, y: number };
  private bankExitLocation: { x: number, y: number };
  private bankCenterTerminal: { x: number, y: number };
  private bankCenterInteractionText: GameObjects.Container;
  private buildingInteractionText: GameObjects.Container;
  private stockMarketInteractionText: GameObjects.Container;
  private bankExitInteractionText: GameObjects.Container;
  private interactionKey: Input.Keyboard.Key | null = null;
  private spaceKey: Input.Keyboard.Key | null = null;
  private enterKey: Input.Keyboard.Key | null = null;
  private escKey: Input.Keyboard.Key | null = null;
  private isNearBuilding: boolean = false;
  private isNearStockMarket: boolean = false;
  private transitionInProgress: boolean = false;
  private lastInteractionTime: number = 0;
  private interactionCooldown: number = 300; // 300ms cooldown between interactions

  constructor(scene: MainGameScene) {
    this.scene = scene;
    this.buildingEntrance = { x: 9383, y: 6087 };
    this.stockMarketEntrance = { x: 2565, y: 3550 }; // Stock market building entrance
    this.bankExitLocation = { x: 550, y: 2918 }; // Exit location inside bank building
  this.bankCenterTerminal = { x: 586, y: 2918 }; // Center terminal to open banking dashboard
      // Initialize buildingInteractionText with rounded background + centered text
      this.buildingInteractionText = this.createRoundedInteractionLabel(
        this.buildingEntrance.x,
        this.buildingEntrance.y - 50,
        'Press [E] to Enter'
      ).setAlpha(0);
    
    // Add stock market interaction text (rounded)
    this.stockMarketInteractionText = this.createRoundedInteractionLabel(
      this.stockMarketEntrance.x,
      this.stockMarketEntrance.y - 50,
      'Press [E] to Enter Stock Market'
    ).setAlpha(0);
    
    
    // Add bank exit interaction text (shown when near exit location inside bank)
    this.bankExitInteractionText = this.createRoundedInteractionLabel(
      this.bankExitLocation.x,
      this.bankExitLocation.y - 50,
      'Press E to exit bank'
    ).setAlpha(0);

    // Add bank center interaction text (open dashboard)
    this.bankCenterInteractionText = this.createRoundedInteractionLabel(
      this.bankCenterTerminal.x,
      this.bankCenterTerminal.y - 110,
      'Press E to open Banking'
    ).setAlpha(0);
    
    // Setup keys for interaction with null checks
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey('E');
      this.spaceKey = scene.input.keyboard.addKey('SPACE');
      this.enterKey = scene.input.keyboard.addKey('ENTER');
      this.escKey = scene.input.keyboard.addKey('ESC');
    }
    
    this.setupBuilding();
    
    // Listen for dialogue close events to reset interaction timer
    window.addEventListener('dialogue-closed', (event: any) => {
      console.log('BuildingManager: Dialogue closed, resetting interaction timer');
      this.lastInteractionTime = event.detail.timestamp;
    });
  }

  update(): void {
    // Skip update if transition is in progress
    if (this.transitionInProgress) return;
    
    this.handleBuildingInteraction();
    this.handleStockMarketInteraction();
  }

  private setupBuilding(): void {
    const gameContainer = this.scene.getGameContainer();
    if (gameContainer) {
      gameContainer.add(this.buildingInteractionText);
      gameContainer.add(this.stockMarketInteractionText);
      gameContainer.add(this.bankExitInteractionText);
  gameContainer.add(this.bankCenterInteractionText);
    }
  }

  private handleBuildingInteraction(): void {
    const player = this.scene.getPlayer();
    const mapManager = this.scene.mapManager;
    if (!player || !mapManager) return;
    
    // Get player position
    const playerPos = player.getPosition();
    
    // If player is in building, check for ESC to exit (even if dialogue is active - force exit)
    if (mapManager.isPlayerInBuilding() && this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      console.log('BuildingManager: ESC key pressed while in building');
      // Close any active dialogues before exiting
      if (dialogueManager.isDialogueActive()) {
        dialogueManager.forceCloseAll();
        console.log('BuildingManager: Forced dialogue close on ESC exit');
      }
      console.log('BuildingManager: Calling exitBuilding()');
      this.exitBuilding();
      return;
    }
    
    // If player is in building, check for proximity to bank exit location
    if (mapManager.isPlayerInBuilding()) {
      const exitDx = playerPos.x - this.bankExitLocation.x;
      const exitDy = playerPos.y - this.bankExitLocation.y;
      const exitDistance = Math.sqrt(exitDx * exitDx + exitDy * exitDy);
      
      const isNearExit = exitDistance <= Constants.BUILDING_INTERACTION_DISTANCE;
      
      // Show/hide exit interaction text based on proximity
      if (isNearExit && this.bankExitInteractionText.alpha === 0) {
        this.scene.tweens.add({
          targets: this.bankExitInteractionText,
          alpha: 1,
          duration: 200,
          ease: 'Power1'
        });
      } else if (!isNearExit && this.bankExitInteractionText.alpha === 1) {
        this.scene.tweens.add({
          targets: this.bankExitInteractionText,
          alpha: 0,
          duration: 200,
          ease: 'Power1'
        });
      }
      
      // Check for interaction key press when near exit
      if (isNearExit && !dialogueManager.isDialogueActive() &&
          ((this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) ||
           (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
           (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)))) {
        this.exitBuilding();
        return;
      }

      // --- Bank center terminal (open dashboard) ---
      const termDx = playerPos.x - this.bankCenterTerminal.x;
      const termDy = playerPos.y - this.bankCenterTerminal.y;
      const termDistance = Math.sqrt(termDx * termDx + termDy * termDy);
      const isNearTerminal = termDistance <= Constants.BUILDING_INTERACTION_DISTANCE * 0.6; // slightly tighter

      if (isNearTerminal && this.bankCenterInteractionText.alpha === 0) {
        this.scene.tweens.add({ targets: this.bankCenterInteractionText, alpha: 1, duration: 200, ease: 'Power1' });
      } else if (!isNearTerminal && this.bankCenterInteractionText.alpha === 1) {
        this.scene.tweens.add({ targets: this.bankCenterInteractionText, alpha: 0, duration: 200, ease: 'Power1' });
      }

      if (isNearTerminal && !dialogueManager.isDialogueActive() &&
          ((this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) ||
           (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
           (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)))) {
        // Open banking UI via mainScene helper
        const mainScene: any = this.scene;
        if (mainScene.bankNPCManager) {
          const account = mainScene.bankNPCManager.getBankAccountData();
          mainScene.openBankingUI(account);
        } else {
          // Fallback event
            window.dispatchEvent(new CustomEvent('openBankingUI', { detail: {} }));
        }
      }
    }
    
    // Calculate distance between player and building entrance
    const dx = playerPos.x - this.buildingEntrance.x;
    const dy = playerPos.y - this.buildingEntrance.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if player is within interaction distance
    const wasNearBuilding = this.isNearBuilding;
    this.isNearBuilding = distance <= Constants.BUILDING_INTERACTION_DISTANCE;
    
    // Only react to changes in proximity or handle interaction when near building
    if (this.isNearBuilding !== wasNearBuilding) {
      if (this.isNearBuilding && !mapManager.isPlayerInBuilding()) {
        // Player just entered interaction zone - show text with fade in
        this.scene.tweens.add({
          targets: this.buildingInteractionText,
          alpha: 1,
          duration: 200,
          ease: 'Power1'
        });
      } else if (!mapManager.isPlayerInBuilding()) {
        // Player just left interaction zone - hide text with fade out
        this.scene.tweens.add({
          targets: this.buildingInteractionText,
          alpha: 0,
          duration: 200,
          ease: 'Power1'
        });
      }
    }
    
    // Ensure interaction text is visible when near and not in building (fallback check)
    if (this.isNearBuilding && !mapManager.isPlayerInBuilding() && this.buildingInteractionText.alpha === 0) {
      this.buildingInteractionText.setAlpha(1);
    }
    
    // Check for key press to enter building when near (now supports E, Space, or Enter with cooldown)
    const currentTime = Date.now();
    if (this.isNearBuilding && 
        !mapManager.isPlayerInBuilding() && 
        !dialogueManager.isDialogueActive() && // Don't trigger when dialogue is active
        currentTime - this.lastInteractionTime > this.interactionCooldown && // Add cooldown
        ((this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) ||
         (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
         (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)))) {
      console.log('BuildingManager: Attempting to enter bank building');
      this.lastInteractionTime = currentTime;
      this.enterBuilding('bank');
    }
    
    // Debug logging when space is pressed but entry is blocked
    if (this.isNearBuilding && 
        !mapManager.isPlayerInBuilding() && 
        this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      console.log('BuildingManager: Space pressed near building, dialogue active:', dialogueManager.isDialogueActive(), 'cooldown remaining:', Math.max(0, this.interactionCooldown - (currentTime - this.lastInteractionTime)));
    }
    
    // Update interaction text position to follow entrance point
    if (this.buildingInteractionText) {
      this.buildingInteractionText.x = this.buildingEntrance.x;
      this.buildingInteractionText.y = this.buildingEntrance.y - 50;
    }

    // Update bank exit interaction text position (stays at fixed location)
    if (this.bankExitInteractionText) {
      this.bankExitInteractionText.x = this.bankExitLocation.x;
      this.bankExitInteractionText.y = this.bankExitLocation.y - 50;
    }

    if (this.bankCenterInteractionText) {
      // If player is inside bank, try to anchor to banker NPC position for true center
      const mainScene: any = this.scene;
      if (mainScene.bankNPCManager && mainScene.mapManager?.isPlayerInBuilding()) {
        const pos = mainScene.bankNPCManager.getPosition();
        this.bankCenterInteractionText.x = pos.x;
        this.bankCenterInteractionText.y = pos.y - 140; // above banker
      } else {
        this.bankCenterInteractionText.x = this.bankCenterTerminal.x;
        this.bankCenterInteractionText.y = this.bankCenterTerminal.y - 110;
      }
    }
  }
  
  private handleStockMarketInteraction(): void {
    const player = this.scene.getPlayer();
    const mapManager = this.scene.mapManager;
    if (!player || !mapManager) return;
    
    // Get player position
    const playerPos = player.getPosition();
    
    // Calculate distance between player and stock market entrance
    const dx = playerPos.x - this.stockMarketEntrance.x;
    const dy = playerPos.y - this.stockMarketEntrance.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if player is within interaction distance
    const wasNearStockMarket = this.isNearStockMarket;
    this.isNearStockMarket = distance <= Constants.BUILDING_INTERACTION_DISTANCE;
    
    // Only react to changes in proximity or handle interaction when near stock market
    if (this.isNearStockMarket !== wasNearStockMarket) {
      if (this.isNearStockMarket && !mapManager.isPlayerInBuilding()) {
        // Player just entered interaction zone - show text with fade in
        this.scene.tweens.add({
          targets: this.stockMarketInteractionText,
          alpha: 1,
          duration: 200,
          ease: 'Power1'
        });
      } else if (!mapManager.isPlayerInBuilding()) {
        // Player just left interaction zone - hide text with fade out
        this.scene.tweens.add({
          targets: this.stockMarketInteractionText,
          alpha: 0,
          duration: 200,
          ease: 'Power1'
        });
      }
    }
    
    // Ensure interaction text is visible when near and not in building (fallback check)
    if (this.isNearStockMarket && !mapManager.isPlayerInBuilding() && this.stockMarketInteractionText.alpha === 0) {
      this.stockMarketInteractionText.setAlpha(1);
    }
    
    // Check for key press to enter stock market when near
    const currentTime = Date.now();
    if (this.isNearStockMarket && 
        !mapManager.isPlayerInBuilding() && 
        !dialogueManager.isDialogueActive() && // Don't trigger when dialogue is active
        currentTime - this.lastInteractionTime > this.interactionCooldown && // Add cooldown
        ((this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) ||
         (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
         (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)))) {
      this.lastInteractionTime = currentTime;
      this.enterBuilding('stockmarket');
    }
    
    // Update interaction text position to follow entrance point
    if (this.stockMarketInteractionText) {
      this.stockMarketInteractionText.x = this.stockMarketEntrance.x;
      this.stockMarketInteractionText.y = this.stockMarketEntrance.y - 50;
    }
  }

  private enterBuilding(buildingType: 'bank' | 'stockmarket' = 'bank'): void {
    const player = this.scene.getPlayer();
    const mapManager = this.scene.mapManager;
    if (!player || !mapManager || this.transitionInProgress) return;

    // Centralized progression gating with detailed debugging
    try {
      const progressionState = progressionManager.getState();
      console.log('🏢 BuildingManager: Checking building access for', buildingType);
      console.log('🏢 Current progression state:', progressionState);
      
      const check = progressionManager.canEnterBuilding(buildingType === 'bank' ? 'bank' : 'stockmarket');
      console.log('🏢 Building access check result:', check);
      
      if (!check.allowed) {
        this.lastInteractionTime = Date.now(); // Update interaction time to prevent spam
        console.log('🚫 Access denied to', buildingType, '- showing message:', check.message);
        progressionManager.showAccessDenied(check.message!);
        return;
      }
      
      console.log('✅ Access granted to', buildingType);
    } catch (e) { 
      console.warn('Progression gating unavailable', e); 
    }
    
    // Set transition in progress to prevent multiple transitions
    this.transitionInProgress = true;
    
    // Hide interaction texts immediately
    this.buildingInteractionText.setAlpha(0);
    this.stockMarketInteractionText.setAlpha(0);
    
    // Get current player position
    const playerPos = player.getPosition();
    
    // Instantly enter building through map manager
    const newPosition = mapManager.enterBuilding(playerPos.x, playerPos.y, buildingType);
    
    // Instantly move player to new position
    if (newPosition) {
      const sprite = player.getSprite();
      sprite.x = newPosition.x;
      sprite.y = newPosition.y;
      
      // Stop following and center camera immediately
      this.scene.cameras.main.stopFollow();
      this.scene.cameras.main.centerOn(newPosition.x, newPosition.y);
      
      // Resume camera follow
      this.scene.cameras.main.startFollow(sprite, true, 0.9, 0.9);
      
      // Clear transition flag after a short delay
      this.scene.time.delayedCall(50, () => {
        this.transitionInProgress = false;
      });
    } else {
      this.transitionInProgress = false;
    }
    
    // Play sound effect if available
    try {
      if (this.scene.sound && this.scene.cache.audio.exists('door-open')) {
        const doorSound = this.scene.sound.add('door-open', { volume: 0.5 });
        doorSound.play();
      }
    } catch (error) {
      console.warn('Could not play door-open sound:', error);    }
    
    // Notify the BankNPCManager, StockMarketManager, and ATMManager that we've entered a building
    const mainScene = this.scene;
    
    // Notify ATM manager about building entry
    if (mainScene.atmManager && typeof mainScene.atmManager.onPlayerEnterBuilding === 'function') {
      mainScene.atmManager.onPlayerEnterBuilding();
    }
    
    if (buildingType === 'bank') {
      // Handle bank building entrance
      if (mainScene.bankNPCManager && typeof mainScene.bankNPCManager.onEnterBuilding === 'function') {
        mainScene.bankNPCManager.onEnterBuilding('bank');
        
        // Only auto-open banking UI if configured to do so (disabled during onboarding)
        if (shouldAutoOpenBankingUI()) {
          // Force the banking UI to be active container
          document.getElementById('banking-ui-container')?.classList.add('active');
          
          // Ensure playerRupees is available for the banking UI
          if (mainScene.playerRupees !== undefined) {
            // Manually trigger the banking UI to open with current bank account data
            this.scene.time.delayedCall(300, () => {
              if (mainScene.bankNPCManager) {
                const bankAccount = mainScene.bankNPCManager.getBankAccountData();
                mainScene.openBankingUI(bankAccount);
              }
            });
          }
        }
      }
    } else if (buildingType === 'stockmarket') {
      // Handle stock market building entrance
      if (mainScene.stockMarketManager && typeof mainScene.stockMarketManager.onEnterBuilding === 'function') {
        mainScene.stockMarketManager.onEnterBuilding('stockmarket');
        
        // Force the stock market UI to be active container
        document.getElementById('stock-market-ui-container')?.classList.add('active');
        
        // Trigger the stock market UI to open
        this.scene.time.delayedCall(300, () => {
          if (mainScene.stockMarketManager) {
            // Fixed: Changed getStocksData to getStockMarketData to match the method name in StockMarketManager
            const stocksData = mainScene.stockMarketManager.getStockMarketData();
            mainScene.openStockMarketUI(stocksData);
          }
        });
      }
    }
  }

  /**
   * Create a rounded background label container with centered text.
   * Returns a GameObjects.Container positioned at (x,y) whose children are a Graphics background and a Text object.
   */
  private createRoundedInteractionLabel(x: number, y: number, message: string): GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const text = this.scene.add.text(0, 0, message, {
      fontFamily: Constants.UI_TEXT_FONT,
      fontSize: Constants.UI_TEXT_SIZE,
      color: Constants.UI_TEXT_COLOR,
      align: 'center',
      padding: Constants.UI_TEXT_PADDING,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    }).setOrigin(0.5, 0.5);

    // Determine padding (support numeric or object padding)
    let pad = 8;
    try {
      if (typeof (Constants as any).UI_TEXT_PADDING === 'number') pad = (Constants as any).UI_TEXT_PADDING;
      else if ((Constants as any).UI_TEXT_PADDING && typeof (Constants as any).UI_TEXT_PADDING.x === 'number') pad = (Constants as any).UI_TEXT_PADDING.x;
    } catch (e) { /* ignore and use default */ }

    const width = text.width + pad * 2;
    const height = text.height + pad * 2;
    const radius = Math.min(12, Math.floor(Math.min(width, height) / 4));

    const bg = this.scene.add.graphics();
    try {
      const colorValue = Phaser.Display.Color.HexStringToColor((Constants as any).UI_TEXT_BACKGROUND || '#000000').color;
      bg.fillStyle(colorValue, 1);
    } catch (e) {
      // fallback to black if parsing fails
      bg.fillStyle(0x000000, 1);
    }
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    container.add([bg, text]);

    return container;
  }

  private exitBuilding(): void {
    const player = this.scene.getPlayer();
    const mapManager = this.scene.mapManager;
    if (!player || !mapManager || this.transitionInProgress) return;
    
    // Set transition in progress
    this.transitionInProgress = true;
    
    // Clean up any active dialogues when exiting buildings
    if (dialogueManager.isDialogueActive()) {
      dialogueManager.forceCloseAll();
      console.log('BuildingManager: Cleaned up dialogues on building exit');
    }
    
    // Exit building through map manager
    const outdoorPosition = mapManager.exitBuilding();
    
    // Instantly move player to last outdoor position
    if (outdoorPosition) {
      const sprite = player.getSprite();
      sprite.x = outdoorPosition.x;
      sprite.y = outdoorPosition.y;
      
      // Stop following and center camera immediately
      this.scene.cameras.main.stopFollow();
      this.scene.cameras.main.centerOn(outdoorPosition.x, outdoorPosition.y);
      
      // Resume camera follow with slight smoothness
      this.scene.cameras.main.startFollow(sprite, true, 0.9, 0.9);
      
      // Clear transition flag after a short delay
      this.scene.time.delayedCall(50, () => {
        this.transitionInProgress = false;
      });
    } else {
      this.transitionInProgress = false;
    }
      // Notify NPCManagers and ATMManager that we're exiting the building
    const mainScene = this.scene;
    if (mainScene.bankNPCManager && typeof mainScene.bankNPCManager.onExitBuilding === 'function') {
      mainScene.bankNPCManager.onExitBuilding();
    }
    if (mainScene.stockMarketManager && typeof mainScene.stockMarketManager.onExitBuilding === 'function') {
      mainScene.stockMarketManager.onExitBuilding();
    }
    if (mainScene.atmManager && typeof mainScene.atmManager.onPlayerExitBuilding === 'function') {
      mainScene.atmManager.onPlayerExitBuilding();
    }
    
    // Play sound effect if available
    try {
      if (this.scene.sound && this.scene.cache.audio.exists('door-close')) {
        const doorSound = this.scene.sound.add('door-close', { volume: 0.5 });
        doorSound.play();
      }
    } catch (error) {
      console.warn('Could not play door-close sound:', error);
    }
  }
  
  // Public getter for building entrance position
  getBuildingEntrancePosition(): { x: number, y: number } {
    return this.buildingEntrance;
  }
  
  // Public getter for stock market entrance position
  getStockMarketEntrancePosition(): { x: number, y: number } {
    return this.stockMarketEntrance;
  }
}