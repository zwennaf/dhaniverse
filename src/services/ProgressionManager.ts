// ProgressionManager: client-side helper for Maya onboarding progression & building locks
import { playerStateApi } from '../utils/api';
import { dialogueManager } from './DialogueManager';

export type OnboardingStep = 'not_started' | 'met_maya' | 'at_bank_with_maya' | 'claimed_money' | 'bank_onboarding_complete' | 'stock_market_onboarding_complete';

export interface OnboardingState {
  hasMetMaya: boolean;
  hasFollowedMaya: boolean;
  hasClaimedMoney: boolean;
  bankOnboardingComplete: boolean;
  stockMarketOnboardingComplete: boolean;
  onboardingStep: OnboardingStep;
  unlockedBuildings: Record<string, boolean>;
  mayaPosition?: { x: number; y: number };
}

const DEFAULT_STATE: OnboardingState = {
  hasMetMaya: false,
  hasFollowedMaya: false,
  hasClaimedMoney: false,
  bankOnboardingComplete: false,
  stockMarketOnboardingComplete: false,
  onboardingStep: 'not_started',
  unlockedBuildings: { bank: false, atm: false, stockmarket: false },
  mayaPosition: { x: 7779, y: 3581 } // Default Maya starting position
};

class ProgressionManager {
  private state: OnboardingState = { ...DEFAULT_STATE };
  private syncing = false;
  private initialized = false;

  async initializeFromPlayerState(playerState?: any, forceRefresh = false) {
    if (this.initialized && !forceRefresh) return;
    
    console.log('🔄 ProgressionManager: Initializing from player state...');
    
    // Always try to load from database first
    try {
      const response = await playerStateApi.get();
      if (response.success && response.data?.onboarding) {
        const dbState = response.data.onboarding;
        
        // CRITICAL FIX: Don't overwrite local state with older database state
        // If we have a more recent local update (like bankOnboardingComplete), preserve it
        const shouldPreserveLocal = this.initialized && this.state.bankOnboardingComplete && !dbState.bankOnboardingComplete;
        
        if (shouldPreserveLocal) {
          console.log('⚠️ ProgressionManager: Local state is newer than database, preserving local state');
          console.log('🔄 ProgressionManager: Saving newer local state to database');
          await this.persist(); // Save our newer local state to database
          return;
        }
        
        this.state = { 
          ...DEFAULT_STATE, 
          ...dbState, 
          unlockedBuildings: { 
            ...DEFAULT_STATE.unlockedBuildings, 
            ...(dbState.unlockedBuildings || {}) 
          } 
        };
        this.initialized = true;
        console.log('✅ ProgressionManager loaded from database. bankOnboardingComplete:', this.state.bankOnboardingComplete);
        console.log('✅ Full state loaded:', this.state);
        return;
      }
    } catch (error) {
      console.warn('Failed to load progression from database, using fallback:', error);
    }
    
    // Fallback to provided player state (from localStorage or initial load)
    if (playerState?.onboarding) {
      const incoming = playerState.onboarding;
      this.state = { 
        ...DEFAULT_STATE, 
        ...incoming, 
        unlockedBuildings: { 
          ...DEFAULT_STATE.unlockedBuildings, 
          ...(incoming.unlockedBuildings || {}) 
        } 
      };
    }
    
    this.initialized = true;
  }

