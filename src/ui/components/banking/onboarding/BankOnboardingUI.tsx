import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import BankOnboardingDialogue from './BankOnboardingDialogue';
import BankNameInput from './BankNameInput';

interface BankOnboardingUIProps {
  // This component doesn't need props - it listens to global events
}

const BankOnboardingUI: React.FC<BankOnboardingUIProps> = () => {
  const [showDialogue, setShowDialogue] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [dialogueData, setDialogueData] = useState<{
    messages: string[];
    characterName: string;
    onComplete: () => void;
    onTextInput?: (text: string) => void;
    onOptionSelect?: (optionId: string) => void;
  } | null>(null);
  const [nameInputData, setNameInputData] = useState<{
    onSubmit: (name: string) => void;
  } | null>(null);

  useEffect(() => {
    // Listen for bank onboarding dialogue events
    const handleDialogue = (event: CustomEvent) => {
      console.log('🏦 BankOnboardingUI received dialogue event:', event.detail);
      const { messages, characterName, onComplete, onTextInput, onOptionSelect } = event.detail;
      setDialogueData({ messages, characterName, onComplete, onTextInput, onOptionSelect });
      setShowDialogue(true);
    };

    // Listen for bank name input events
    const handleNameInput = (event: CustomEvent) => {
      console.log('🏦 BankOnboardingUI received name input event:', event.detail);
      const { onSubmit } = event.detail;
      setNameInputData({ onSubmit });
      setShowNameInput(true);
    };

    console.log('🏦 BankOnboardingUI: Adding event listeners');
    window.addEventListener('show-bank-onboarding-dialogue', handleDialogue as EventListener);
    window.addEventListener('show-bank-name-input', handleNameInput as EventListener);

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
      window.removeEventListener('show-bank-name-input', handleNameInput as EventListener);
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

  const handleNameSubmit = (name: string) => {
    setShowNameInput(false);
    if (nameInputData?.onSubmit) {
      nameInputData.onSubmit(name);
    }
    setNameInputData(null);
  };

  const handleNameCancel = () => {
    setShowNameInput(false);
    setNameInputData(null);
  };

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

      {showNameInput && nameInputData && (
        <BankNameInput
          onSubmit={handleNameSubmit}
          onCancel={handleNameCancel}
        />
      )}
    </>,
    mountNode
  );
};

export default BankOnboardingUI;
