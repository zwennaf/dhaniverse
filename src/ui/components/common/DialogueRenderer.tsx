import React, { useState, useEffect } from 'react';
import { dialogueManager, DialogueConfig, DialogueCallbacks } from '../../../services/DialogueManager';
import DialogueBox from './DialogueBox';

/**
 * Global DialogueRenderer - Renders the singleton dialogue system
 * This should be used in GameHUD to render all dialogues
 */
const DialogueRenderer: React.FC = () => {
  const [currentDialogue, setCurrentDialogue] = useState<(DialogueConfig & DialogueCallbacks) | null>(null);

  useEffect(() => {
    // Subscribe to dialogue manager changes
    const unsubscribe = dialogueManager.subscribe((dialogue) => {
      setCurrentDialogue(dialogue);
    });

    return unsubscribe;
  }, []);

  // Don't render anything if no dialogue is active or if dialogue is frozen
  if (!currentDialogue || dialogueManager.isFrozenState()) {
    return null;
  }

  return (
    <DialogueBox
      text={currentDialogue.text}
      characterName={currentDialogue.characterName}
      isVisible={true}
      onAdvance={() => dialogueManager.handleAdvance()}
      onComplete={() => dialogueManager.handleComplete()}
      onTextInput={(text: string) => dialogueManager.handleTextInput(text)}
      onOptionSelect={(optionId: string) => dialogueManager.handleOptionSelect(optionId)}
      
      // Configuration
      requiresTextInput={currentDialogue.requiresTextInput || false}
      textInputPlaceholder={currentDialogue.textInputPlaceholder}
      options={currentDialogue.options}
      showOptions={currentDialogue.showOptions || false}
      showProgressIndicator={currentDialogue.showProgressIndicator || false}
      currentSlide={currentDialogue.currentSlide || 0}
      totalSlides={currentDialogue.totalSlides || 1}
      showBackdrop={currentDialogue.showBackdrop || false}
      allowSpaceAdvance={currentDialogue.allowSpaceAdvance !== false}
      baseTypingSpeed={currentDialogue.baseTypingSpeed || 50}
      fastTypingSpeed={currentDialogue.fastTypingSpeed || 8}
      keyboardInputEnabled={currentDialogue.keyboardInputEnabled !== false}
      
      // Always show continue hint and enable space advance for consistency
      showContinueHint={true}
      position="bottom"
    />
  );
};

export default DialogueRenderer;
