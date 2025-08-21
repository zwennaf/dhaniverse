import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './ui/App.tsx';
import GameHUD from './ui/components/hud/GameHUD.tsx';
import BankingUI from './ui/components/banking/BankingUI.tsx';
import StockMarketUI from './ui/components/stockmarket/StockMarketUI.tsx';

import { ATMInterface } from './ui/ATMInterface.ts';
import { FontUtils } from './game/utils/FontUtils.ts';
import { balanceManager } from './services/BalanceManager.ts';
import { suppressFedCMWarnings } from './utils/googleAuth.ts';

let hudRootRef: ReactDOM.Root | null = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Suppress Google FedCM warnings early
  suppressFedCMWarnings();
  
  // Initialize game fonts first
  await FontUtils.initializeGameFonts();
  // Get root container for React
  const rootElement = document.getElementById('root');
  
  // Render the React app with routing in the root container
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(App)
      )
    );
  }
  
  // Initialize the banking UI separately
  initializeBankingUI();
  
  // Initialize the stock market UI separately
  initializeStockMarketUI();
  

  
  // Initialize the ATM interface
  initializeATMInterface();
});

// Function to initialize banking UI
function initializeBankingUI() {
  const bankingUIContainer = document.getElementById('banking-ui-container');
  
  if (bankingUIContainer) {
    // Create a root and explicitly render the BankingUI component
    const bankingUIRoot = ReactDOM.createRoot(bankingUIContainer);
    bankingUIRoot.render(React.createElement(BankingUI));
    
    // Make sure the banking container is visible
    bankingUIContainer.style.display = 'block';
    
    console.log("Banking UI initialized and mounted");
  } else {
    console.error("Could not find banking-ui-container element");
  }
}

// Function to initialize stock market UI
function initializeStockMarketUI() {
  const stockMarketUIContainer = document.getElementById('stock-market-ui-container');
  
  if (stockMarketUIContainer) {
    // Create a root and explicitly render the StockMarketUI component
    const stockMarketUIRoot = ReactDOM.createRoot(stockMarketUIContainer);
    stockMarketUIRoot.render(React.createElement(StockMarketUI));
    
    // Make sure the stock market container is visible
    stockMarketUIContainer.style.display = 'block';
    
    console.log("Stock Market UI initialized and mounted");
  } else {
    console.error("Could not find stock-market-ui-container element");
  }
}

// Function to initialize post office UI


// Function to initialize ATM interface
function initializeATMInterface() {
  // Initialize the ATM interface (it doesn't need a container like React components)
  const atmInterface = new ATMInterface();
  
  // Store reference globally for cleanup if needed
  (window as any).atmInterface = atmInterface;
  
  console.log("ATM Interface initialized");
}

// Function to initialize HUD - will be called from game.ts when game starts
export function initializeHUD(initialRupees = 0) {
  const hudContainer = document.getElementById('hud-container');
  
  if (hudContainer) {
    // Initialize balance manager with game state
    balanceManager.initializeFromGameState(initialRupees);
    
    // Make HUD visible
    hudContainer.style.display = 'block';
    
    // Mount React component
    hudRootRef = ReactDOM.createRoot(hudContainer);
    hudRootRef.render(
      React.createElement(GameHUD, { rupees: initialRupees })
    );
    
    return hudRootRef;
  }
  
  return null;
}

/**
 * Unmount the HUD React root and hide the container
 */
export function unmountHUD() {
  const hudContainer = document.getElementById('hud-container');
  if (hudRootRef) {
    hudRootRef.unmount();
    hudRootRef = null;
  }
  if (hudContainer) {
    hudContainer.style.display = 'none';
  }
}

// Create a function to update the HUD from Phaser
export function updateHUD(rupees: number) {
  // Dispatch a custom event that the React component will listen for
  window.dispatchEvent(
    new CustomEvent('rupee-update', { detail: { rupees } })
  );
}
