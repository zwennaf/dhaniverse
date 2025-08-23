import React, { useState, useEffect } from 'react';
import DialogueBox from '../../common/DialogueBox';

interface DialogueStep {
  text: string;
  requiresTextInput?: boolean;
  textInputPlaceholder?: string;
  options?: Array<{
    id: string;
    text: string;
  }>;
  showOptions?: boolean;
}

interface BankOnboardingDialogueProps {
  messages: string[];
  characterName: string;
  onComplete: () => void;
  onTextInput?: (text: string) => void;
  onOptionSelect?: (optionId: string) => void;
}

const BankOnboardingDialogue: React.FC<BankOnboardingDialogueProps> = ({
  messages,
  characterName,
  onComplete,
  onTextInput,
  onOptionSelect
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState<DialogueStep | null>(null);

  // Parse current message to determine if it needs special handling
  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    if (!currentMessage) return;

    const step: DialogueStep = { text: currentMessage };

    // Check if this is the "are you ready?" question
    if (currentMessage.toLowerCase().includes('ready to open your account') && 
        currentMessage.includes('?')) {
      step.showOptions = true;
      step.options = [
        { id: 'yes', text: 'Yes, I\'m ready!' },
        { id: 'no', text: 'Not yet, maybe later' }
      ];
    }
    // Check if this asks for name input
    else if (currentMessage.toLowerCase().includes('tell me your full name') ||
             currentMessage.toLowerCase().includes('your name for the account')) {
      step.requiresTextInput = true;
      step.textInputPlaceholder = 'Enter your full name';
    }

    setCurrentStep(step);
  }, [currentMessageIndex, messages]);

  const handleAdvance = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    } else {
      setIsVisible(false);
      setTimeout(onComplete, 200);
    }
  };

  const handleTextInput = (text: string) => {
    onTextInput?.(text);
    handleAdvance();
  };

  const handleOptionSelect = (optionId: string) => {
    if (optionId === 'no') {
      // If user says no, show rejection message and end conversation
      setCurrentStep({
        text: "No problem at all! Come back anytime when you feel ready to create your account. We'll be here to help you get started with your financial journey!"
      });
      // After showing this message, complete the dialogue
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 3000);
    } else {
      onOptionSelect?.(optionId);
      handleAdvance();
    }
  };

  if (!currentStep) return null;

  return (
    <DialogueBox
      text={currentStep.text}
      characterName={characterName}
      isVisible={isVisible}
      onAdvance={handleAdvance}
      showProgressIndicator={true}
      currentSlide={currentMessageIndex}
      totalSlides={messages.length}
      showContinueHint={true}
      baseTypingSpeed={50}
      fastTypingSpeed={8}
      allowSpaceAdvance={true}
      position="bottom"
      showBackdrop={true}
      // New features
      requiresTextInput={currentStep.requiresTextInput}
      textInputPlaceholder={currentStep.textInputPlaceholder}
      onTextInput={handleTextInput}
      options={currentStep.options}
      onOptionSelect={handleOptionSelect}
      showOptions={currentStep.showOptions}
      keyboardInputEnabled={true}
    />
  );
};

export default BankOnboardingDialogue;
