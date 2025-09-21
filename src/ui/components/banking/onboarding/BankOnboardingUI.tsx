import React, { useEffect } from 'react';

interface BankOnboardingUIProps {
  // This component doesn't need props - it listens to global events
}

const BankOnboardingUI: React.FC<BankOnboardingUIProps> = () => {
  // Legacy component - bank dialogues now handled by centralized DialogueManager
  // Kept for potential future bank-specific UI elements
  
  useEffect(() => {
    console.log('🏦 BankOnboardingUI: Initialized (legacy event system removed)');
    
    // No event listeners needed - all dialogue now goes through DialogueManager
    return () => {
      console.log('🏦 BankOnboardingUI: Cleanup (no events to remove)');
    };
  }, []);

  // No UI rendered - all handled by DialogueManager
  return null;
};

export default BankOnboardingUI;
