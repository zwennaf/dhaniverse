import { GameObjects } from 'phaser';
import { MainScene } from '../../scenes/MainScene';
import { shouldShowBankOnboarding as configShouldShowBankOnboarding } from '../../../config/onboarding';

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
  private playerName: string = '';
  private bankAccount: BankAccount | null = null;
  
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
      console.log('🏦 Onboarding already active, continuing from step:', this.currentStep);
      this.showCurrentStep();
      return;
    }
    
    console.log('🏦 Starting bank onboarding...');
    console.log('🏦 Debug state before starting:', this.getDebugState());
    this.isOnboardingActive = true;
    this.currentStep = 0;
    
    // Remove Maya tracker when bank onboarding starts
    this.removeMayaTracker();
    
    // Show first onboarding dialog
    console.log('🏦 Showing first onboarding step:', this.onboardingSteps[0]);
    this.showCurrentStep();
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

  private showCurrentStep(): void {
    const step = this.onboardingSteps[this.currentStep];
    console.log('showCurrentStep called, currentStep:', this.currentStep, 'step:', step);
    
    if (!step) {
      console.log('No step found, completing onboarding');
      this.completeOnboarding();
      return;
    }

    const dialogues = this.getDialoguesForStep(step.id);
    console.log('Generated dialogues for step', step.id, ':', dialogues);
    
    this.showDialogue(dialogues, () => {
      console.log('Dialogue completed for step:', step.id);
      if (step.id === 'identity') {
        this.showNameInput();
      } else {
        this.nextStep();
      }
    });
  }

  private getDialoguesForStep(stepId: string): string[] {
    switch (stepId) {
      case 'welcome':
        return [
          "Welcome to the Central Bank of Dhaniverse! I'm delighted to see you here.",
          "I'm here to help you open your first bank account and get started with your financial journey.",
          "Let me explain what amazing services we offer at Dhaniverse Bank!"
        ];
      
      case 'features':
        return [
          "At Dhaniverse Bank, we offer comprehensive banking solutions:",
          "💰 SAVINGS ACCOUNT: Safely store your money and earn interest",
          "🏦 DEPOSITS & WITHDRAWALS: Easy cash management anytime",
          "📈 FIXED DEPOSITS: Lock your money for higher returns with guaranteed interest rates",
          "📊 ACCOUNT OVERVIEW: Track your balance, transactions, and financial growth",
          "🔒 SECURE BANKING: Your money is protected with advanced security",
          "💳 INSTANT TRANSACTIONS: Real-time deposits and withdrawals",
          "Ready to open your account and start your financial adventure?"
        ];
      
      case 'identity':
        return [
          "Perfect! To create your account, I'll need some basic information.",
          "Could you please tell me your full name for the account registration?"
        ];
      
      case 'account_created':
        return [
          `Congratulations ${this.playerName}! Your account has been successfully created.`,
          "Here are your banking details - please keep them safe:",
          `Account Number: ${this.bankAccount?.accountNumber}`,
          `IFSC Code: ${this.bankAccount?.ifscCode}`,
          `Branch: ${this.bankAccount?.branchName}`,
          "You can now use all our banking services! Simply talk to me anytime to access your account.",
          "Welcome to the Dhaniverse Bank family! Your financial journey starts now!"
        ];
      
      default:
        return ["Welcome to Dhaniverse Bank!"];
    }
  }

  private showDialogue(messages: string[], onComplete: () => void): void {
    console.log('🏦 showDialogue called with messages:', messages);
    
    // Create dialogue event for the game
    window.dispatchEvent(new CustomEvent('show-bank-onboarding-dialogue', {
      detail: {
        messages,
        characterName: 'Bank Manager',
        onComplete
      }
    }));
    
    console.log('🏦 Dispatched show-bank-onboarding-dialogue event');
  }

  private showNameInput(): void {
    // Create name input event
    window.dispatchEvent(new CustomEvent('show-bank-name-input', {
      detail: {
        onSubmit: (name: string) => {
          this.playerName = name;
          this.createBankAccount();
          this.nextStep();
        }
      }
    }));
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

  private nextStep(): void {
    this.onboardingSteps[this.currentStep].completed = true;
    this.currentStep++;
    
    // Small delay before showing next step
    setTimeout(() => {
      this.showCurrentStep();
    }, 500);
  }

  private completeOnboarding(): void {
    console.log('Bank onboarding completed!');
    this.isOnboardingActive = false;
    
    // Mark onboarding as completed
    // localStorage.setItem('dhaniverse_bank_onboarding_completed', 'true');
    
    // Save progress to backend (in a real app)
    this.saveBankOnboardingProgress();
    
    // Enable normal banking interactions
    this.enableNormalBanking();
    
    // Dispatch completion event
    window.dispatchEvent(new CustomEvent('bank-onboarding-completed'));
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
    this.playerName = '';
    this.bankAccount = null;
    
    localStorage.removeItem('dhaniverse_bank_onboarding_completed');
    localStorage.removeItem('dhaniverse_bank_account_details');
    localStorage.removeItem('dhaniverse_bank_onboarding_progress');
    
    // Reset step completion
    this.onboardingSteps.forEach(step => step.completed = false);
    
    console.log('Bank onboarding reset');
  }

  public getDebugState(): any {
    return {
      isOnboardingActive: this.isOnboardingActive,
      currentStep: this.currentStep,
      playerName: this.playerName,
      hasCompletedBankOnboarding: this.hasCompletedBankOnboarding(),
      shouldShowOnboarding: this.shouldShowOnboarding(),
      localStorage: {
        bankOnboardingCompleted: localStorage.getItem('dhaniverse_bank_onboarding_completed'),
        bankAccountDetails: localStorage.getItem('dhaniverse_bank_account_details'),
        bankOnboardingProgress: localStorage.getItem('dhaniverse_bank_onboarding_progress')
      }
    };
  }
}
