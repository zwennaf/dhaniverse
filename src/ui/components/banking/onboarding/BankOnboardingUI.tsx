import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import BankOnboardingDialogue from './BankOnboardingDialogue';

interface BankOnboardingUIProps {
  // This component doesn't need props - it listens to global events
}

const BankOnboardingUI: React.FC<BankOnboardingUIProps> = () => {
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueData, setDialogueData] = useState<{
    messages: string[];
    characterName: string;
    onComplete: () => void;
    onTextInput?: (text: string) => void;
    onOptionSelect?: (optionId: string) => void;
  } | null>(null);
  // Name input removed; handled inside BankAccountCreationFlow

  useEffect(() => {
    // Listen for bank onboarding dialogue events
    const handleDialogue = (event: CustomEvent) => {
      console.log('🏦 BankOnboardingUI received dialogue event:', event.detail);
      const { messages, characterName, onComplete, onTextInput, onOptionSelect } = event.detail;
      setDialogueData({ messages, characterName, onComplete, onTextInput, onOptionSelect });
      setShowDialogue(true);
    };

    // Listen for bank name input events

    console.log('🏦 BankOnboardingUI: Adding event listeners');
    window.addEventListener('show-bank-onboarding-dialogue', handleDialogue as EventListener);
  // Removed show-bank-name-input listener after consolidation

    // Consume any pending dialogue that may have been dispatched before this UI mounted
    try {
      const pending = (window as any).__pendingBankOnboardingDialogue;
      if (pending && pending.messages) {
        console.log('🏦 BankOnboardingUI consuming pending dialogue', pending);
        setDialogueData({ 
          messages: pending.messages, 
          characterName: pending.characterName || 'Bank Manager', 
          onComplete: pending.onComplete,
          onTextInput: pending.onTextInput,
          onOptionSelect: pending.onOptionSelect
        });
        setShowDialogue(true);
        // clear pending so it doesn't fire again
        (window as any).__pendingBankOnboardingDialogue = null;
      }
    } catch (err) {
      // ignore
    }

    return () => {
      console.log('🏦 BankOnboardingUI: Removing event listeners');
      window.removeEventListener('show-bank-onboarding-dialogue', handleDialogue as EventListener);
  // removed listener cleanup
    };
  }, []);

  const handleDialogueComplete = () => {
    setShowDialogue(false);
    if (dialogueData?.onComplete) {
      dialogueData.onComplete();
    }
    setDialogueData(null);
  };

  const handleTextInput = (text: string) => {
    if (dialogueData?.onTextInput) {
      dialogueData.onTextInput(text);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (dialogueData?.onOptionSelect) {
      dialogueData.onOptionSelect(optionId);
    }
  };

  // Removed name submit/cancel handlers

  // Render dialogues into a portal attached to document.body so they escape the
  // #root stacking context which uses z-index:100 in index.html.
  const mountNode = typeof document !== 'undefined' ? document.body : null;

  if (!mountNode) return null;

  return ReactDOM.createPortal(
    <>
      {showDialogue && dialogueData && (
        <BankOnboardingDialogue
          messages={dialogueData.messages}
          characterName={dialogueData.characterName}
          onComplete={handleDialogueComplete}
          onTextInput={handleTextInput}
          onOptionSelect={handleOptionSelect}
        />
      )}

  {/* Name input removed */}
    </>,
    mountNode
  );
};

export default BankOnboardingUI;
