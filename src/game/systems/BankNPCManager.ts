import { GameObjects, Input } from 'phaser';
import { MainGameScene } from '../scenes/MainScene.ts';

interface NPCSprite extends GameObjects.Sprite {
  nameText?: GameObjects.Text;
}

interface BankAccount {
  balance: number;
  created: boolean;
}

export class BankNPCManager {
  private scene: MainGameScene;
  private banker: NPCSprite;
  private dialogContainer: GameObjects.Container | null = null;
  private interactionKey: Input.Keyboard.Key | null = null;
  private readonly interactionDistance: number = 150;
  private interactionText: GameObjects.Text;
  private isPlayerNearBanker: boolean = false;
  private activeDialog: boolean = false;
  private speechBubble: GameObjects.Sprite | null = null;
  private bankAccount: BankAccount = { balance: 0, created: false };
  private transactionAmount: number = 1000; // Default transaction amount
  private bankCreationStep: number = 0;
  
  // UI elements
  private dialogBox: GameObjects.Rectangle | null = null;
  private dialogText: GameObjects.Text | null = null;
  private depositButton: GameObjects.Container | null = null;
  private withdrawButton: GameObjects.Container | null = null;
  private createAccountButton: GameObjects.Container | null = null;
  private closeButton: GameObjects.Container | null = null;
  private amountSelector: GameObjects.Container | null = null;
  
  // Transaction animation elements
  private transactionAnimation: GameObjects.Container | null = null;
  
  constructor(scene: MainGameScene) {
    this.scene = scene;
    
    // Setup interaction key with null check
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey('E');
    }
    
    // Create banker at fixed center position in world coordinates
    // This is where the banker will appear in the bank
    const bankerX = 400; // Center of bank.gif
    const bankerY = 300; // Center of bank.gif
    
    this.banker = scene.add.sprite(bankerX, bankerY, 'character') as NPCSprite;
    this.banker.setScale(5);
    this.banker.anims.play('idle-down');
    this.banker.setOrigin(0.5);
    
    // Critical fix: Set correct depth and scroll factor
    this.banker.setDepth(100); // Higher depth to ensure visibility
    this.banker.setScrollFactor(1); // Fixed in world, not to camera
    
