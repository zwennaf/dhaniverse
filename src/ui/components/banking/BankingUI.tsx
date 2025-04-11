import React, { useState, useEffect } from 'react';
import BankingDashboard from './BankingDashboard';

const BankingUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [playerRupees, setPlayerRupees] = useState(0);
  const [bankAccount, setBankAccount] = useState(null);
  
  useEffect(() => {
    // Listen for the custom event from the game to open the banking UI
    const handleOpenBankingUI = (event: CustomEvent) => {
      // Get player rupees from the event
      setPlayerRupees(event.detail.playerRupees);
      
      // Store bank account data if provided
      if (event.detail.bankAccount) {
        setBankAccount(event.detail.bankAccount);
      }
      
      // Show the banking UI
      setIsOpen(true);
      
      // Add the active class to the container to enable pointer events
      const container = document.getElementById('banking-ui-container');
      if (container) {
        container.classList.add('active');
        console.log("Banking UI activated");
      }
    };
    
    // Add event listener for the openBankingUI event
    window.addEventListener('openBankingUI', handleOpenBankingUI as EventListener);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('openBankingUI', handleOpenBankingUI as EventListener);
    };
  }, []);
  
  // Close the banking UI
  const handleClose = () => {
    setIsOpen(false);
    
    // Remove the active class from the container
    const container = document.getElementById('banking-ui-container');
    if (container) {
      container.classList.remove('active');
    }
    
    // Notify any game components that may need to know the banking UI was closed
    window.dispatchEvent(new CustomEvent('closeBankingUI'));
  };
  
  // Render nothing if the banking UI is closed
  if (!isOpen) return null;
  
  // Otherwise, render the BankingDashboard
  return (
    <BankingDashboard
      onClose={handleClose}
      playerRupees={playerRupees}
    />
  );
};

export default BankingUI;