import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './ui/App.tsx';
import GlobalIntro from './ui/components/GlobalIntro';
import GameHUD from './ui/components/hud/GameHUD.tsx';
import BankingUI from './ui/components/banking/BankingUI.tsx';
import { initializeBankAccountCreationFlow } from './ui/components/banking/BankAccountCreationFlow.tsx';
// Lazily load StockMarketUI when needed to avoid eager network/canister calls
// Note: component will be dynamically imported when the player unlocks stock market
// See `initializeStockMarketUI` below which performs the dynamic import.
import { AuthProvider } from './ui/contexts/AuthContext.tsx';
import { banCheckService } from './services/BanCheckService.ts';
import { initializeRouting } from './utils/navigation.ts';

// Optional: Vercel Speed Insights (Next.js component). If package isn't installed this import will be ignored by TypeScript with the ts-ignore below.

import { SpeedInsights } from '@vercel/speed-insights/react';

import { ATMInterface } from './ui/ATMInterface.ts';
import { FontUtils } from './game/utils/FontUtils.ts';
import { balanceManager } from './services/BalanceManager.ts';
import { suppressFedCMWarnings } from './utils/googleAuth.ts';

let hudRootRef: ReactDOM.Root | null = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize routing system first (handles cross-domain redirects)
  // NOTE: Commented out to let React Router handle routing instead
  // initializeRouting();
  
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
        React.createElement(
          React.Fragment,
          null,
            React.createElement(GlobalIntro, null),
            React.createElement(App, null),
            React.createElement(SpeedInsights, null)
        )
      )
    );
  }
  
  // Initialize the banking UI separately
  initializeBankingUI();
  // Mount the bank account creation flow root (hidden until event)
  initializeBankAccountCreationFlow();
  
    // Stock market UI must NOT be initialized eagerly. It will be mounted
    // when the player reaches/unlocks the Stock Market (see ProgressionManager).
  

  
  // Initialize the ATM interface
  initializeATMInterface();

  // Listen for progression unlock that should mount stock market UI lazily
  window.addEventListener('stockMarketUnlocked', () => {
    console.log('stockMarketUnlocked event received — mounting Stock Market UI');
    try { initializeStockMarketUI(); } catch (e) { console.error('Failed to initialize stock market UI:', e); }
  });
  // Listen for game initialization errors (e.g., WebGL unsupported) and show overlay
  setupGameErrorOverlay();
});

// Function to initialize banking UI
function initializeBankingUI() {
  const bankingUIContainer = document.getElementById('banking-ui-container');
  
  if (bankingUIContainer) {
    // Create a root and explicitly render the BankingUI component wrapped in AuthProvider
    const bankingUIRoot = ReactDOM.createRoot(bankingUIContainer);
    bankingUIRoot.render(
      React.createElement(AuthProvider, null,
        React.createElement(BankingUI)
      )
    );
    
    // Make sure the banking container is visible
    bankingUIContainer.style.display = 'block';
    
    console.log("Banking UI initialized and mounted with AuthProvider");
  } else {
    console.error("Could not find banking-ui-container element");
  }
}

// Function to initialize stock market UI (singleton pattern)
let stockMarketUIRoot: any = null;
let stockMarketUIInitialized = false;

