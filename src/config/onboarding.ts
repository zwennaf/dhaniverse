/**
 * Configuration for onboarding and tutorial systems
 * Toggle these values to control different parts of the onboarding experience
 */

export interface OnboardingConfig {
  // Main tutorial onboarding (Maya tutorial)
  enableMainTutorial: boolean;
  
  // Bank onboarding system
  enableBankOnboarding: boolean;
  
  // Maya tracker during tutorial
  enableMayaTracker: boolean;
  
  // Collisions inside buildings
  enableIndoorCollisions: boolean;
  
  // Auto-open banking UI when entering bank (when onboarding disabled)
  autoOpenBankingUI: boolean;
  
  // Debug mode for testing
  debugMode: boolean;
}

// MAIN CONFIGURATION - CHANGE THESE VALUES TO TOGGLE FEATURES
export const ONBOARDING_CONFIG: OnboardingConfig = {
  // Set to false to skip main tutorial and go straight to game
  enableMainTutorial: true,
  
  // Set to true to enable bank onboarding when player enters bank for first time
  enableBankOnboarding: true,
  
  // Set to true to show Maya tracker during tutorial
  enableMayaTracker: false,
  
  // Set to false to disable collisions inside buildings (recommended for better UX)
  enableIndoorCollisions: false,
  
  // Set to false to prevent auto-opening banking UI when entering bank
  autoOpenBankingUI: false,
  
  // Set to true for debug logging and testing features
  debugMode: true
};

// Helper functions to check configuration
export const shouldShowMainTutorial = (): boolean => {
  return ONBOARDING_CONFIG.enableMainTutorial;
};

export const shouldShowBankOnboarding = (): boolean => {
  return ONBOARDING_CONFIG.enableBankOnboarding;
};

export const shouldShowMayaTracker = (): boolean => {
  return ONBOARDING_CONFIG.enableMayaTracker;
};

export const shouldEnableIndoorCollisions = (): boolean => {
  return ONBOARDING_CONFIG.enableIndoorCollisions;
};

export const shouldAutoOpenBankingUI = (): boolean => {
  return ONBOARDING_CONFIG.autoOpenBankingUI;
};

export const isDebugMode = (): boolean => {
  return ONBOARDING_CONFIG.debugMode;
};

// Reset functions for testing
export const resetMainTutorial = (): void => {
  if (isDebugMode()) {
    localStorage.removeItem('dhaniverse_tutorial_completed');
    localStorage.removeItem('dhaniverse_maya_tasks');
    console.log('Main tutorial reset');
  }
};

export const resetBankOnboarding = (): void => {
  if (isDebugMode()) {
    localStorage.removeItem('dhaniverse_bank_onboarding_completed');
    localStorage.removeItem('dhaniverse_bank_account_details');
    localStorage.removeItem('dhaniverse_bank_onboarding_progress');
    console.log('Bank onboarding reset');
  }
};

export const resetAll = (): void => {
  if (isDebugMode()) {
    resetMainTutorial();
    resetBankOnboarding();
    console.log('All onboarding systems reset');
  }
};

// Debug function to toggle configurations at runtime
export const toggleConfig = (key: keyof OnboardingConfig): void => {
  if (isDebugMode()) {
    (ONBOARDING_CONFIG as any)[key] = !(ONBOARDING_CONFIG as any)[key];
    console.log(`Toggled ${key} to:`, (ONBOARDING_CONFIG as any)[key]);
  }
};

// Expose debug functions globally for console access
if (typeof window !== 'undefined' && isDebugMode()) {
  (window as any).dhaniverse_debug = {
    config: ONBOARDING_CONFIG,
    resetMainTutorial,
    resetBankOnboarding,
    resetAll,
    toggleConfig,
    // Quick test functions
    testBankOnboarding: () => {
      resetBankOnboarding();
      console.log('Bank onboarding reset. Enter bank and talk to manager to test.');
    },
    checkBankOnboardingStatus: () => {
      const status = {
        configEnabled: ONBOARDING_CONFIG.enableBankOnboarding,
        localStorageCompleted: localStorage.getItem('dhaniverse_bank_onboarding_completed'),
        tutorialCompleted: (window as any).__tutorialCompleted
      };
      console.log('Bank onboarding status:', status);
      return status;
    },
    forceBankOnboardingReset: () => {
      localStorage.removeItem('dhaniverse_bank_onboarding_completed');
      localStorage.removeItem('dhaniverse_bank_account_details');
      localStorage.removeItem('dhaniverse_bank_onboarding_progress');
      console.log('Force reset bank onboarding localStorage');
    }
  };
}
