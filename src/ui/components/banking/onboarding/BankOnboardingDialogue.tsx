import React, { useState, useEffect } from 'react';
import DialogueBox from '../../common/DialogueBox';

interface BankOnboardingDialogueProps {
  messages: string[];
  characterName: string;
  onComplete: () => void;
}

const BankOnboardingDialogue: React.FC<BankOnboardingDialogueProps> = ({
  messages,
  characterName,
  onComplete
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleAdvance = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    } else {
      setIsVisible(false);
      setTimeout(onComplete, 200);
    }
  };

  const currentMessage = messages[currentMessageIndex];
  const progress = ((currentMessageIndex + 1) / messages.length) * 100;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center pb-8">
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Dialogue container */}
      <div className="relative w-full max-w-4xl px-4">
        {/* Progress indicator */}
        <div className="mb-4 flex justify-center">
          <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-dhani-gold/30">
            <div className="flex items-center space-x-2 text-sm text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-dhani-gold">
                <path
                  d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Bank Onboarding</span>
              <div className="w-24 h-1 bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-dhani-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-300">{currentMessageIndex + 1}/{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Dialogue box */}
        <DialogueBox
          text={currentMessage}
          characterName={characterName}
          isVisible={isVisible}
          onAdvance={handleAdvance}
          showProgressIndicator={false}
          currentSlide={currentMessageIndex}
          totalSlides={messages.length}
          showContinueHint={true}
          baseTypingSpeed={40}
          fastTypingSpeed={5}
          allowSpaceAdvance={true}
        />
      </div>
    </div>
  );
};

export default BankOnboardingDialogue;
