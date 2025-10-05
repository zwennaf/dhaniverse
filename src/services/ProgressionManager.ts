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
  private initPromise: Promise<void> | null = null;
  private isInitializing = false;

  async initializeFromPlayerState(playerState?: any, forceRefresh = false) {
    // If already initializing, wait for that to complete
    if (this.isInitializing && this.initPromise && !forceRefresh) {
      console.log('⏳ ProgressionManager: Already initializing, waiting...');
      await this.initPromise;
      return;
    }
    
    // If already initialized and not forcing refresh, skip
    if (this.initialized && !forceRefresh) {
      console.log('✅ ProgressionManager already initialized, skipping');
      return;
    }
    
    // Set initializing flag
    this.isInitializing = true;
    
    // Create initialization promise
    this.initPromise = this._performInitialization(playerState, forceRefresh);
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async _performInitialization(playerState?: any, forceRefresh = false) {
    console.log('🔄 ProgressionManager: Initializing from player state...', { forceRefresh });
    
    // Always try to load from database first
    try {
      const response = await playerStateApi.get();
      if (response.success && response.data?.onboarding) {
        const dbState = response.data.onboarding;
        
        // Sync server-side and client-side field naming
        // Server uses: hasCompletedBankOnboarding, hasReachedStockMarket
        // Client uses: bankOnboardingComplete, stockMarketOnboardingComplete
        // IMPORTANT: Use OR (||) to get the TRUE value if either field is true
        const syncedState = {
          ...DEFAULT_STATE,
          ...dbState,
          // Prefer TRUE values - if either client or server field is true, use true
          bankOnboardingComplete: dbState.hasCompletedBankOnboarding || dbState.bankOnboardingComplete || false,
          stockMarketOnboardingComplete: dbState.hasReachedStockMarket || dbState.stockMarketOnboardingComplete || false,
          unlockedBuildings: {
            ...DEFAULT_STATE.unlockedBuildings,
            ...(dbState.unlockedBuildings || {})
          },
          mayaPosition: dbState.mayaPosition || DEFAULT_STATE.mayaPosition
        };
        
        this.state = syncedState;
        this.initialized = true;
        
        // Log only the final, synced state - consolidated into ONE object
        console.log('✅ ProgressionManager initialized from database. State is now ready:', {
          step: this.state.onboardingStep,
          bankComplete: this.state.bankOnboardingComplete,
          stockComplete: this.state.stockMarketOnboardingComplete,
          hasMetMaya: this.state.hasMetMaya,
          hasClaimedMoney: this.state.hasClaimedMoney,
          unlockedBuildings: this.state.unlockedBuildings,
          mayaPosition: this.state.mayaPosition
        });
        return;
      } else {
        console.log('📥 ProgressionManager: No onboarding data in database, using defaults');
      }
    } catch (error) {
      console.warn('❌ ProgressionManager: Failed to load from database:', error);
    }
    
    // Fallback to provided player state (from localStorage or initial load)
    if (playerState?.onboarding) {
      const incoming = playerState.onboarding;
      console.log('📥 ProgressionManager: Loading from provided player state:', incoming);
      this.state = { 
        ...DEFAULT_STATE, 
        ...incoming, 
        unlockedBuildings: { 
          ...DEFAULT_STATE.unlockedBuildings, 
          ...(incoming.unlockedBuildings || {}) 
        } 
      };
    } else {
      console.log('📥 ProgressionManager: Using DEFAULT_STATE');
      this.state = { ...DEFAULT_STATE };
    }
    
    this.initialized = true;
    console.log('✅ ProgressionManager initialized with fallback state:', this.state);
  }

  getState(): OnboardingState { 
    if (!this.initialized) {
      // If currently initializing, warn but return current state
      if (this.isInitializing) {
        console.warn('⚠️ ProgressionManager: Initialization in progress, returning current state...');
        return this.state;
      }
      
      // If not initialized and not initializing, this is an error condition
      console.error('❌ ProgressionManager: getState() called before initialization! Call initializeFromPlayerState() first.');
      console.warn('⚠️ Returning default state. Components should await initializeFromPlayerState() before calling getState().');
    }
    return this.state; 
  }
  
  /**
   * Async version of getState that waits for initialization to complete
   * Use this in async contexts to ensure you get the correct state
   */
  async getStateAsync(): Promise<OnboardingState> {
    if (!this.initialized && this.isInitializing && this.initPromise) {
      console.log('⏳ ProgressionManager: Waiting for initialization to complete...');
      await this.initPromise;
    } else if (!this.initialized) {
      console.warn('⚠️ ProgressionManager: Not initialized, initializing now...');
      await this.initializeFromPlayerState();
    }
    return this.state;
  }
  
  /**
   * Check if manager is ready to use
   */
  isReady(): boolean {
    return this.initialized && !this.isInitializing;
  }

  private async persist(immediate = false) {
    // Allow immediate persistence to bypass throttle for critical updates
    if (this.syncing && !immediate) {
      console.log('⏳ ProgressionManager: Sync already in progress, skipping');
      return;
    }
    
    this.syncing = true;
    try { 
      console.log('💾 ProgressionManager: Persisting state to database:', {
        step: this.state.onboardingStep,
        bankComplete: this.state.bankOnboardingComplete,
        stockComplete: this.state.stockMarketOnboardingComplete,
        unlockedBuildings: this.state.unlockedBuildings,
        mayaPosition: this.state.mayaPosition
      });
      
      // Send both client and server field names for full compatibility
      const persistPayload = {
        ...this.state,
        // Server-side fields (source of truth in database)
        hasCompletedBankOnboarding: this.state.bankOnboardingComplete,
        hasReachedStockMarket: this.state.stockMarketOnboardingComplete,
        // Client-side fields (for UI/game logic)
        bankOnboardingComplete: this.state.bankOnboardingComplete,
        stockMarketOnboardingComplete: this.state.stockMarketOnboardingComplete
      };
      
      const response = await playerStateApi.update({ onboarding: persistPayload }); 
      
      if (response.success) {
        console.log('✅ ProgressionManager: State persisted successfully');
      } else {
        console.warn('⚠️ ProgressionManager: Persist returned non-success:', response);
      }
    } catch(e){ 
      console.error('❌ ProgressionManager: Failed to persist onboarding:', e);
      // Don't throw - log and continue
    } finally { 
      this.syncing = false; 
    }
  }

  async markMetMaya() {
    if (this.state.hasMetMaya) {
      console.log('👋 ProgressionManager: Already met Maya, skipping');
      return;
    }
    
    this.state.hasMetMaya = true;
    this.state.onboardingStep = 'met_maya';
    console.log('👋 ProgressionManager: Marked met Maya');
    
    await this.persist(true);
  }

  async markFollowedMaya() {
    if (this.state.hasFollowedMaya) {
      console.log('🚶 ProgressionManager: Already followed Maya, skipping');
      return;
    }
    
    this.state.hasFollowedMaya = true;
    if (!this.state.hasClaimedMoney) {
      this.state.onboardingStep = 'at_bank_with_maya';
    }
    
    // Update Maya position to bank area where she arrives after guiding
    this.state.mayaPosition = { x: 9415, y: 6297 };
    console.log('🚶 ProgressionManager: Marked followed Maya');
    
    await this.persist(true);
  }

  async markClaimedMoney() {
    if (this.state.hasClaimedMoney) {
      console.log('💰 ProgressionManager: Already claimed money, skipping');
      return;
    }
    
    this.state.hasClaimedMoney = true;
    this.state.onboardingStep = 'claimed_money';
    
    // Ensure consistency: if money is claimed, Maya must have been followed
    if (!this.state.hasFollowedMaya) {
      this.state.hasFollowedMaya = true;
      console.log('🔧 Auto-correcting hasFollowedMaya to true for consistency');
    }
    
    // Unlock ONLY bank building at this stage (stock market stays locked until bank onboarding complete)
    this.state.unlockedBuildings.bank = true;
    console.log('💰 ProgressionManager: Marked claimed money, unlocked bank');
    
    await this.persist(true);
    
    // Also mark the main tutorial as completed when user claims starter money
    try {
      await playerStateApi.update({ hasCompletedTutorial: true });
      console.log('✅ Main tutorial marked as completed after claiming starter money');
    } catch (error) {
      console.warn('Failed to mark main tutorial as completed:', error);
    }
  }

  async markBankOnboardingCompleted() {
    console.log('🏦 ProgressionManager: markBankOnboardingCompleted called. Current state:', this.state.bankOnboardingComplete);
    
    if (this.state.bankOnboardingComplete) {
      console.log('🏦 ProgressionManager: Bank onboarding was already completed, skipping');
      return;
    }
    
    // Update state
    this.state.bankOnboardingComplete = true;
    if (this.state.onboardingStep === 'claimed_money') {
      this.state.onboardingStep = 'bank_onboarding_complete';
    }
    
    // Maya remains at bank entrance ready for stock market guidance
    this.state.mayaPosition = { x: 9415, y: 6297 };
    
    // Unlock stock market building when bank onboarding is completed
    this.state.unlockedBuildings.stockmarket = true;
    
    console.log('🏦 ProgressionManager: Bank onboarding marked as completed. New state:', {
      step: this.state.onboardingStep,
      bankComplete: this.state.bankOnboardingComplete,
      unlockedBuildings: this.state.unlockedBuildings
    });
    
    // CRITICAL: Immediately persist with immediate flag to bypass throttle
    try {
      await this.persist(true);
      console.log('✅ ProgressionManager: Bank onboarding state persisted successfully');
    } catch (e) {
      console.error('❌ ProgressionManager: Failed to persist bank onboarding state:', e);
    }
    
    // Notify UI that stock market unlocked
    try {
      window.dispatchEvent(new CustomEvent('stockMarketUnlocked'));
      console.log('📢 Dispatched stockMarketUnlocked event');
    } catch (e) {
      console.warn('Failed to dispatch stockMarketUnlocked event:', e);
    }
  }

  async markStockMarketOnboardingCompleted() {
    if (this.state.stockMarketOnboardingComplete) {
      console.log('📈 ProgressionManager: Stock market onboarding already completed, skipping');
      return;
    }
    
    this.state.stockMarketOnboardingComplete = true;
    this.state.onboardingStep = 'stock_market_onboarding_complete';
    
    // Ensure stockmarket building is unlocked
    this.state.unlockedBuildings.stockmarket = true;
    
    // Update Maya position to stock market entrance
    this.state.mayaPosition = { x: 2598, y: 3736 };
    
    console.log('📈 ProgressionManager: Stock market onboarding marked as completed');
    
    // Immediately persist
    try {
      await this.persist(true);
      console.log('✅ ProgressionManager: Stock market onboarding state persisted successfully');
    } catch (e) {
      console.error('❌ ProgressionManager: Failed to persist stock market onboarding state:', e);
    }
    
    // Notify UI that stock market unlocked
    try {
      window.dispatchEvent(new CustomEvent('stockMarketUnlocked'));
    } catch (e) {
      console.warn('Failed to dispatch stockMarketUnlocked event:', e);
    }
  }

  async updateMayaPosition(x: number, y: number) {
    this.state.mayaPosition = { x, y };
    console.log('📍 ProgressionManager: Updated Maya position to:', { x, y });
    await this.persist();
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
    console.log('🔍 Progression Debug Info:', {
      initialized: progressionManager.isReady(),
      isInitializing: (progressionManager as any).isInitializing,
      state: progressionManager.getState()
    });
    return progressionManager.getState();
  };
  (window as any).debugProgressionAsync = async () => {
    const state = await progressionManager.getStateAsync();
    console.log('🔍 Progression Async State (guaranteed initialized):', state);
    return state;
  };
}