function initializeStockMarketUI() {
  const stockMarketUIContainer = document.getElementById('stock-market-ui-container');
  
  if (!stockMarketUIContainer) {
    console.warn('Stock Market UI container not found');
    return;
  }

  // Avoid mounting the stock market UI on pages that don't need it (e.g., /signin, /profile)
  const path = window.location.pathname || '/';
  const shouldMount = path.endsWith('/game');

  if (!shouldMount) {
    console.log(`Skipping Stock Market UI mount on path=${path}`);
    return;
  }

  // Only create root once
  if (stockMarketUIInitialized) {
    console.log('Stock Market UI already initialized, skipping...');
    return;
  }

  stockMarketUIInitialized = true;
  
  // Dynamically import and mount `StockMarketUI` only when needed
  stockMarketUIRoot = ReactDOM.createRoot(stockMarketUIContainer);
  import('./ui/components/stockmarket/StockMarketUI.tsx').then(({ default: StockMarketUI }) => {
    stockMarketUIRoot.render(
      React.createElement(AuthProvider, null,
        React.createElement(StockMarketUI)
      )
    );
    // Make sure the stock market container is visible after mount
    stockMarketUIContainer.style.display = 'block';
    console.log('StockMarketUI dynamically imported and mounted');
  }).catch(err => {
    console.error('Failed to dynamically load StockMarketUI:', err);
    stockMarketUIInitialized = false; // Reset on error
  });
  
  console.log("Stock Market UI mount initiated (dynamic import)");
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

// Error overlay for game initialization failures (WebGL unsupported, etc.)
function setupGameErrorOverlay() {
  const existing = document.getElementById('game-error-overlay');
  if (existing) return; // avoid duplicates

  const overlay = document.createElement('div');
  overlay.id = 'game-error-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:2000;display:none;
    background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);
    align-items:center;justify-content:center;font-family:Arial,system-ui,sans-serif;`;

  overlay.innerHTML = `
    <div style="max-width:460px;padding:28px 30px;background:#111;border:1px solid rgba(255,215,0,0.25);border-radius:14px;box-shadow:0 4px 28px -4px rgba(0,0,0,.6),0 0 0 1px rgba(255,215,0,.05);color:#eee;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#3a3010,#735f12);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:22px;">⚠️</span>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:600;letter-spacing:.5px;color:#ffd700;">Game Could Not Start</h2>
      </div>
      <p id="game-error-message" style="margin:0 0 14px;font-size:14px;line-height:1.45;color:#d4d4d4;">An unexpected error occurred while initializing the game.</p>
      <div style="background:#181818;border:1px solid #242424;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#bbb;line-height:1.4;">
        <strong>Tips:</strong> Enable hardware acceleration, update your browser / GPU drivers, or try another browser (Chrome / Firefox). Some private/incognito modes or remote desktops disable WebGL.
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="retry-game-btn" style="flex:1;min-width:140px;background:#ffd700;color:#111;font-weight:600;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:14px;">Reload Page</button>
        <button id="dismiss-game-error-btn" style="background:transparent;color:#aaa;border:1px solid #333;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:14px;">Dismiss</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const reloadBtn = overlay.querySelector('#retry-game-btn') as HTMLButtonElement | null;
  const dismissBtn = overlay.querySelector('#dismiss-game-error-btn') as HTMLButtonElement | null;
  if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
  if (dismissBtn) dismissBtn.onclick = () => { overlay.style.display = 'none'; };

  window.addEventListener('gameAssetLoadingError', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const msgEl = document.getElementById('game-error-message');
    if (msgEl && detail?.error) {
      // Special-case WebGL unsupported text to provide friendlier wording
      const errText = detail.error.toLowerCase().includes('webgl') ?
        'Your browser reported WebGL is unavailable (needed for accelerated graphics). The game can\'t start without it.' : detail.error;
      msgEl.textContent = errText;
    }
    overlay.style.display = 'flex';
  });
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
      React.createElement(AuthProvider, null,
        React.createElement(GameHUD, { rupees: initialRupees })
      )
    );
    
    return hudRootRef;
  }
  
  return null;
}

/**
 * Enhanced game initialization with ban checking
 */
export async function initializeGameWithBanCheck(initialRupees = 0) {
  try {
    // Check ban status before initializing game
    const banStatus = await banCheckService.checkCurrentUserBan();
    
    if (banStatus.banned) {
      console.warn('User is banned, preventing game initialization');
      banCheckService.handleBanDetected(banStatus);
      return null;
    }
    
    // User is not banned, proceed with normal initialization
    return initializeHUD(initialRupees);
  } catch (error) {
    console.error('Ban check failed during game initialization:', error);
    // On error, proceed with game initialization (fail open)
    return initializeHUD(initialRupees);
  }
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
  // Use the balance manager as the single source of truth instead of dispatching events directly
  import('./services/BalanceManager.ts').then(({ balanceManager }) => {
    balanceManager.updateCash(rupees, false); // false = don't notify to prevent loops
  }).catch(console.error);
}

/**
 * Start periodic ban checking during gameplay
 */
let banCheckInterval: number | null = null;

export function startPeriodicBanCheck() {
  if (banCheckInterval) {
    clearInterval(banCheckInterval);
  }
  
  // Check for bans every 2 minutes during gameplay
  banCheckInterval = window.setInterval(async () => {
    try {
      const banStatus = await banCheckService.checkCurrentUserBan();
      if (banStatus.banned) {
        console.warn('User banned during gameplay, handling ban...');
        banCheckService.handleBanDetected(banStatus);
        stopPeriodicBanCheck();
      }
    } catch (error) {
      console.error('Periodic ban check failed:', error);
    }
  }, 2 * 60 * 1000); // 2 minutes
}

export function stopPeriodicBanCheck() {
  if (banCheckInterval) {
    clearInterval(banCheckInterval);
    banCheckInterval = null;
  }
}