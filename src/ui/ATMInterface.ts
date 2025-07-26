import { EventBus } from '../utils/EventBus';
import { BankAccount } from '../types/BankAccount';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ATMDashboard from './components/atm/ATMDashboard';
import { balanceManager } from '../services/BalanceManager';

export class ATMInterface {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentATMName: string = '';
  private bankAccount: BankAccount | null = null;
  private onDeposit: ((amount: number) => Promise<boolean>) | null = null;
  private onWithdraw: ((amount: number) => Promise<boolean>) | null = null;
  private onCreateFixedDeposit: ((amount: number, duration: number) => Promise<boolean>) | null = null;
  private onViewTransactions: (() => void) | null = null;
  private onCheckBalance: (() => void) | null = null;
  private onClose: (() => void) | null = null;
  private reactRoot: any = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('show-atm-interface', this.showInterface.bind(this));
    EventBus.on('show-atm-pin-setup', this.showPinSetup.bind(this));
    EventBus.on('show-atm-pin-entry', this.showPinEntry.bind(this));
    EventBus.on('show-atm-success', this.showSuccessMessage.bind(this));
    EventBus.on('show-atm-error', this.showErrorMessage.bind(this));
    EventBus.on('show-atm-transactions', this.showTransactions.bind(this));
    EventBus.on('show-atm-balance', this.showBalance.bind(this));
  }

  private showInterface(data: any): void {
    console.log('ATMInterface.showInterface called with data:', data);
    
    this.currentATMName = data.atmName;
    this.bankAccount = data.bankAccount;
    this.onDeposit = data.onDeposit;
    this.onWithdraw = data.onWithdraw;
    this.onCreateFixedDeposit = data.onCreateFixedDeposit;
    this.onViewTransactions = data.onViewTransactions;
    this.onCheckBalance = data.onCheckBalance;
    this.onClose = data.onClose;

    console.log('Creating ATM interface...');
    this.createATMInterface();
    this.show();
    console.log('ATM interface should now be visible');
  }

  private showPinSetup(data: any): void {
    this.currentATMName = data.atmName;
    this.createPinSetupInterface(data.onPinSetup, data.onCancel);
    this.show();
  }

  private showPinEntry(data: any): void {
    this.currentATMName = data.atmName;
    this.createPinEntryInterface(data.onPinVerified, data.onCancel);
    this.show();
  }

  private createATMInterface(): void {
    console.log('Creating ATM interface with data:', {
      atmName: this.currentATMName,
      bankAccount: this.bankAccount,
      hasDeposit: !!this.onDeposit,
      hasWithdraw: !!this.onWithdraw
    });

    // Remove any existing container first
    if (this.container) {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
      }
      this.container.remove();
    }
    
    // Create container for React component
    this.container = document.createElement("div");
    this.container.id = "atm-interface-root";
    this.container.style.position = "fixed";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100vw";
    this.container.style.height = "100vh";
    this.container.style.zIndex = "9999";
    this.container.style.pointerEvents = "auto";
    document.body.appendChild(this.container);
    
    console.log('ATM container created and appended to body');
    
    // Get current player rupees from the game state
    const playerRupees = this.getPlayerRupees();
    console.log('Player rupees:', playerRupees);
    
    try {
      // Create React root and render ATM Dashboard
      this.reactRoot = ReactDOM.createRoot(this.container);
      
      const atmProps = {
        onClose: () => this.close(),
        playerRupees: playerRupees,
        atmName: this.currentATMName,
        bankAccount: this.bankAccount,
        onDeposit: this.onDeposit || (() => Promise.resolve(false)),
        onWithdraw: this.onWithdraw || (() => Promise.resolve(false)),
        onCreateFixedDeposit: this.onCreateFixedDeposit || (() => Promise.resolve(false)),
        onViewTransactions: this.onViewTransactions || (() => {}),
        onCheckBalance: this.onCheckBalance || (() => {}),
      };
      
      console.log('ATM props:', atmProps);
      
      this.reactRoot.render(
        React.createElement(ATMDashboard, atmProps)
      );
      
      console.log('React ATM interface created and rendered successfully');
      
      // Force a reflow to ensure the component is visible
      this.container.offsetHeight;
      
    } catch (error) {
      console.error('Error creating React ATM interface:', error);
      
      // Fallback to a simple HTML interface if React fails
      this.createFallbackATMInterface();
    }
  }

  private getPlayerRupees(): number {
    // Get player rupees from balance manager (most reliable source)
    try {
      const balance = balanceManager.getBalance();
      return balance.cash;
    } catch (error) {
      console.warn('Could not get player rupees from balance manager:', error);
      
      // Fallback to game state
      try {
        const gameState = (window as any).gameState;
        if (gameState && typeof gameState.playerRupees === 'number') {
          return gameState.playerRupees;
        }
      } catch (gameStateError) {
        console.warn('Could not get player rupees from game state:', gameStateError);
      }
      
      // Last resort fallback
      return 0;
    }
  }

  private createFallbackATMInterface(): void {
    console.log('Creating fallback ATM interface');
    
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create fallback UI
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    
    const dialog = document.createElement("div");
    dialog.style.background = "linear-gradient(135deg, #1e3a8a, #1e40af)";
    dialog.style.padding = "2rem";
    dialog.style.borderRadius = "1rem";
    dialog.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    dialog.style.maxWidth = "600px";
    dialog.style.width = "90%";
    dialog.style.color = "white";
    dialog.style.textAlign = "center";
    
    const playerRupees = this.getPlayerRupees();
    const balance = this.bankAccount?.balance || 0;
    
    dialog.innerHTML = `
      <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #FFD700;">
        ${this.currentATMName} Services
      </h2>
      <p style="color: #93C5FD; margin-bottom: 2rem;">
        Automated Banking Terminal
      </p>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem;">
        <p style="color: #93C5FD; font-size: 0.875rem; margin-bottom: 0.5rem;">Current Balance</p>
        <p style="font-size: 1.5rem; font-weight: bold; color: #FFD700;">₹${balance.toLocaleString()}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
        <button id="atm-deposit" style="background: #16a34a; color: white; border: none; padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          💰 Deposit
        </button>
        <button id="atm-withdraw" style="background: #dc2626; color: white; border: none; padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          💸 Withdraw
        </button>
        <button id="atm-balance" style="background: #2563eb; color: white; border: none; padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          📊 Balance
        </button>
        <button id="atm-transactions" style="background: #9333ea; color: white; border: none; padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          📋 History
        </button>
      </div>
      
      <button id="atm-close" style="background: #4b5563; color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
        ❌ Exit
      </button>
    `;
    
    this.container.appendChild(dialog);
    
    // Add event listeners
    const depositBtn = dialog.querySelector('#atm-deposit') as HTMLButtonElement;
    const withdrawBtn = dialog.querySelector('#atm-withdraw') as HTMLButtonElement;
    const balanceBtn = dialog.querySelector('#atm-balance') as HTMLButtonElement;
    const transactionsBtn = dialog.querySelector('#atm-transactions') as HTMLButtonElement;
    const closeBtn = dialog.querySelector('#atm-close') as HTMLButtonElement;
    
    depositBtn?.addEventListener('click', () => {
      const amount = prompt('Enter deposit amount:');
      if (amount && this.onDeposit) {
        this.onDeposit(parseFloat(amount));
      }
    });
    
    withdrawBtn?.addEventListener('click', () => {
      const amount = prompt('Enter withdrawal amount:');
      if (amount && this.onWithdraw) {
        this.onWithdraw(parseFloat(amount));
      }
    });
    
    balanceBtn?.addEventListener('click', () => {
      if (this.onCheckBalance) {
        this.onCheckBalance();
      }
    });
    
    transactionsBtn?.addEventListener('click', () => {
      if (this.onViewTransactions) {
        this.onViewTransactions();
      }
    });
    
    closeBtn?.addEventListener('click', () => {
      this.close();
    });
    
    console.log('Fallback ATM interface created');
  }

  private createPinSetupInterface(onPinSetup: (pin: string) => void, onCancel: () => void): void {
    // Remove any existing container first
    if (this.container) {
      this.container.remove();
    }
    
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100vw";
    this.container.style.height = "100vh";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.container.style.zIndex = "9999";
    
    const dialog = document.createElement("div");
    dialog.style.background = "linear-gradient(135deg, #1e3a8a, #1e40af)";
    dialog.style.padding = "2rem";
    dialog.style.borderRadius = "1rem";
    dialog.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    dialog.style.maxWidth = "400px";
    dialog.style.width = "90%";
    dialog.style.color = "white";
    dialog.style.textAlign = "center";
    
    dialog.innerHTML = `
      <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #FFD700;">
        ${this.currentATMName}
      </h2>
      <p style="color: #93C5FD; margin-bottom: 2rem;">
        Set up your ATM PIN (4 digits)
      </p>
      <input type="password" id="pin-input" maxlength="4" 
             style="width: 100%; padding: 1rem; font-size: 1.5rem; text-align: center; 
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 0.5rem; color: white; margin-bottom: 2rem;"
             placeholder="Enter 4-digit PIN">
      <div style="display: flex; gap: 1rem;">
        <button id="setup-pin-btn" 
                style="flex: 1; background: #16a34a; color: white; border: none; 
                       padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Set PIN
        </button>
        <button id="cancel-pin-btn" 
                style="flex: 1; background: #dc2626; color: white; border: none; 
                       padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Cancel
        </button>
      </div>
    `;
    
    this.container.appendChild(dialog);
    document.body.appendChild(this.container);
    
    const pinInput = dialog.querySelector('#pin-input') as HTMLInputElement;
    const setupBtn = dialog.querySelector('#setup-pin-btn') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cancel-pin-btn') as HTMLButtonElement;
    
    setupBtn.addEventListener('click', () => {
      const pin = pinInput.value;
      if (pin.length === 4 && /^\d{4}$/.test(pin)) {
        onPinSetup(pin);
      } else {
        alert('Please enter a valid 4-digit PIN');
      }
    });
    
    cancelBtn.addEventListener('click', onCancel);
    pinInput.focus();
  }

  private createPinEntryInterface(onPinVerified: (pin: string) => void, onCancel: () => void): void {
    // Remove any existing container first
    if (this.container) {
      this.container.remove();
    }
    
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100vw";
    this.container.style.height = "100vh";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.container.style.zIndex = "9999";
    
    const dialog = document.createElement("div");
    dialog.style.background = "linear-gradient(135deg, #1e3a8a, #1e40af)";
    dialog.style.padding = "2rem";
    dialog.style.borderRadius = "1rem";
    dialog.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    dialog.style.maxWidth = "400px";
    dialog.style.width = "90%";
    dialog.style.color = "white";
    dialog.style.textAlign = "center";
    
    dialog.innerHTML = `
      <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #FFD700;">
        ${this.currentATMName}
      </h2>
      <p style="color: #93C5FD; margin-bottom: 2rem;">
        Enter your ATM PIN
      </p>
      <input type="password" id="pin-input" maxlength="4" 
             style="width: 100%; padding: 1rem; font-size: 1.5rem; text-align: center; 
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 0.5rem; color: white; margin-bottom: 2rem;"
             placeholder="Enter PIN">
      <div style="display: flex; gap: 1rem;">
        <button id="verify-pin-btn" 
                style="flex: 1; background: #16a34a; color: white; border: none; 
                       padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Enter
        </button>
        <button id="cancel-pin-btn" 
                style="flex: 1; background: #dc2626; color: white; border: none; 
                       padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Cancel
        </button>
      </div>
    `;
    
    this.container.appendChild(dialog);
    document.body.appendChild(this.container);
    
    const pinInput = dialog.querySelector('#pin-input') as HTMLInputElement;
    const verifyBtn = dialog.querySelector('#verify-pin-btn') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cancel-pin-btn') as HTMLButtonElement;
    
    verifyBtn.addEventListener('click', () => {
      const pin = pinInput.value;
      if (pin.length === 4 && /^\d{4}$/.test(pin)) {
        onPinVerified(pin);
      } else {
        alert('Please enter a valid 4-digit PIN');
      }
    });
    
    cancelBtn.addEventListener('click', onCancel);
    pinInput.focus();
  }

  private showSuccessMessage(data: any): void {
    this.showMessage(data.message, 'success');
  }

  private showErrorMessage(data: any): void {
    this.showMessage(data.message, 'error');
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.padding = "1rem 1.5rem";
    notification.style.borderRadius = "0.5rem";
    notification.style.color = "white";
    notification.style.fontWeight = "500";
    notification.style.zIndex = "10000";
    notification.style.maxWidth = "300px";
    notification.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
    
    if (type === 'success') {
      notification.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
    } else {
      notification.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }

  private showTransactions(data: any): void {
    console.log('Showing transactions:', data);
    // This would typically show a transactions list
    this.showMessage('Transaction history displayed', 'success');
  }

  private showBalance(data: any): void {
    console.log('Showing balance:', data);
    const balance = this.bankAccount?.balance || 0;
    this.showMessage(`Current balance: ₹${balance.toLocaleString()}`, 'success');
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = "flex";
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.isVisible = false;
    }
  }

  public close(): void {
    if (this.container) {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
      }
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
    
    // Call the onClose callback if provided
    if (this.onClose) {
      this.onClose();
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }
}