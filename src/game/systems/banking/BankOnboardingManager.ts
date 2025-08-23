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
  private bankAccount: BankAccount | null = null;
  private userDeclined: boolean = false; // Track if user declined account creation
  private hasSpokenBefore: boolean = false; // Track if player has talked to bank manager before
  private conversationStage: 'IDLE' | 'INTRO' | 'ASK_NAME' | 'PROCESSING_1' | 'PROCESSING_2' | 'ACCOUNT_CREATED' | 'FINISHED' = 'IDLE';
  private introSegments: string[] = [
    "Hey there! Welcome to Dhaniverse Bank. I'm the manager who helps new adventurers get their first financial foothold.",
    "Here you'll safely store earnings, earn interest, and later unlock deposits, withdrawals, fixed returns and real‑time tracking.",
    "We keep things simple now and unlock depth as you progress. Let's set up your account so future systems can recognize you."
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
    // Check if player has spoken before
    this.hasSpokenBefore = localStorage.getItem('dhaniverse_bank_conversation_started') === 'true';
  }

  public startConversation(): void {
    // Prevent double start
    if (dialogueManager.isDialogueActive()) return;

    // Completed previously – lightweight return greeting
    if (this.hasCompletedBankOnboarding()) {
      this.showReturningGreeting();
      return;
    }

    // First time (or not completed) -> start new streamlined flow
    this.startIntroFlow();
  }

  // ---------- New Streamlined Flow ----------

  private startIntroFlow(): void {
    this.hasSpokenBefore = true;
    localStorage.setItem('dhaniverse_bank_conversation_started', 'true');
    this.conversationStage = 'INTRO';
    this.currentDialogueStep = 0;
    this.showIntroSegment();
  }

  private showIntroSegment(): void {
    const idx = this.currentDialogueStep;
    // Safety: if past last, move to name
    if (idx >= this.introSegments.length) {
      this.promptForName();
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
          this.promptForName();
        }
      }
    });
  }

  private promptForName(): void {
    this.conversationStage = 'ASK_NAME';
    dialogueManager.showDialogue({
      text: "First things first—I need your full name exactly as you'd like it on the account. Type it below and press Enter to continue.",
      characterName: 'Bank Manager',
      showBackdrop: true,
      requiresTextInput: true,
      textInputPlaceholder: 'Enter your full name'
    }, {
      onTextInput: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
          // Re-prompt
          this.promptForName();
          return;
        }
        this.playerName = trimmed;
        localStorage.setItem('dhaniverse_bank_account_holder_name', this.playerName);
        this.showProcessingStep1();
      }
    });
  }

  private showProcessingStep1(): void {
    this.conversationStage = 'PROCESSING_1';
    dialogueManager.showDialogue({
      text: `Alright ${this.playerName}, let me pull up the onboarding terminal... *taps keyboard* Accessing ledger... verifying network sync...`,
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true
    }, {
      onAdvance: () => this.showProcessingStep2()
    });
  }

  private showProcessingStep2(): void {
    this.conversationStage = 'PROCESSING_2';
    dialogueManager.showDialogue({
      text: "Hmm... one second... umm wait a second... compiling KYC... hashing identity... generating secure wallet credentials... almost there...",
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true
    }, {
      onAdvance: () => {
        this.createBankAccount();
        this.showAccountCreatedDialogue();
      }
    });
  }

  private showAccountCreatedDialogue(): void {
    this.conversationStage = 'ACCOUNT_CREATED';
    const acc = this.bankAccount!;
    const masked = acc.accountNumber.slice(0, 4) + ' **** ' + acc.accountNumber.slice(-4);
    dialogueManager.showDialogue({
      text: `All done! Your account is officially created. Details below:\n\nAccount Holder: ${this.playerName}\nAccount No: ${acc.accountNumber}\nIFSC: ${acc.ifscCode}\nBranch: ${acc.branchName}\nType: ${acc.accountType}\n\nUse this for deposits, earnings & future features. Press SPACE to continue.`,
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true
    }, {
      onAdvance: () => this.finishConversation()
    });
  }

  private finishConversation(): void {
    this.conversationStage = 'FINISHED';
    this.completeOnboarding();
    dialogueManager.closeDialogue();
  this.notifyConversationEnded();
  }

  private showReturningGreeting(): void {
    const storedName = this.getStoredPlayerName();
    const acc = this.getBankAccount();
    const shortAcc = acc ? acc.accountNumber.slice(-4) : '----';
    dialogueManager.showDialogue({
      text: `Welcome back${storedName ? ' ' + storedName : ''}! Your account${acc ? ' ending with ' + shortAcc : ''} is active. Need balance info or future services? I'm here anytime.`,
      characterName: 'Bank Manager',
      showBackdrop: true,
      allowSpaceAdvance: true
    }, {
      onAdvance: () => { 
        dialogueManager.closeDialogue(); 
        this.notifyConversationEnded();
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
    // Mark that conversation has started
    localStorage.setItem('dhaniverse_bank_conversation_started', 'true');
    this.hasSpokenBefore = true;

    dialogueManager.showDialogue({
      text: "Welcome to Dhaniverse Bank! I'm here to help you open your first account. We offer savings accounts with interest, secure deposits & withdrawals, fixed deposits for higher returns, and real-time transaction tracking. Ready to get started with your account?",
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
              text: "No worries! Come back anytime when you're ready. I'll be here to help you start your financial journey!",
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
              text: "No worries! Come back anytime when you're ready. I'll be here to help you start your financial journey!",
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

  private requestPlayerName(): void {
  // Legacy path not used anymore in new streamlined flow
  this.promptForName();
  }

  private showAccountCreated(): void {
  // Legacy path replaced by showAccountCreatedDialogue
  this.showAccountCreatedDialogue();
  }

  public shouldShowOnboarding(): boolean {
    // Check configuration first - if disabled globally, don't show onboarding
    if (!configShouldShowBankOnboarding()) {
      console.log("Bank onboarding disabled via config");
      return false;
    }
    
    const bankOnboardingCompleted = this.hasCompletedBankOnboarding();
    
    console.log("Bank onboarding check:", {
      bankOnboardingCompleted,
      shouldShow: !bankOnboardingCompleted
    });
    
    // Show onboarding if it hasn't been completed yet
    return !bankOnboardingCompleted;
  }

  public isOnboardingActiveNow(): boolean {
    return this.isOnboardingActive;
  }

  private hasCompletedBankOnboarding(): boolean {
    const saved = localStorage.getItem('dhaniverse_bank_onboarding_completed');
    return saved === 'true';
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

  private completeOnboarding(): void {
    console.log('🏦 Completing onboarding...');
    this.isOnboardingActive = false;
    
    // Mark onboarding as completed
    localStorage.setItem('dhaniverse_bank_onboarding_completed', 'true');
    
    // Store account data
    if (this.bankAccount) {
      localStorage.setItem('dhaniverse_bank_account', JSON.stringify(this.bankAccount));
    }
    
    // Save progress to backend (in a real app)
    this.saveBankOnboardingProgress();
    
    // Enable normal banking interactions
    this.enableNormalBanking();
    
    // Dispatch completion event
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

    // Save to localStorage
    localStorage.setItem('dhaniverse_bank_account_details', JSON.stringify(this.bankAccount));
    console.log('Bank account created:', this.bankAccount);
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
    
    localStorage.setItem('dhaniverse_bank_onboarding_progress', JSON.stringify(progress));
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
