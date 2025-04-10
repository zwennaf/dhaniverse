import './style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App.tsx';
import GameHUD from './ui/components/hud/GameHUD.tsx';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get join-screen container for React
  const joinScreen = document.getElementById('join-screen');
  
  // Render the React app in the join screen
  if (joinScreen) {
    const root = ReactDOM.createRoot(joinScreen);
    root.render(React.createElement(App));
  }
});

// Function to initialize HUD - will be called from game.ts when game starts
export function initializeHUD(initialRupees = 25000) {
  const hudContainer = document.getElementById('hud-container');
  
  if (hudContainer) {
    // Make HUD visible
    hudContainer.style.display = 'block';
    
    // Mount React component
    const hudRoot = ReactDOM.createRoot(hudContainer);
    hudRoot.render(
      React.createElement(GameHUD, { rupees: initialRupees })
    );
    
    return hudRoot; // Return the root so we can update it later if needed
  }
  
  return null;
}

// Create a function to update the HUD from Phaser
export function updateHUD(rupees: number) {
  // Dispatch a custom event that the React component will listen for
  window.dispatchEvent(
    new CustomEvent('rupee-update', { detail: { rupees } })
  );
}