    // Add banker name text
    const bankerNameText = scene.add.text(this.banker.x, this.banker.y - 50, "Bank Assistant", {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffff00',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setScrollFactor(1).setDepth(100);
    
    // Add interaction text (initially hidden)
    this.interactionText = scene.add.text(this.banker.x, this.banker.y - 80, "Press E to interact", {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(1).setDepth(100);
    
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
    
    // Load bank account data from localStorage if available
    this.loadBankData();
    
    // Setup speech bubble animations
    this.setupSpeechBubbleAnimations();
    
    // Debug - print banker position
    console.log("Bank NPC created at position:", bankerX, bankerY);
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
  
  update(): void {
    // Only update when inside the bank
    if (!this.scene.mapManager.isPlayerInBuilding()) {
      return;
    }
    
    // Make sure banker is visible when inside building
    this.toggleVisibility(true);
    
    const player = this.scene.getPlayer();
    if (!player) return;

    // If dialog is already open, don't show interaction prompt
    if (this.activeDialog) {
      this.interactionText.setAlpha(0);
      return;
    }

    // Calculate distance between player and banker using world positions
    const playerPos = player.getPosition();
    const bankerPos = { x: this.banker.x, y: this.banker.y };
    
    // Calculate direct world distance without screen conversion
    const dx = playerPos.x - bankerPos.x;
    const dy = playerPos.y - bankerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if player is within interaction distance
    const wasNearBanker = this.isPlayerNearBanker;
    this.isPlayerNearBanker = distance <= this.interactionDistance;
    
    // Only react to changes in proximity
    if (this.isPlayerNearBanker !== wasNearBanker) {
      if (this.isPlayerNearBanker) {
        // Player just entered interaction zone - show text with fade in
        this.scene.tweens.add({
          targets: this.interactionText,
          alpha: 1,
          duration: 200,
          ease: 'Power1'
        });
      } else {
        // Player just left interaction zone - hide text with fade out
        this.scene.tweens.add({
          targets: this.interactionText,
          alpha: 0,
          duration: 200,
          ease: 'Power1'
        });
      }
    }
    
    // Update interaction text position to always be above banker
    this.updateInteractionTextPosition();

    // Check for interaction key press when near banker
    if (this.isPlayerNearBanker && this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey) && !this.activeDialog) {
      this.showBankDialog();
    }
  }
  
  // Add helper method to update text position
  private updateInteractionTextPosition(): void {
    if (this.interactionText) {
      this.interactionText.x = this.banker.x;
      this.interactionText.y = this.banker.y - 80;
    }
  }
  
  // Toggle visibility of the banker and related elements
  toggleVisibility(visible: boolean): void {
    if (!this.banker) return;
    
    this.banker.setVisible(visible);
    if (this.banker.nameText) {
      this.banker.nameText.setVisible(visible);
    }
    
    // Hide interaction text when banker is hidden
    if (!visible) {
      this.interactionText.setAlpha(0);
    }
    
    // Close any active dialog when hiding
    if (!visible && this.activeDialog) {
      this.closeDialog();
    }
  }
  
  private showBankDialog(): void {
    // Mark dialog as active
    this.activeDialog = true;
    
    // Create a dialog box - using camera coordinates for UI elements
    this.dialogBox = this.scene.add.rectangle(
      this.scene.cameras.main.centerX, 
      this.scene.cameras.main.height - 180,
      this.scene.cameras.main.width * 0.8,
      220,
      0x000000,
      0.9
    );
    this.dialogBox.setScrollFactor(0).setDepth(2000).setStrokeStyle(2, 0xFFD700);
    
    // Initial dialog text
    let dialogMessage = '';
    
    if (!this.bankAccount.created) {
      dialogMessage = "Welcome to the Royal Bank of Dhaniverse!\nWould you like to open an account with us?";
      this.setupCreateAccountDialog();
    } else {
      dialogMessage = `Welcome back to Royal Bank of Dhaniverse!\nYour current balance is ₹${this.bankAccount.balance}.\nHow can I help you today?`;
      this.setupBankingDialog();
    }
    
    // Add dialog text with word wrap
    this.dialogText = this.scene.add.text(
      this.dialogBox.x, 
      this.dialogBox.y - 60, 
      dialogMessage,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: this.dialogBox.width - 60 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    
    // Create a container for dialog elements
    this.dialogContainer = this.scene.add.container(0, 0);
    this.dialogContainer.add([this.dialogBox, this.dialogText]);
    
    // Create speech bubble animation - using world coordinates for the speech bubble
    this.speechBubble = this.scene.add.sprite(
      this.banker.x,
      this.banker.y - 100,
      'speech_bubble_grey'
    );
    this.speechBubble.setScale(2.5);
    this.speechBubble.setDepth(2002);
    this.speechBubble.setScrollFactor(1); // Match the banker's scroll factor
    
    // Play the opening animation
    this.speechBubble.play('speech-bubble-open');
    
    // Setup keyboard listeners
    this.scene.input.keyboard?.once('keydown-ESC', () => this.closeDialog());
  }
  
  private setupCreateAccountDialog(): void {
    // Create account button
    const createAccountBg = this.scene.add.rectangle(
      this.dialogBox!.x,
      this.dialogBox!.y + 30,
      200,
      40,
      0x4CAF50,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const createAccountText = this.scene.add.text(
      createAccountBg.x,
      createAccountBg.y,
      "Create Account",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    this.createAccountButton = this.scene.add.container(0, 0);
    this.createAccountButton.add([createAccountBg, createAccountText]);
    this.createAccountButton.setScrollFactor(0).setDepth(2001);
    this.dialogContainer!.add(this.createAccountButton);
    
    // Make button interactive
    createAccountBg.setInteractive({ useHandCursor: true });
    createAccountBg.on('pointerover', () => {
      createAccountBg.setFillStyle(0x45a049);
    });
    createAccountBg.on('pointerout', () => {
      createAccountBg.setFillStyle(0x4CAF50);
    });
    createAccountBg.on('pointerdown', () => {
      this.createBankAccount();
    });
    
    // Cancel button
    const cancelBg = this.scene.add.rectangle(
      this.dialogBox!.x,
      this.dialogBox!.y + 80,
      200,
      40,
      0xf44336,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const cancelText = this.scene.add.text(
      cancelBg.x,
      cancelBg.y,
      "No Thanks",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    this.closeButton = this.scene.add.container(0, 0);
    this.closeButton.add([cancelBg, cancelText]);
    this.closeButton.setScrollFactor(0).setDepth(2001);
    this.dialogContainer!.add(this.closeButton);
    
    // Make button interactive
    cancelBg.setInteractive({ useHandCursor: true });
    cancelBg.on('pointerover', () => {
      cancelBg.setFillStyle(0xd32f2f);
    });
    cancelBg.on('pointerout', () => {
      cancelBg.setFillStyle(0xf44336);
    });
    cancelBg.on('pointerdown', () => {
      this.closeDialog();
    });
  }
  
  private setupBankingDialog(): void {
    // Create amount selector
    this.setupAmountSelector();
    
    // Deposit button
    const depositBg = this.scene.add.rectangle(
      this.dialogBox!.x - 120,
      this.dialogBox!.y + 80,
      200,
      40,
      0x4CAF50,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const depositText = this.scene.add.text(
      depositBg.x,
      depositBg.y,
      "Deposit",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    this.depositButton = this.scene.add.container(0, 0);
    this.depositButton.add([depositBg, depositText]);
    this.depositButton.setScrollFactor(0).setDepth(2001);
    this.dialogContainer!.add(this.depositButton);
    
    // Make button interactive
    depositBg.setInteractive({ useHandCursor: true });
    depositBg.on('pointerover', () => {
      depositBg.setFillStyle(0x45a049);
    });
    depositBg.on('pointerout', () => {
      depositBg.setFillStyle(0x4CAF50);
    });
    depositBg.on('pointerdown', () => {
      this.depositMoney();
    });
    
    // Withdraw button
    const withdrawBg = this.scene.add.rectangle(
      this.dialogBox!.x + 120,
      this.dialogBox!.y + 80,
      200,
      40,
      0x2196F3,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const withdrawText = this.scene.add.text(
      withdrawBg.x,
      withdrawBg.y,
      "Withdraw",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    this.withdrawButton = this.scene.add.container(0, 0);
    this.withdrawButton.add([withdrawBg, withdrawText]);
    this.withdrawButton.setScrollFactor(0).setDepth(2001);
    this.dialogContainer!.add(this.withdrawButton);
    
    // Make button interactive
    withdrawBg.setInteractive({ useHandCursor: true });
    withdrawBg.on('pointerover', () => {
      withdrawBg.setFillStyle(0x1976D2);
    });
    withdrawBg.on('pointerout', () => {
      withdrawBg.setFillStyle(0x2196F3);
    });
    withdrawBg.on('pointerdown', () => {
      this.withdrawMoney();
    });
    
    // Close button
    const closeBg = this.scene.add.rectangle(
      this.dialogBox!.x,
      this.dialogBox!.y + 130,
      200,
      40,
      0xf44336,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const closeText = this.scene.add.text(
      closeBg.x,
      closeBg.y,
      "Close",
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    this.closeButton = this.scene.add.container(0, 0);
    this.closeButton.add([closeBg, closeText]);
    this.closeButton.setScrollFactor(0).setDepth(2001);
    this.dialogContainer!.add(this.closeButton);
    
    // Make button interactive
    closeBg.setInteractive({ useHandCursor: true });
    closeBg.on('pointerover', () => {
      closeBg.setFillStyle(0xd32f2f);
    });
    closeBg.on('pointerout', () => {
      closeBg.setFillStyle(0xf44336);
    });
    closeBg.on('pointerdown', () => {
      this.closeDialog();
    });
  }
  
  private setupAmountSelector(): void {
    this.amountSelector = this.scene.add.container(0, 0);
    
    // Amount background
    const amountBg = this.scene.add.rectangle(
      this.dialogBox!.x,
      this.dialogBox!.y + 20,
      300,
      40,
      0x333333,
      1
    ).setScrollFactor(0).setDepth(2001).setStrokeStyle(1, 0xffffff);
    
    // Amount text
    const amountText = this.scene.add.text(
      amountBg.x,
      amountBg.y,
      `Amount: ₹${this.transactionAmount}`,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    // Decrease button
    const decreaseBg = this.scene.add.rectangle(
      amountBg.x - 170,
      amountBg.y,
      40,
      40,
      0x666666,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const decreaseText = this.scene.add.text(
      decreaseBg.x,
      decreaseBg.y,
      "-",
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    // Increase button
    const increaseBg = this.scene.add.rectangle(
      amountBg.x + 170,
      amountBg.y,
      40,
      40,
      0x666666,
      1
    ).setScrollFactor(0).setDepth(2001);
    
    const increaseText = this.scene.add.text(
      increaseBg.x,
      increaseBg.y,
      "+",
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    
    // Add to container
    this.amountSelector.add([amountBg, amountText, decreaseBg, decreaseText, increaseBg, increaseText]);
    this.dialogContainer!.add(this.amountSelector);
    
    // Make buttons interactive
    decreaseBg.setInteractive({ useHandCursor: true });
    decreaseBg.on('pointerdown', () => {
      this.changeTransactionAmount(-500);
      amountText.setText(`Amount: ₹${this.transactionAmount}`);
    });
    
    increaseBg.setInteractive({ useHandCursor: true });
    increaseBg.on('pointerdown', () => {
      this.changeTransactionAmount(500);
      amountText.setText(`Amount: ₹${this.transactionAmount}`);
    });
  }
  
  private changeTransactionAmount(change: number): void {
    this.transactionAmount += change;
    
    // Ensure minimum transaction amount
    if (this.transactionAmount < 500) {
      this.transactionAmount = 500;
    }
    
    // Ensure maximum transaction amount
    if (this.transactionAmount > 10000) {
      this.transactionAmount = 10000;
    }
  }
  
  private createBankAccount(): void {
    if (this.bankCreationStep === 0) {
      // Update dialog text
      if (this.dialogText) {
        this.dialogText.setText("Excellent choice! Opening an account with us is free.\nYour new account has been created with 0 rupees.");
      }
      
      // Update button text
      if (this.createAccountButton) {
        const buttonText = this.createAccountButton.getAt(1) as GameObjects.Text;
        buttonText.setText("Continue");
      }
      
      // Set up the account
      this.bankAccount.created = true;
      this.bankCreationStep = 1;
      this.saveBankData();
      
      // Update the banker animation to appear happier
      this.banker.anims.play('idle-up');
    } else {
      // Show banking dialog
      this.closeDialog();
      this.showBankDialog();
    }
  }
  
  private depositMoney(): void {
    // Get player's current rupees
    const playerRupees = this.scene.getRupees();
    
    // Check if player has enough rupees
    if (playerRupees < this.transactionAmount) {
      // Update dialog text to indicate insufficient funds
      if (this.dialogText) {
        this.dialogText.setText(`You don't have enough rupees!\nYou only have ₹${playerRupees}.`);
      }
      return;
    }
    
    // Process the deposit
    // 1. Deduct from player
    this.scene.updateRupees(-this.transactionAmount);
    
    // 2. Add to bank account
    this.bankAccount.balance += this.transactionAmount;
    this.saveBankData();
    
    // 3. Update dialog text
    if (this.dialogText) {
      this.dialogText.setText(`Deposit successful!\nYou deposited ₹${this.transactionAmount}.\nYour new balance is ₹${this.bankAccount.balance}.`);
    }
    
    // 4. Play deposit animation
    this.playTransactionAnimation('deposit');
  }
  
  private withdrawMoney(): void {
    // Check if bank account has enough rupees
    if (this.bankAccount.balance < this.transactionAmount) {
      // Update dialog text to indicate insufficient funds
      if (this.dialogText) {
        this.dialogText.setText(`You don't have enough rupees in your account!\nYour balance is only ₹${this.bankAccount.balance}.`);
      }
      return;
    }
    
    // Process the withdrawal
    // 1. Deduct from bank account
    this.bankAccount.balance -= this.transactionAmount;
    this.saveBankData();
    
    // 2. Add to player
    this.scene.updateRupees(this.transactionAmount);
    
    // 3. Update dialog text
    if (this.dialogText) {
      this.dialogText.setText(`Withdrawal successful!\nYou withdrew ₹${this.transactionAmount}.\nYour new balance is ₹${this.bankAccount.balance}.`);
    }
    
    // 4. Play withdrawal animation
    this.playTransactionAnimation('withdraw');
  }
  
  private playTransactionAnimation(type: 'deposit' | 'withdraw'): void {
    // Clean up any existing animation
    if (this.transactionAnimation) {
      this.transactionAnimation.destroy();
      this.transactionAnimation = null;
    }
    
    // Create container for animation elements
    this.transactionAnimation = this.scene.add.container(0, 0);
    this.transactionAnimation.setScrollFactor(0).setDepth(3000);
    
    // Create rupee icon
    const rupeeIcon = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      '₹',
      {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    rupeeIcon.setOrigin(0.5).setScrollFactor(0);
    
    // Create amount text
    const amountText = this.scene.add.text(
      this.scene.cameras.main.centerX + 20,
      this.scene.cameras.main.centerY,
      `${this.transactionAmount}`,
      {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    amountText.setOrigin(0, 0.5).setScrollFactor(0);
    
    // Add to animation container
    this.transactionAnimation.add([rupeeIcon, amountText]);
    
    // Define start and end positions
    let startY = 0;
    let endY = 0;
    let startScale = 1;
    let endScale = 2;
    let startAlpha = 1;
    let endAlpha = 0;
    
    if (type === 'deposit') {
      // Animation moves up from player to the "bank"
      startY = this.scene.cameras.main.height - 100;
      endY = 100;
      
      // Set green color for deposit
      amountText.setColor('#4CAF50');
    } else {
      // Animation moves down from "bank" to player
      startY = 100;
      endY = this.scene.cameras.main.height - 100;
      
      // Set blue color for withdraw
      amountText.setColor('#2196F3');
    }
    
    // Position the animation elements
    this.transactionAnimation.setPosition(0, startY);
    
    // Create the animation
    this.scene.tweens.add({
      targets: this.transactionAnimation,
      y: endY,
      scaleX: endScale,
      scaleY: endScale,
      alpha: endAlpha,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        if (this.transactionAnimation) {
          this.transactionAnimation.destroy();
          this.transactionAnimation = null;
        }
      }
    });
    
    // Play sound effect
    try {
      const soundKey = type === 'deposit' ? 'coin-deposit' : 'coin-withdraw';
      if (this.scene.sound && this.scene.cache.audio.exists(soundKey)) {
        const sound = this.scene.sound.add(soundKey, { volume: 0.5 });
        sound.play();
      }
    } catch (error) {
      console.warn(`Could not play ${type} sound:`, error);
    }
  }
  
  private closeDialog(): void {
    if (!this.dialogContainer) return;
    
    // Play the closing animation if speech bubble exists
    if (this.speechBubble) {
      this.speechBubble.play('speech-bubble-close');
      
      // Wait for the closing animation to complete
      this.speechBubble.once('animationcomplete', () => {
        if (this.speechBubble) {
          this.speechBubble.destroy();
          this.speechBubble = null;
        }
      });
    }
    
    // Clean up dialog
    this.scene.tweens.add({
      targets: this.dialogContainer,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.dialogContainer) {
          this.dialogContainer.destroy();
          this.dialogContainer = null;
          
          // Reset references to dialog elements
          this.dialogBox = null;
          this.dialogText = null;
          this.depositButton = null;
          this.withdrawButton = null;
          this.createAccountButton = null;
          this.closeButton = null;
          this.amountSelector = null;
        }
        
        // Reset flags
        this.activeDialog = false;
        this.bankCreationStep = 0;
      }
    });
    
    // Clean up any transaction animation
    if (this.transactionAnimation) {
      this.transactionAnimation.destroy();
      this.transactionAnimation = null;
    }
  }
  
  private saveBankData(): void {
    try {
      localStorage.setItem('dhaniverse_bank_account', JSON.stringify(this.bankAccount));
    } catch (error) {
      console.error("Failed to save bank data:", error);
    }
  }
  
  private loadBankData(): void {
    try {
      const savedData = localStorage.getItem('dhaniverse_bank_account');
      if (savedData) {
        this.bankAccount = JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Failed to load bank data:", error);
    }
  }
  
  // Called when player exits the building
  onExitBuilding(): void {
    this.toggleVisibility(false);
    this.closeDialog();
  }
}