  getState(): OnboardingState { 
    if (!this.initialized) {
      console.warn('⚠️ ProgressionManager not initialized yet, initializing now...');
      // Try to initialize synchronously from localStorage as fallback
      const localData = localStorage.getItem('dhaniverse_player_state');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed?.onboarding) {
            this.state = { 
              ...DEFAULT_STATE, 
              ...parsed.onboarding, 
              unlockedBuildings: { 
                ...DEFAULT_STATE.unlockedBuildings, 
                ...(parsed.onboarding.unlockedBuildings || {}) 
              } 
            };
            this.initialized = true;
            console.log('✅ ProgressionManager initialized from localStorage fallback');
          }
        } catch (e) {
          console.warn('Failed to parse localStorage fallback:', e);
        }
      }
    }
    return this.state; 
  }

  private async persist() {
    if (this.syncing) return; // simple throttle
    this.syncing = true;
    try { 
      console.log('🔄 ProgressionManager: Persisting state to database:', this.state);
      await playerStateApi.update({ onboarding: this.state }); 
      console.log('✅ ProgressionManager: State persisted successfully');
    } catch(e){ 
      console.warn('❌ ProgressionManager: Failed to persist onboarding', e);
    } finally { 
      this.syncing = false; 
    }
  }

  markMetMaya() {
    if (!this.state.hasMetMaya) {
      this.state.hasMetMaya = true;
      this.state.onboardingStep = 'met_maya';
      this.persist();
    }
  }

  markFollowedMaya() {
    if (!this.state.hasFollowedMaya) {
      this.state.hasFollowedMaya = true;
      if (!this.state.hasClaimedMoney) this.state.onboardingStep = 'at_bank_with_maya';
      // Update Maya position to bank area where she arrives after guiding
      this.state.mayaPosition = { x: 9415, y: 6297 };
      this.persist();
    }
  }

  markClaimedMoney() {
    if (!this.state.hasClaimedMoney) {
      this.state.hasClaimedMoney = true;
      this.state.onboardingStep = 'claimed_money';
      // Ensure consistency: if money is claimed, Maya must have been followed
      if (!this.state.hasFollowedMaya) {
        this.state.hasFollowedMaya = true;
        console.log('🔧 Auto-correcting hasFollowedMaya to true for consistency');
      }
      // Unlock ONLY bank building at this stage (stock market stays locked until bank onboarding complete)
      this.state.unlockedBuildings.bank = true;
      this.persist();
      
      // Also mark the main tutorial as completed when user claims starter money
      // This is the point where the basic Maya tutorial is considered complete
      (async () => {
        try {
          const { playerStateApi } = await import('../utils/api');
          await playerStateApi.update({ hasCompletedTutorial: true });
          console.log('✅ Main tutorial marked as completed after claiming starter money');
        } catch (error) {
          console.warn('Failed to mark main tutorial as completed:', error);
        }
      })();
    }
  }

  markBankOnboardingCompleted() {
    console.log('🏦 ProgressionManager: markBankOnboardingCompleted called. Current state:', this.state.bankOnboardingComplete);
    if (!this.state.bankOnboardingComplete) {
      this.state.bankOnboardingComplete = true;
      if (this.state.onboardingStep === 'claimed_money') this.state.onboardingStep = 'bank_onboarding_complete';
      // Maya remains at bank entrance ready for stock market guidance
      this.state.mayaPosition = { x: 9415, y: 6297 };
      // Unlock stock market building when bank onboarding is completed
      this.state.unlockedBuildings.stockmarket = true;
      console.log('🏦 ProgressionManager: Bank onboarding marked as completed. New state:', this.state);
      
      // Immediately persist the change and wait for it
      this.persistAndWait().then(() => {
        console.log('✅ ProgressionManager: Bank onboarding state persisted successfully');
      }).catch(e => {
        console.warn('❌ ProgressionManager: Failed to persist bank onboarding state:', e);
      });
      
      // Also try to update localStorage as backup
      try {
        localStorage.setItem('dhaniverse_bank_onboarding_completed', 'true');
        console.log('✅ Also set localStorage backup flag: dhaniverse_bank_onboarding_completed = true');
      } catch (e) {
        console.warn('Failed to set localStorage backup flag:', e);
      }
      
      // Notify UI that stock market unlocked
      try {
        window.dispatchEvent(new CustomEvent('stockMarketUnlocked'));
      } catch (e) {
        console.warn('Failed to dispatch stockMarketUnlocked event', e);
      }
    } else {
      console.log('🏦 ProgressionManager: Bank onboarding was already completed, not marking again');
    }
  }

  // Helper method to persist and wait (without throttling for critical updates)
  private async persistAndWait() {
    try { 
      console.log('🔄 ProgressionManager: Force persisting critical state to database:', this.state);
      await playerStateApi.update({ onboarding: this.state }); 
      console.log('✅ ProgressionManager: Critical state persisted successfully');
    } catch(e){ 
      console.warn('❌ ProgressionManager: Failed to persist critical state', e);
      throw e;
    }
  }

  markStockMarketOnboardingCompleted() {
    if (!this.state.stockMarketOnboardingComplete) {
      this.state.stockMarketOnboardingComplete = true;
      this.state.onboardingStep = 'stock_market_onboarding_complete';
      // Ensure stockmarket building is unlocked (should already be unlocked from bank completion)
      this.state.unlockedBuildings.stockmarket = true;
      // Update Maya position to stock market entrance
      this.state.mayaPosition = { x: 2598, y: 3736 };
      this.persist();
      // Notify UI that stock market unlocked so it can lazily mount
      try {
        window.dispatchEvent(new CustomEvent('stockMarketUnlocked'));
      } catch (e) {
        console.warn('Failed to dispatch stockMarketUnlocked event', e);
      }
    }
  }

  updateMayaPosition(x: number, y: number) {
    this.state.mayaPosition = { x, y };
    this.persist();
  }

  getMayaPosition(): { x: number; y: number } {
    // Return position based on current progression state, with fallback to stored position
    const storedPosition = this.state.mayaPosition || { x: 7779, y: 3581 };
    
    // Override with state-specific positions if stored position is default
    if (storedPosition.x === 7779 && storedPosition.y === 3581) {
      // Use state-specific positioning for better player experience
      if (this.state.stockMarketOnboardingComplete) {
        return { x: 2598, y: 3736 }; // Stock market entrance
      } else if (this.state.hasFollowedMaya || this.state.hasClaimedMoney || this.state.bankOnboardingComplete) {
        return { x: 9415, y: 6297 }; // Bank entrance
      }
    }
    
    return storedPosition;
  }

  // Centralized validation chain used by Maya before starting next guidance step
  validateSequenceForNext(target: 'claim_money' | 'bank_onboarding' | 'stock_market'): { ok: boolean; message?: string } {
    const s = this.state;
    if (!s.hasMetMaya) return { ok: false, message: 'You need to meet Maya first.' };
    if (!s.hasFollowedMaya) return { ok: false, message: 'Follow Maya to the bank area first.' };
    if (target !== 'claim_money' && !s.hasClaimedMoney) return { ok: false, message: 'Claim your starter money outside the bank first.' };
    if (target === 'bank_onboarding' && !s.hasClaimedMoney) return { ok: false, message: 'Claim your starter money first.' };
    if (target === 'stock_market' && !s.bankOnboardingComplete) return { ok: false, message: 'Complete your bank onboarding and create your account before continuing.' };
    return { ok: true };
  }

  canEnterBuilding(buildingId: string): { allowed: boolean; message?: string } {
    const s = this.state;
    
    // If player is existing and bankOnboardingComplete = true, allow direct entry to bank
    if (s.bankOnboardingComplete && buildingId === 'bank') {
      return { allowed: true };
    }
    
    // If stockMarketOnboardingComplete = true, allow direct entry to stock market as well
    if (s.stockMarketOnboardingComplete && buildingId === 'stockmarket') {
      return { allowed: true };
    }
    
    // CRITICAL FIX: Check for claimed money FIRST - if user has claimed money, they should have access
    // to unlocked buildings regardless of other progression flags (fixes inconsistent state bug)
    if (s.hasClaimedMoney) {
      console.log('💰 User has claimed money, checking building unlock status for:', buildingId);
      // After claiming money - check specific building access
      if (!s.unlockedBuildings[buildingId]) {
        return { allowed: false, message: 'Access Denied — This building unlocks later. Continue your journey.' };
      }
      console.log('✅ Building is unlocked for user who has claimed money');
      return { allowed: true };
    }
    
    // For new or mid-onboarding players who HAVEN'T claimed money yet, check progression flags in order:
    
    // Before meeting Maya (hasMetMaya = false)
    if (!s.hasMetMaya) {
      return { allowed: false, message: 'Access Denied — Go meet Maya first to begin your journey.' };
    }
    
    // After meeting Maya but not followed to bank (hasMetMaya = true && hasFollowedMaya = false)
    if (!s.hasFollowedMaya) {
      return { allowed: false, message: 'Access Denied — Go to the bank area with Maya and speak to her there.' };
    }
    
    // After following Maya but not claimed money (hasFollowedMaya = true && hasClaimedMoney = false)
    if (!s.hasClaimedMoney) {
      return { allowed: false, message: 'Access Denied — Talk to Maya outside the bank to claim your ₹1000 and begin.' };
    }
    
    // After claiming money - check specific building access (shouldn't reach here due to early return above)
    if (!s.unlockedBuildings[buildingId]) {
      return { allowed: false, message: 'Access Denied — This building unlocks later. Continue your journey.' };
    }
    
    return { allowed: true };
  }

  showAccessDenied(message: string) {
    dialogueManager.showDialogue({ 
      text: message, 
      characterName: 'System', 
      allowSpaceAdvance: true, 
      showBackdrop: false,
      keyboardInputEnabled: true // Enable DialogueBox keyboard handling
    }, { 
      onAdvance: () => dialogueManager.closeDialogue() 
    });
  }
}

export const progressionManager = new ProgressionManager();

// Debug helper - expose to window for testing
if (typeof window !== 'undefined') {
  (window as any).progressionManager = progressionManager;
  (window as any).debugProgression = () => {
    console.log('🔍 Progression Debug State:', progressionManager.getState());
    return progressionManager.getState();
  };
}