// ProgressionManager: client-side helper for Maya onboarding progression & building locks
import { playerStateApi } from '../utils/api';
import { dialogueManager } from './DialogueManager';

export type OnboardingStep = 'not_started' | 'met_maya' | 'at_bank_with_maya' | 'claimed_money' | 'bank_onboarding_completed' | 'reached_stock_market';

export interface OnboardingState {
  hasMetMaya: boolean;
  hasFollowedMaya: boolean;
  hasClaimedMoney: boolean;
  hasCompletedBankOnboarding?: boolean;
  hasReachedStockMarket?: boolean;
  onboardingStep: OnboardingStep;
  unlockedBuildings: Record<string, boolean>;
  mayaPosition?: { x: number; y: number };
}

const DEFAULT_STATE: OnboardingState = {
  hasMetMaya: false,
  hasFollowedMaya: false,
  hasClaimedMoney: false,
  hasCompletedBankOnboarding: false,
  hasReachedStockMarket: false,
  onboardingStep: 'not_started',
  unlockedBuildings: { bank: false, atm: false, stockmarket: false },
  mayaPosition: { x: 7779, y: 3581 } // Default Maya starting position
};

class ProgressionManager {
  private state: OnboardingState = { ...DEFAULT_STATE };
  private syncing = false;
  private initialized = false;

  async initializeFromPlayerState(playerState?: any) {
    if (this.initialized) return;
    
    // Always try to load from database first
    try {
      const response = await playerStateApi.get();
      if (response.success && response.data?.onboarding) {
        const dbState = response.data.onboarding;
        this.state = { 
          ...DEFAULT_STATE, 
          ...dbState, 
          unlockedBuildings: { 
            ...DEFAULT_STATE.unlockedBuildings, 
            ...(dbState.unlockedBuildings || {}) 
          } 
        };
        this.initialized = true;
        console.log('✅ ProgressionManager loaded from database');
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
      console.warn('ProgressionManager not initialized, using default state');
    }
    return this.state; 
  }

  private async persist() {
    if (this.syncing) return; // simple throttle
    this.syncing = true;
    try { await playerStateApi.update({ onboarding: this.state }); } catch(e){ console.warn('Failed to persist onboarding', e);} finally { this.syncing = false; }
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
      // Unlock bank only at this stage (others stay false for future quests)
      this.state.unlockedBuildings.bank = true;
      this.persist();
    }
  }

  markBankOnboardingCompleted() {
    if (!this.state.hasCompletedBankOnboarding) {
      this.state.hasCompletedBankOnboarding = true;
      if (this.state.onboardingStep === 'claimed_money') this.state.onboardingStep = 'bank_onboarding_completed';
      // Maya remains at bank entrance ready for stock market guidance
      this.state.mayaPosition = { x: 9415, y: 6297 };
      this.persist();
    }
  }

  markReachedStockMarket() {
    if (!this.state.hasReachedStockMarket) {
      this.state.hasReachedStockMarket = true;
      this.state.onboardingStep = 'reached_stock_market';
      // Unlock stockmarket building now
      this.state.unlockedBuildings.stockmarket = true;
      // Update Maya position to stock market entrance
      this.state.mayaPosition = { x: 2598, y: 3736 };
      this.persist();
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
      if (this.state.hasReachedStockMarket) {
        return { x: 2598, y: 3736 }; // Stock market entrance
      } else if (this.state.hasFollowedMaya || this.state.hasClaimedMoney || this.state.hasCompletedBankOnboarding) {
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
    if (target === 'stock_market' && !s.hasCompletedBankOnboarding) return { ok: false, message: 'Complete your bank onboarding and create your account before continuing.' };
    return { ok: true };
  }

  canEnterBuilding(buildingId: string): { allowed: boolean; message?: string } {
    const s = this.state;
    // If onboarding fully completed (claimed money), always allow bank access
    if (s.hasClaimedMoney && buildingId === 'bank') {
      return { allowed: true };
    }
    if (!s.hasMetMaya) return { allowed: false, message: 'Access Denied — Go meet Maya first to begin your journey.' };
    if (!s.hasFollowedMaya) return { allowed: false, message: 'Access Denied — Go to the bank area with Maya and speak to her there.' };
    if (!s.hasClaimedMoney) return { allowed: false, message: 'Access Denied — Talk to Maya outside the bank to claim your ₹1000 and begin.' };
    if (!s.unlockedBuildings[buildingId]) return { allowed: false, message: 'Access Denied — This building unlocks later. Continue your journey.' };
    return { allowed: true };
  }

  showAccessDenied(message: string) {
  // Silently ignore if player has completed onboarding (avoid showing legacy denials)
  if (this.state.hasClaimedMoney) return;
    dialogueManager.showDialogue({ text: message, characterName: 'System', allowSpaceAdvance: true, showBackdrop: false }, { onAdvance: () => dialogueManager.closeDialogue() });
  }
}

export const progressionManager = new ProgressionManager();