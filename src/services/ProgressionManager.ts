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
}

const DEFAULT_STATE: OnboardingState = {
  hasMetMaya: false,
  hasFollowedMaya: false,
  hasClaimedMoney: false,
  hasCompletedBankOnboarding: false,
  hasReachedStockMarket: false,
  onboardingStep: 'not_started',
  unlockedBuildings: { bank: false, atm: false, stockmarket: false }
};

class ProgressionManager {
  private state: OnboardingState = { ...DEFAULT_STATE };
  private syncing = false;

  initializeFromPlayerState(playerState: any) {
    const incoming = playerState?.onboarding || {};
    this.state = { ...DEFAULT_STATE, ...incoming, unlockedBuildings: { ...DEFAULT_STATE.unlockedBuildings, ...(incoming.unlockedBuildings||{}) } };
  }

  getState(): OnboardingState { return this.state; }

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
      this.persist();
    }
  }

  markReachedStockMarket() {
    if (!this.state.hasReachedStockMarket) {
      this.state.hasReachedStockMarket = true;
      this.state.onboardingStep = 'reached_stock_market';
      // Unlock stockmarket building now
      this.state.unlockedBuildings.stockmarket = true;
      this.persist();
    }
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