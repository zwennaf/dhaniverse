import { GameObjects } from 'phaser';
import { MainScene } from '../../scenes/MainScene';
import { shouldShowBankOnboarding as configShouldShowBankOnboarding } from '../../../config/onboarding';
import { dialogueManager } from '../../../services/DialogueManager';

interface BankAccount {
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  branchName: string;
  accountType: string;
  openingDate: string;
  balance: number;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export class BankOnboardingManager {
  private scene: MainScene;
  private isOnboardingActive: boolean = false;
  private currentStep: number = 0;
  private currentDialogueStep: number = 0;
  private playerName: string = '';
  private initialDeposit: number = 0;
  private bankAccount: BankAccount | null = null;
  private userDeclined: boolean = false; // Track if user declined account creation
  private hasSpokenBefore: boolean = false; // Track if player has talked to bank manager before
  private conversationStage: 'IDLE' | 'INTRO' | 'ASK_NAME' | 'PROCESSING_1' | 'PROCESSING_2' | 'ACCOUNT_CREATED' | 'FINISHED' = 'IDLE';
  private processingStarted: boolean = false; // guard against duplicate processing advance
  private accountProvisioned: boolean = false; // guard against duplicate account creation
  private introSegments: string[] = [
    "Welcome to Dhaniverse Bank. I'm here to help you establish a secure in‑game account that underpins future financial systems.",
    "Your account lets you hold earnings safely today and later unlock deposits, withdrawals, fixed returns and performance tracking.",
    "We'll capture essentials now and expand capabilities as you advance. Let's register you properly."
  ];
  
  private onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Dhaniverse Bank',
      description: 'Learn about our banking services',
      completed: false
    },
    {
      id: 'features',
      title: 'Banking Features',
      description: 'Explore what you can do with your account',
      completed: false
    },
    {
      id: 'identity',
      title: 'Account Setup',
      description: 'Provide your details for account creation',
      completed: false
    },
    {
      id: 'account_created',
      title: 'Account Created',
      description: 'Your bank account is ready',
      completed: false
    }
  ];

  constructor(scene: MainScene) {
    this.scene = scene;
    // Check database for conversation state on initialization
    this.initializeFromDatabase();
  }

  private async initializeFromDatabase(): Promise<void> {
    try {
      const { bankingApi } = await import('../../../utils/api');
      const response = await bankingApi.getOnboardingStatus();
      
      if (response.success && response.data) {
        // Set conversation state based on database
        this.hasSpokenBefore = response.data.hasCompletedOnboarding || false;
      }
    } catch (error) {
      console.warn('Failed to initialize from database:', error);
      // Default to false if database unavailable
      this.hasSpokenBefore = false;
    }
    
    // Initialize by checking database state immediately to ensure consistency
    this.checkOnboardingStatusFromDatabase().catch(e => {
      console.warn('Failed to sync onboarding status on initialization:', e);
    });
  }

  public startConversation(): void {
    // If a dialogue is active we let DialogueManager advance/close first; do not hard return for returning flow
    if (dialogueManager.isDialogueActive()) {
      // Attempt a graceful close then proceed (only for returning greeting)
      dialogueManager.closeDialogue();
    }

    console.log('🏦 Bank conversation starting...');

    // Check database status first to ensure we have the latest state
    this.checkOnboardingStatusFromDatabase().then(async () => {
      // After database check, determine what to show
      const hasCompleted = await this.hasCompletedBankOnboarding();
      console.log('🏦 Bank onboarding status check result:', hasCompleted);
      
      if (hasCompleted) {
        console.log('🏦 Showing returning greeting for completed user');
        this.showReturningGreeting();
      } else {
        console.log('🏦 Starting intro flow for new/incomplete user');
        // First time (or not completed) -> start new streamlined flow
        this.startIntroFlow();
      }
    }).catch(async () => {
      console.warn('🏦 Database check failed, using fallback logic');
      // If database check fails, fall back to localStorage check
      const hasCompleted = await this.hasCompletedBankOnboarding();
      if (hasCompleted) {
        this.showReturningGreeting();
      } else {
        this.startIntroFlow();
      }
    });
  }

  // ---------- New Streamlined Flow ----------

  private startIntroFlow(): void {
    this.hasSpokenBefore = true;
    // No localStorage - rely on database persistence via progression manager
    this.conversationStage = 'INTRO';
    this.currentDialogueStep = 0;
    this.showIntroSegment();
  }

  private showIntroSegment(): void {
    const idx = this.currentDialogueStep;
    // Safety: if past last, move to name
    if (idx >= this.introSegments.length) {
          this.startAccountForm();
      return;
    }

    dialogueManager.showDialogue({
      text: this.introSegments[idx],
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true,
      currentSlide: idx + 1,
      totalSlides: this.introSegments.length
    }, {
      onAdvance: () => {
        this.currentDialogueStep++;
        if (this.currentDialogueStep < this.introSegments.length) {
          this.showIntroSegment();
        } else {
              this.startAccountForm();
        }
      }
    });
  }

  private startAccountForm(): void {
    this.conversationStage = 'ASK_NAME';
    // Show requirement dialogue first, then open form
    dialogueManager.showDialogue({
      text: "Great! To open your account, I'll need your full name and a minimum deposit of ₹10000 to get started.",
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true
    }, {
      onAdvance: () => {
        // Open the account creation form UI
        window.dispatchEvent(new CustomEvent('open-bank-account-creation-flow'));
        
        // Listen for completion
        const finishHandler = async (e: Event) => {
          window.removeEventListener('bank-account-creation-finished', finishHandler as EventListener);
          await this.handleAccountCreationFinished((e as CustomEvent).detail);
        };
        window.addEventListener('bank-account-creation-finished', finishHandler as EventListener);
      }
    });
  }

  private async handleAccountCreationFinished(eventDetail?: any): Promise<void> {
    // Check if this is an existing user who should open banking UI
    if (eventDetail?.openBankingUI) {
      console.log('🏦 Opening banking UI for existing user');
      
      // Get the existing bank account
      const account = this.getBankAccount();
      if (account) {
        // Open banking UI directly
        const mainScene = this.scene;
        if (mainScene && typeof mainScene.openBankingUI === 'function') {
          mainScene.openBankingUI(account);
        } else {
          window.dispatchEvent(new CustomEvent('openBankingUI', { detail: { account } }));
        }
      }
      
      await this.completeOnboarding();
      return;
    }

    // Get account data from localStorage for new users
    const accountData = localStorage.getItem('dhaniverse_bank_account_details');
    const holderName = localStorage.getItem('dhaniverse_bank_account_holder_name');
    
    if (accountData && holderName) {
      this.playerName = holderName;
      this.bankAccount = JSON.parse(accountData);
      this.conversationStage = 'ACCOUNT_CREATED';
      
      // Show completion dialogue
      dialogueManager.showDialogue({
        text: `Perfect! Your account has been created successfully, ${this.playerName}. Welcome to Dhaniverse Bank!`,
        characterName: 'Bank Manager',
        showBackdrop: true,
        allowSpaceAdvance: true
      }, {
        onAdvance: async () => await this.finishConversation()
      });
    }
  }

  private showProcessingStep1(): void {
    // Processing is now handled entirely in the UI component
    // This method is no longer needed but kept for compatibility
  }

  private showProcessingStep2(): void {
    // Processing is now handled entirely in the UI component  
    // This method is no longer needed but kept for compatibility
  }

  // Removed legacy showAccountCreatedDialogue / launchAccountCreationFlowUI (flow handled inline)

  private async finishConversation(): Promise<void> {
    this.conversationStage = 'FINISHED';
    await this.completeOnboarding();
    dialogueManager.closeDialogue();
  this.notifyConversationEnded();
  }

  public showReturningGreeting(): void {
    const storedName = this.getStoredPlayerName();
    const acc = this.getBankAccount();
    const shortAcc = acc ? acc.accountNumber.slice(-4) : '----';
    dialogueManager.showDialogue({
      text: `Welcome back${storedName ? ' ' + storedName : ''}. Your account${acc ? ' ending •••' + shortAcc : ''} is active. Open the banking dashboard?`,
      characterName: 'Bank Manager',
      showBackdrop: true,
      showOptions: true,
      options: [
        { id: 'open', text: 'Open dashboard' },
        { id: 'later', text: 'Maybe later' }
      ]
    }, {
      onOptionSelect: (optionId: string) => {
        if (optionId === 'open') {
          const mainScene: any = this.scene;
          const account = this.getBankAccount();
          dialogueManager.closeDialogue();
          // Open dashboard via scene helper or fallback event
          if (mainScene && typeof mainScene.openBankingUI === 'function') {
            mainScene.openBankingUI(account);
          } else {
            window.dispatchEvent(new CustomEvent('openBankingUI', { detail: { account } }));
          }
      // Keep interaction available after UI closes (end event still dispatched elsewhere)
      this.notifyConversationEnded();
        } else if (optionId === 'later') {
          dialogueManager.showDialogue({
            text: 'Alright, no issues — come back whenever you feel like it.',
            characterName: 'Bank Manager',
            showBackdrop: true
          }, {
            onAdvance: () => {
              dialogueManager.closeDialogue();
              this.notifyConversationEnded();
            }
          });
        }
      }
    });
  }

  private showContinuePrompt(): void {
    dialogueManager.showDialogue({
      text: "Welcome back! Would you like to continue setting up your bank account, or would you prefer to come back later?",
      characterName: 'Bank Manager',
      showBackdrop: true,
      showOptions: true,
      options: [
        {
          id: 'continue',
          text: 'Yes, let\'s continue',
          action: () => {
            dialogueManager.closeDialogue();
            this.startFullOnboarding();
          }
        },
        {
          id: 'later',
          text: 'Maybe later',
          action: () => {
            dialogueManager.showDialogue({
              text: "No problem! Take your time. I'll be here whenever you're ready.",
              characterName: 'Bank Manager',
              showBackdrop: true
            }, {
              onAdvance: () => {
                dialogueManager.closeDialogue();
              }
            });
          }
        }
      ]
    }, {
      onOptionSelect: (optionId: string) => {
        const option = [
          { id: 'continue', action: () => { dialogueManager.closeDialogue(); this.startFullOnboarding(); }},
          { id: 'later', action: () => { 
            dialogueManager.showDialogue({
              text: "No problem! Take your time. I'll be here whenever you're ready.",
              characterName: 'Bank Manager',
              showBackdrop: true
            }, {
              onAdvance: () => { dialogueManager.closeDialogue(); }
            });
          }}
        ].find(opt => opt.id === optionId);
        option?.action();
      }
    });
  }

  private startFullOnboarding(): void {
    // Mark that conversation has started - database will persist this
    this.hasSpokenBefore = true;

    dialogueManager.showDialogue({
  text: "Welcome to Dhaniverse Bank. This first account provides a secure balance store and unlocks future financial features like deposits, withdrawals, fixed returns and tracking. Proceed with setup now?",
      characterName: 'Bank Manager',
      showBackdrop: true,
      showOptions: true,
      options: [
        {
          id: 'yes',
          text: 'Yes, I\'m ready!',
          action: () => {
            dialogueManager.closeDialogue();
            this.requestPlayerName();
          }
        },
        {
          id: 'no',
          text: 'Not right now',
          action: () => {
            this.userDeclined = true;
            dialogueManager.showDialogue({
              text: "Understood. Return anytime; onboarding will resume from this point.",
              characterName: 'Bank Manager',
              showBackdrop: true
            }, {
              onAdvance: () => {
                dialogueManager.closeDialogue();
              }
            });
          }
        }
      ]
    }, {
      onOptionSelect: (optionId: string) => {
        const option = [
          { id: 'yes', action: () => { dialogueManager.closeDialogue(); this.requestPlayerName(); }},
          { id: 'no', action: () => { 
            this.userDeclined = true;
            dialogueManager.showDialogue({
              text: "Understood. Return anytime; onboarding will resume from this point.",
              characterName: 'Bank Manager',
              showBackdrop: true
            }, {
              onAdvance: () => { dialogueManager.closeDialogue(); }
            });
          }}
        ].find(opt => opt.id === optionId);
        option?.action();
      }
    });
  }

  private requestPlayerName(): void { this.startAccountForm(); }

  private showAccountCreated(): void { /* deprecated */ }

  public async shouldShowOnboarding(): Promise<boolean> {
    // Check configuration first - if disabled globally, don't show onboarding
    if (!configShouldShowBankOnboarding()) {
      console.log("Bank onboarding disabled via config");
      return false;
    }
    
    // For new players who haven't met Maya yet, always show onboarding when they enter bank
    try {
      const { progressionManager } = await import('../../../services/ProgressionManager');
      
      // Wait for initialization if needed (use async version)
      const progressState = await progressionManager.getStateAsync();
      
      // If player is completely new (hasn't met Maya), show onboarding
      if (progressState.onboardingStep === 'not_started' && !progressState.hasMetMaya) {
        console.log("Bank onboarding: New player detected (hasn't met Maya), showing onboarding");
        return true;
      }
    } catch (error) {
      console.warn("Failed to check progression state:", error);
    }
    
    // Check if onboarding is completed based on database state
    const bankOnboardingCompleted = await this.hasCompletedBankOnboarding();
    
    console.log("Bank onboarding check:", {
      bankOnboardingCompleted,
      shouldShow: !bankOnboardingCompleted
    });
    
    // Show onboarding if it hasn't been completed yet
    return !bankOnboardingCompleted;
  }

  private async checkOnboardingStatusFromDatabase(): Promise<void> {
    try {
      const { bankingApi } = await import('../../../utils/api');
      const response = await bankingApi.getOnboardingStatus();
      
      if (response.success && response.data) {
        const { hasCompletedOnboarding, hasBankAccount } = response.data;
        
        console.log("Bank onboarding status from database:", {
          hasCompletedOnboarding,
          hasBankAccount
        });
        
        // Sync ProgressionManager with database state
        if (hasCompletedOnboarding) {
          try {
            const { progressionManager } = await import('../../../services/ProgressionManager');
            await progressionManager.markBankOnboardingCompleted();
            console.log('✅ ProgressionManager synchronized with database');
          } catch (e) {
            console.warn('Failed to sync progression manager with database:', e);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to check bank onboarding status from database:", error);
    }
  }

  public isOnboardingActiveNow(): boolean {
    return this.isOnboardingActive;
  }

  private async hasCompletedBankOnboarding(): Promise<boolean> {
    // Always check database first - it's the source of truth
    try {
      const { bankingApi } = await import('../../../utils/api');
      const response = await bankingApi.getOnboardingStatus();
      
      if (response.success && response.data) {
        const { hasCompletedOnboarding, hasBankAccount, bankAccount } = response.data;
        
        // Check if we have a properly created bank account with valid account holder name
        const hasValidBankAccount = hasBankAccount && bankAccount?.accountHolder && 
                                   bankAccount.accountHolder.trim().length >= 2;
        
        const balance = bankAccount?.balance;
        
        // Only consider onboarding complete if:
        // 1. Explicitly marked as completed OR
        // 2. Has a valid bank account with proper account holder name OR  
        // 3. Has a non-zero balance (indicating they've used the account)
        const derivedCompletion = !!(hasCompletedOnboarding || hasValidBankAccount || (typeof balance === 'number' && balance > 0));
        
        if (!hasCompletedOnboarding && derivedCompletion) {
          console.log('[BankOnboarding] Treating existing valid account/balance as completed onboarding');
        }
        
        // If they have a bank account but it's invalid (e.g., missing account holder name),
        // don't consider onboarding complete - they need to redo it properly
        if (hasBankAccount && !hasValidBankAccount && !hasCompletedOnboarding) {
          console.log('[BankOnboarding] Found invalid bank account (missing/invalid account holder), requiring onboarding');
          return false;
        }
        
        return derivedCompletion;
      }
    } catch (error) {
      console.warn('Failed to check database onboarding status:', error);
    }
    
    // Default to false if database unavailable - better to show onboarding than skip it
    return false;
  }

  public startOnboarding(): void {
    if (this.isOnboardingActive) {
      console.log('🏦 Conversation already active, ignoring');
      return;
    }
    
    console.log('🏦 Starting bank conversation...');
    this.isOnboardingActive = true;
    
    // Remove Maya tracker when bank conversation starts
    this.removeMayaTracker();
    
    // Start conversation based on player's history
    this.startConversation();
  }

  private removeMayaTracker(): void {
    try {
      // Dispatch event to remove Maya tracker
      window.dispatchEvent(new CustomEvent('remove-maya-tracker'));
      console.log('Maya tracker removal requested');
    } catch (error) {
      console.warn('Failed to remove Maya tracker:', error);
    }
  }

  private async completeOnboarding(): Promise<void> {
    console.log('🏦 Completing onboarding...');
    this.isOnboardingActive = false;
    
    // No localStorage - database is the source of truth
    // ProgressionManager will handle persistence to database
    
    // Save progress to backend (in a real app)
    this.saveBankOnboardingProgress();
    
    // Enable normal banking interactions
    this.enableNormalBanking();
    
    // Update progression manager immediately (async import to ensure immediate update)
    (async () => {
      try { 
        const { progressionManager } = await import('../../../services/ProgressionManager'); 
        await progressionManager.markBankOnboardingCompleted(); 
        console.log('[Progression] Bank onboarding completion persisted immediately:', progressionManager.getState());
      } catch(e) { 
        console.warn('Could not mark bank onboarding completion', e);
      }
    })();
    
    // Dispatch completion event AFTER progression state is updated
    window.dispatchEvent(new CustomEvent('bank-onboarding-completed'));
    
    console.log('🏦 Onboarding completed successfully');
  }

  private endConversation(): void {
    console.log('🏦 Ending conversation...');
    this.isOnboardingActive = false;
    
    // Close any active dialogue
    dialogueManager.closeDialogue();
    
    // Notify the BankNPCManager that the conversation should end
    window.dispatchEvent(new CustomEvent('bank-conversation-ended'));
  }

  private createBankAccount(): void {
    // Generate unique account details
    const accountNumber = this.generateAccountNumber();
    const ifscCode = 'DHANI0001234';
    
    this.bankAccount = {
      accountNumber,
      ifscCode,
      accountHolder: this.playerName,
      branchName: 'Dhaniverse Central Branch',
      accountType: 'Savings Account',
      openingDate: new Date().toISOString(),
      balance: 0
    };

    // No localStorage - account creation will be handled by database
    console.log('Bank account created:', this.bankAccount);
    // Apply initial deposit if provided and valid
    if (this.initialDeposit && this.initialDeposit > 0) {
      this.bankAccount.balance = this.initialDeposit;
    }
  }

  private generateAccountNumber(): string {
    // Generate a unique 12-digit account number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return (timestamp.slice(-8) + random).slice(0, 12);
  }

  private saveBankOnboardingProgress(): void {
    // TODO: Save to backend when backend integration is ready
    const progress = {
      completed: true,
      completedAt: new Date().toISOString(),
      bankAccount: this.bankAccount,
      steps: this.onboardingSteps
    };
    
    // No localStorage - progress saved to database via API
    console.log('Bank onboarding progress saved:', progress);
  }

  private enableNormalBanking(): void {
    // Re-enable normal banking interactions
    const mainScene = this.scene as any;
    if (mainScene.bankNPCManager) {
      mainScene.bankNPCManager.setOnboardingMode(false);
    }
  }

  public isInOnboarding(): boolean {
    return this.isOnboardingActive;
  }

  public getCurrentStep(): OnboardingStep | null {
    return this.onboardingSteps[this.currentStep] || null;
  }

  public getBankAccount(): BankAccount | null {
    if (this.bankAccount) return this.bankAccount;
    
    // Try to load from localStorage
    const saved = localStorage.getItem('dhaniverse_bank_account_details');
    if (saved) {
      try {
        this.bankAccount = JSON.parse(saved);
        return this.bankAccount;
      } catch (error) {
        console.error('Failed to parse saved bank account:', error);
      }
    }
    
    return null;
  }

  public reset(): void {
    // For testing purposes - reset onboarding
    this.isOnboardingActive = false;
    this.currentStep = 0;
    this.currentDialogueStep = 0;
    this.playerName = '';
    this.bankAccount = null;
    this.hasSpokenBefore = false;
    
    localStorage.removeItem('dhaniverse_bank_onboarding_completed');
    localStorage.removeItem('dhaniverse_bank_account_details');
    localStorage.removeItem('dhaniverse_bank_onboarding_progress');
    localStorage.removeItem('dhaniverse_bank_conversation_started');
  localStorage.removeItem('dhaniverse_bank_account_holder_name');
    
    // Reset step completion
    this.onboardingSteps.forEach(step => step.completed = false);
  }

  public getDebugState(): any {
    return {
      isOnboardingActive: this.isOnboardingActive,
      currentStep: this.currentStep,
      playerName: this.playerName,
      conversationStage: this.conversationStage,
      hasCompletedBankOnboarding: this.hasCompletedBankOnboarding(),
      shouldShowOnboarding: this.shouldShowOnboarding(),
      hasSpokenBefore: this.hasSpokenBefore,
      localStorage: {
        bankOnboardingCompleted: localStorage.getItem('dhaniverse_bank_onboarding_completed'),
        bankAccountDetails: localStorage.getItem('dhaniverse_bank_account_details'),
        bankOnboardingProgress: localStorage.getItem('dhaniverse_bank_onboarding_progress'),
        conversationStarted: localStorage.getItem('dhaniverse_bank_conversation_started'),
        storedHolderName: localStorage.getItem('dhaniverse_bank_account_holder_name')
      }
    };
  }

  private getStoredPlayerName(): string | null {
    if (this.playerName) return this.playerName;
    const stored = localStorage.getItem('dhaniverse_bank_account_holder_name');
    if (stored) this.playerName = stored;
    return stored;
  }

  private notifyConversationEnded(): void {
    try {
      window.dispatchEvent(new CustomEvent('bank-conversation-ended'));
    } catch {}
  }
}
