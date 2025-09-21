/**
 * Singleton DialogueManager - Central dialogue system for the entire game
 * Prevents overlapping dialogues and manages global dialogue state
 */

interface DialogueOptions {
  id: string;
  text: string;
  action?: () => void;
}

interface DialogueConfig {
  text: string;
  characterName?: string;
  requiresTextInput?: boolean;
  textInputPlaceholder?: string;
  options?: DialogueOptions[];
  showOptions?: boolean;
  showProgressIndicator?: boolean;
  currentSlide?: number;
  totalSlides?: number;
  showBackdrop?: boolean;
  allowSpaceAdvance?: boolean;
  baseTypingSpeed?: number;
  fastTypingSpeed?: number;
  keyboardInputEnabled?: boolean;
}

interface DialogueCallbacks {
  onAdvance?: () => void;
  onComplete?: () => void;
  onTextInput?: (text: string) => void;
  onOptionSelect?: (optionId: string) => void;
}

class DialogueManager {
  private static instance: DialogueManager;
  private currentDialogue: (DialogueConfig & DialogueCallbacks) | null = null;
  private isActive = false;
  private isFrozen = false; // Add frozen state
  private subscribers: Array<(dialogue: (DialogueConfig & DialogueCallbacks) | null) => void> = [];

  private constructor() {
    // Listen for freeze/unfreeze events
    window.addEventListener('freeze-dialogue', () => this.freeze());
    window.addEventListener('unfreeze-dialogue', () => this.unfreeze());
  }

  static getInstance(): DialogueManager {
    if (!DialogueManager.instance) {
      DialogueManager.instance = new DialogueManager();
    }
    return DialogueManager.instance;
  }

  /**
   * Subscribe to dialogue state changes
   */
  subscribe(callback: (dialogue: (DialogueConfig & DialogueCallbacks) | null) => void): () => void {
    this.subscribers.push(callback);
    // Immediately call with current state
    callback(this.currentDialogue);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Show a dialogue - replaces any existing dialogue
   */
  showDialogue(config: DialogueConfig, callbacks: DialogueCallbacks = {}): void {
    // Close any existing dialogue first
    this.closeDialogue();

    // Set new dialogue
    this.currentDialogue = { ...config, ...callbacks };
    this.isActive = true;

    // Notify all subscribers
    this.notifySubscribers();

    // Disable game controls
    window.dispatchEvent(new Event("typing-start"));
  }

  /**
   * Close the current dialogue
   */
  closeDialogue(): void {
    if (this.currentDialogue) {
      this.currentDialogue = null;
      this.isActive = false;
      
      // Notify all subscribers
      this.notifySubscribers();

      // Re-enable game controls
      window.dispatchEvent(new Event("typing-end"));
      
      // Dispatch custom event to reset interaction timers (prevents immediate re-triggering)
      window.dispatchEvent(new CustomEvent("dialogue-closed", { detail: { timestamp: Date.now() } }));
    }
  }

  /**
   * Check if a dialogue is currently active
   */
  isDialogueActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the current dialogue
   */
  getCurrentDialogue(): (DialogueConfig & DialogueCallbacks) | null {
    return this.currentDialogue;
  }

  /**
   * Handle text input from the dialogue
   */
  handleTextInput(text: string): void {
    if (this.currentDialogue?.onTextInput) {
      this.currentDialogue.onTextInput(text);
    }
  }

  /**
   * Handle option selection from the dialogue
   */
  handleOptionSelect(optionId: string): void {
    if (this.currentDialogue?.onOptionSelect) {
      this.currentDialogue.onOptionSelect(optionId);
    }
  }

  /**
   * Handle dialogue advance
   */
  handleAdvance(): void {
    if (this.currentDialogue?.onAdvance) {
      this.currentDialogue.onAdvance();
    }
  }

  /**
   * Handle dialogue completion
   */
  handleComplete(): void {
    if (this.currentDialogue?.onComplete) {
      this.currentDialogue.onComplete();
    }
  }

  /**
   * Update the current dialogue config (for multi-step dialogues)
   */
  updateDialogue(config: Partial<DialogueConfig>): void {
    if (this.currentDialogue) {
      this.currentDialogue = { ...this.currentDialogue, ...config };
      this.notifySubscribers();
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.currentDialogue));
  }

  /**
   * Force close all dialogues (emergency cleanup)
   */
  forceCloseAll(): void {
    this.currentDialogue = null;
    this.isActive = false;
    this.isFrozen = false;
    this.notifySubscribers();
    window.dispatchEvent(new Event("typing-end"));
  }

  /**
   * Freeze dialogue (hide but don't close)
   */
  freeze(): void {
    this.isFrozen = true;
    this.notifySubscribers();
  }

  /**
   * Unfreeze dialogue (show again)
   */
  unfreeze(): void {
    this.isFrozen = false;
    this.notifySubscribers();
  }

  /**
   * Check if dialogue is frozen
   */
  isFrozenState(): boolean {
    return this.isFrozen;
  }
}

// Export singleton instance
export const dialogueManager = DialogueManager.getInstance();
export type { DialogueConfig, DialogueCallbacks, DialogueOptions };
