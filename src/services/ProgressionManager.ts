// ProgressionManager: client-side helper for Maya onboarding progression & building locks
import { playerStateApi } from '../utils/api';
import { dialogueManager } from './DialogueManager';

export type OnboardingStep = 'not_started' | 'met_maya' | 'at_bank_with_maya' | 'claimed_money';

export interface OnboardingState {
  hasMetMaya: boolean;
  hasFollowedMaya: boolean;
  hasClaimedMoney: boolean;
  onboardingStep: OnboardingStep;
  unlockedBuildings: Record<string, boolean>;
}

const DEFAULT_STATE: OnboardingState = {
  hasMetMaya: false,
  hasFollowedMaya: false,
  hasClaimedMoney: false,
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

  canEnterBuilding(buildingId: string): { allowed: boolean; message?: string } {
    const s = this.state;
    if (!s.hasMetMaya) return { allowed: false, message: 'Access Denied — Go meet Maya first to begin your journey.' };
    if (!s.hasFollowedMaya) return { allowed: false, message: 'Access Denied — Go to the bank area with Maya and speak to her there.' };
    if (!s.hasClaimedMoney) return { allowed: false, message: 'Access Denied — Talk to Maya outside the bank to claim your ₹1000 and begin.' };
    if (!s.unlockedBuildings[buildingId]) return { allowed: false, message: 'Access Denied — This building unlocks later. Continue your journey.' };
    return { allowed: true };
  }

  showAccessDenied(message: string) {
    dialogueManager.showDialogue({ text: message, characterName: 'System', allowSpaceAdvance: true, showBackdrop: false }, { onAdvance: () => dialogueManager.closeDialogue() });
  }
}

export const progressionManager = new ProgressionManager();