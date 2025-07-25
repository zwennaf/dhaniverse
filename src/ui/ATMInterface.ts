import { EventBus } from '../utils/EventBus';
import { BankAccount } from '../types/BankAccount';

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
    // Remove any existing container first
    if (this.container) {
      this.container.remove();
    }
    
    this.container = document.createElement("div");
    this.container.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center";
    this.container.style.zIndex = "9999";
    this.container.style.position = "fixed";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    
    console.log('ATM container created with styles:', this.container.style.cssText);
    
    // Create the main dialog div
    const dialog = document.createElement("div");
    dialog.className = "bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-blue-600";
    
    // Add inline styles as fallback
    dialog.style.background = "linear-gradient(135deg, #1e3a8a, #1e40af)";
    dialog.style.padding = "2rem";
    dialog.style.borderRadius = "0.5rem";
    dialog.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    dialog.style.maxWidth = "42rem";
    dialog.style.width = "100%";
    dialog.style.margin = "0 1rem";
    dialog.style.border = "1px solid #2563eb";
    dialog.style.color = "white";
    
    console.log('ATM dialog created with inline styles');
    
    // Create header section
    const header = document.createElement("div");
    header.className = "text-center mb-6";
    
    const title = document.createElement("h2");
    title.className = "text-3xl font-bold text-white mb-2";
    title.textContent = "ATM Services";
    
    const atmName = document.createElement("p");
    atmName.className = "text-blue-200";
    atmName.textContent = this.currentATMName;
    
    const balanceContainer = document.createElement("div");
    balanceContainer.className = "mt-4 p-4 bg-blue-800 rounded-lg";
    
    const balanceLabel = document.createElement("p");
    balanceLabel.className = "text-blue-200 text-sm";
    balanceLabel.textContent = "Current Balance";
    
    const balanceAmount = document.createElement("p");
    balanceAmount.className = "text-2xl font-bold text-white";
    balanceAmount.textContent = `₹${this.bankAccount?.balance?.toFixed(2) || "0.00"}`;
    
    balanceContainer.appendChild(balanceLabel);
    balanceContainer.appendChild(balanceAmount);
    
    header.appendChild(title);
    header.appendChild(atmName);
    header.appendChild(balanceContainer);
    
    // Create buttons grid
    const buttonsGrid = document.createElement("div");
    buttonsGrid.className = "grid grid-cols-2 gap-4 mb-6";
    
    // Add inline styles for the grid to ensure it works
    buttonsGrid.style.display = "grid";
    buttonsGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
    buttonsGrid.style.gap = "1rem";
    buttonsGrid.style.marginBottom = "1.5rem";
    
    // Create buttons
    const buttons = [
      { id: "atm-deposit-btn", class: "bg-green-600 hover:bg-green-700", icon: "💰", text: "Deposit" },
      { id: "atm-withdraw-btn", class: "bg-red-600 hover:bg-red-700", icon: "💸", text: "Withdraw" },
      { id: "atm-balance-btn", class: "bg-blue-600 hover:bg-blue-700", icon: "📊", text: "Balance" },
      { id: "atm-transactions-btn", class: "bg-purple-600 hover:bg-purple-700", icon: "📋", text: "Transactions" },
      { id: "atm-fixed-deposit-btn", class: "bg-yellow-600 hover:bg-yellow-700", icon: "🏦", text: "Fixed Deposit" },
      { id: "atm-close-btn", class: "bg-gray-600 hover:bg-gray-700", icon: "❌", text: "Exit" }
    ];
    
    buttons.forEach(buttonConfig => {
      const button = document.createElement("button");
      button.id = buttonConfig.id;
      button.className = `${buttonConfig.class} text-white font-medium py-4 px-6 rounded-lg transition-colors flex flex-col items-center`;
      
      // Add inline styles for buttons to ensure they work
      button.style.color = "white";
      button.style.fontWeight = "500";
      button.style.padding = "1rem 1.5rem";
      button.style.borderRadius = "0.5rem";
      button.style.display = "flex";
      button.style.flexDirection = "column";
      button.style.alignItems = "center";
      button.style.cursor = "pointer";
      button.style.border = "none";
      button.style.transition = "all 0.2s";
      
      // Set background colors based on button type
      if (buttonConfig.id === "atm-deposit-btn") {
        button.style.backgroundColor = "#16a34a";
      } else if (buttonConfig.id === "atm-withdraw-btn") {
        button.style.backgroundColor = "#dc2626";
      } else if (buttonConfig.id === "atm-balance-btn") {
        button.style.backgroundColor = "#2563eb";
      } else if (buttonConfig.id === "atm-transactions-btn") {
        button.style.backgroundColor = "#9333ea";
      } else if (buttonConfig.id === "atm-fixed-deposit-btn") {
        button.style.backgroundColor = "#ca8a04";
      } else if (buttonConfig.id === "atm-close-btn") {
        button.style.backgroundColor = "#4b5563";
      }
      
      const iconSpan = document.createElement("span");
      iconSpan.className = "text-2xl mb-2";
      iconSpan.style.fontSize = "1.5rem";
      iconSpan.style.marginBottom = "0.5rem";
      iconSpan.textContent = buttonConfig.icon;
      
      const textSpan = document.createElement("span");
      textSpan.textContent = buttonConfig.text;
      
      button.appendChild(iconSpan);
      button.appendChild(textSpan);
      buttonsGrid.appendChild(button);
    });
    
    // Create action area
    const actionArea = document.createElement("div");
    actionArea.id = "atm-action-area";
    actionArea.className = "hidden";
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(buttonsGrid);
    dialog.appendChild(actionArea);
    
    this.container.appendChild(dialog);
    
    // Ensure the container is appended to body and visible
    document.body.appendChild(this.container);
    console.log('ATM container appended to body');
    
    // Force display to be visible
    this.container.style.display = "flex";
    
    this.setupATMEventListeners();
    console.log('ATM event listeners set up');
  }

  private setupATMEventListeners(): void {
    if (!this.container) return;

    const depositBtn = this.container.querySelector('#atm-deposit-btn');
    const withdrawBtn = this.container.querySelector('#atm-withdraw-btn');
    const balanceBtn = this.container.querySelector('#atm-balance-btn');
    const transactionsBtn = this.container.querySelector('#atm-transactions-btn');
    const fixedDepositBtn = this.container.querySelector('#atm-fixed-deposit-btn');
    const closeBtn = this.container.querySelector('#atm-close-btn');

    depositBtn?.addEventListener('click', () => this.showDepositForm());
    withdrawBtn?.addEventListener('click', () => this.showWithdrawForm());
    balanceBtn?.addEventListener('click', () => this.onCheckBalance?.());
    transactionsBtn?.addEventListener('click', () => this.onViewTransactions?.());
    fixedDepositBtn?.addEventListener('click', () => this.showFixedDepositForm());
    closeBtn?.addEventListener('click', () => this.close());
  }

  private showDepositForm(): void {
    const actionArea = this.container?.querySelector('#atm-action-area');
    if (!actionArea) return;

    actionArea.className = 'block mt-6 p-4 bg-blue-800 rounded-lg';
    
    // Clear existing content
    actionArea.innerHTML = "";
    
    // Create deposit form elements
    const title = document.createElement("h3");
    title.className = "text-xl font-bold text-white mb-4";
    title.textContent = "Deposit Money";
    
    const formDiv = document.createElement("div");
    formDiv.className = "space-y-4";
    
    const inputDiv = document.createElement("div");
    const label = document.createElement("label");
    label.className = "block text-blue-200 text-sm font-medium mb-2";
    label.textContent = "Amount to Deposit";
    
    const input = document.createElement("input");
    input.type = "number";
    input.id = "deposit-amount";
    input.min = "1";
    input.step = "0.01";
    input.className = "w-full px-4 py-2 bg-blue-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400";
    input.placeholder = "Enter amount";
    
    inputDiv.appendChild(label);
    inputDiv.appendChild(input);
    
    const buttonDiv = document.createElement("div");
    buttonDiv.className = "flex space-x-3";
    
    const confirmBtn = document.createElement("button");
    confirmBtn.id = "confirm-deposit";
    confirmBtn.className = "flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    confirmBtn.textContent = "Deposit";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancel-deposit";
    cancelBtn.className = "flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    cancelBtn.textContent = "Cancel";
    
    buttonDiv.appendChild(confirmBtn);
    buttonDiv.appendChild(cancelBtn);
    
    formDiv.appendChild(inputDiv);
    formDiv.appendChild(buttonDiv);
    
    actionArea.appendChild(title);
    actionArea.appendChild(formDiv);

    // Add event listeners
    confirmBtn.addEventListener('click', async () => {
      const amount = parseFloat(input.value);
      if (amount > 0 && this.onDeposit) {
        const success = await this.onDeposit(amount);
        if (success) {
          this.hideActionArea();
          this.updateBalance();
        }
      }
    });

    cancelBtn.addEventListener('click', () => this.hideActionArea());
    input.focus();
  }

  private showWithdrawForm(): void {
    const actionArea = this.container?.querySelector('#atm-action-area');
    if (!actionArea) return;

    actionArea.className = 'block mt-6 p-4 bg-blue-800 rounded-lg';
    
    // Clear existing content
    actionArea.innerHTML = "";
    
    // Create withdraw form elements
    const title = document.createElement("h3");
    title.className = "text-xl font-bold text-white mb-4";
    title.textContent = "Withdraw Money";
    
    const formDiv = document.createElement("div");
    formDiv.className = "space-y-4";
    
    // Amount input section
    const inputDiv = document.createElement("div");
    const label = document.createElement("label");
    label.className = "block text-blue-200 text-sm font-medium mb-2";
    label.textContent = "Amount to Withdraw";
    
    const input = document.createElement("input");
    input.type = "number";
    input.id = "withdraw-amount";
    input.min = "1";
    input.step = "0.01";
    input.max = String(this.bankAccount?.balance || 0);
    input.className = "w-full px-4 py-2 bg-blue-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400";
    input.placeholder = "Enter amount";
    
    inputDiv.appendChild(label);
    inputDiv.appendChild(input);
    
    // Quick amount buttons
    const quickButtonsDiv = document.createElement("div");
    quickButtonsDiv.className = "grid grid-cols-3 gap-2 mb-4";
    
    const quickAmounts = [
      { amount: "20", text: "₹20" },
      { amount: "50", text: "₹50" },
      { amount: "100", text: "₹100" }
    ];
    
    quickAmounts.forEach(({ amount, text }) => {
      const btn = document.createElement("button");
      btn.className = "quick-amount bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm";
      btn.setAttribute("data-amount", amount);
      btn.textContent = text;
      btn.addEventListener('click', () => {
        input.value = amount;
      });
      quickButtonsDiv.appendChild(btn);
    });
    
    // Action buttons
    const buttonDiv = document.createElement("div");
    buttonDiv.className = "flex space-x-3";
    
    const confirmBtn = document.createElement("button");
    confirmBtn.id = "confirm-withdraw";
    confirmBtn.className = "flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    confirmBtn.textContent = "Withdraw";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancel-withdraw";
    cancelBtn.className = "flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    cancelBtn.textContent = "Cancel";
    
    buttonDiv.appendChild(confirmBtn);
    buttonDiv.appendChild(cancelBtn);
    
    // Assemble form
    formDiv.appendChild(inputDiv);
    formDiv.appendChild(quickButtonsDiv);
    formDiv.appendChild(buttonDiv);
    
    actionArea.appendChild(title);
    actionArea.appendChild(formDiv);

    // Add event listeners
    confirmBtn.addEventListener('click', async () => {
      const amount = parseFloat(input.value);
      if (amount > 0 && this.onWithdraw) {
        const success = await this.onWithdraw(amount);
        if (success) {
          this.hideActionArea();
          this.updateBalance();
        }
      }
    });

    cancelBtn.addEventListener('click', () => this.hideActionArea());
    input.focus();
  }

  private showFixedDepositForm(): void {
    const actionArea = this.container?.querySelector('#atm-action-area');
    if (!actionArea) return;

    actionArea.className = 'block mt-6 p-4 bg-blue-800 rounded-lg';
    
    // Clear existing content
    actionArea.innerHTML = "";
    
    // Create fixed deposit form elements
    const title = document.createElement("h3");
    title.className = "text-xl font-bold text-white mb-4";
    title.textContent = "Create Fixed Deposit";
    
    const formDiv = document.createElement("div");
    formDiv.className = "space-y-4";
    
    // Amount input
    const amountDiv = document.createElement("div");
    const amountLabel = document.createElement("label");
    amountLabel.className = "block text-blue-200 text-sm font-medium mb-2";
    amountLabel.textContent = "Amount";
    
    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.id = "fd-amount";
    amountInput.min = "100";
    amountInput.step = "0.01";
    amountInput.className = "w-full px-4 py-2 bg-blue-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400";
    amountInput.placeholder = "Minimum ₹100";
    
    amountDiv.appendChild(amountLabel);
    amountDiv.appendChild(amountInput);
    
    // Duration select
    const durationDiv = document.createElement("div");
    const durationLabel = document.createElement("label");
    durationLabel.className = "block text-blue-200 text-sm font-medium mb-2";
    durationLabel.textContent = "Duration (months)";
    
    const durationSelect = document.createElement("select");
    durationSelect.id = "fd-duration";
    durationSelect.className = "w-full px-4 py-2 bg-blue-700 border border-blue-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400";
    
    const options = [
      { value: "6", text: "6 months (5% APR)" },
      { value: "12", text: "12 months (6% APR)" },
      { value: "24", text: "24 months (7% APR)" }
    ];
    
    options.forEach(({ value, text }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      durationSelect.appendChild(option);
    });
    
    durationDiv.appendChild(durationLabel);
    durationDiv.appendChild(durationSelect);
    
    // Buttons
    const buttonDiv = document.createElement("div");
    buttonDiv.className = "flex space-x-3";
    
    const confirmBtn = document.createElement("button");
    confirmBtn.id = "confirm-fd";
    confirmBtn.className = "flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    confirmBtn.textContent = "Create FD";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancel-fd";
    cancelBtn.className = "flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors";
    cancelBtn.textContent = "Cancel";
    
    buttonDiv.appendChild(confirmBtn);
    buttonDiv.appendChild(cancelBtn);
    
    // Assemble form
    formDiv.appendChild(amountDiv);
    formDiv.appendChild(durationDiv);
    formDiv.appendChild(buttonDiv);
    
    actionArea.appendChild(title);
    actionArea.appendChild(formDiv);

    // Add event listeners
    confirmBtn.addEventListener('click', async () => {
      const amount = parseFloat(amountInput.value);
      const duration = parseInt(durationSelect.value);
      if (amount >= 100 && this.onCreateFixedDeposit) {
        const success = await this.onCreateFixedDeposit(amount, duration);
        if (success) {
          this.hideActionArea();
          this.updateBalance();
        }
      }
    });

    cancelBtn.addEventListener('click', () => this.hideActionArea());
    amountInput.focus();
  }

  private createPinSetupInterface(onPinSetup: (pin: string, confirmPin: string) => void, onCancel: () => void): void {
    // This method is not used since we're skipping PIN setup for now
    console.log('PIN setup interface creation skipped');
  }

  private createPinEntryInterface(onPinVerified: (pin: string) => void, onCancel: () => void): void {
    // This method is not used since we're skipping PIN entry for now
    console.log('PIN entry interface creation skipped');
  }

  private hideActionArea(): void {
    const actionArea = this.container?.querySelector('#atm-action-area');
    if (actionArea) {
      actionArea.className = 'hidden';
      actionArea.innerHTML = '';
    }
  }

  private updateBalance(): void {
    const balanceElement = this.container?.querySelector('.text-2xl.font-bold.text-white');
    if (balanceElement && this.bankAccount) {
      balanceElement.textContent = `₹${this.bankAccount.balance.toFixed(2)}`;
    }
  }

  private showSuccessMessage(message: string): void {
    this.showMessage(message, 'success');
  }

  private showErrorMessage(message: string): void {
    this.showMessage(message, 'error');
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-60 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  private showTransactions(data: any): void {
    console.log('Show ATM transactions:', data);
  }

  private showBalance(data: any): void {
    console.log('Show ATM balance:', data);
  }

  private show(): void {
    this.isVisible = true;
    // Make sure the container is visible
    if (this.container) {
      this.container.style.display = 'flex';
      console.log('ATM interface container made visible');
    }
  }

  private hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
  }

  private close(): void {
    this.hide();
    EventBus.emit('atm-closed');
    this.onClose?.();
  }

  destroy(): void {
    this.hide();
    EventBus.off('show-atm-interface', this.showInterface.bind(this));
    EventBus.off('show-atm-pin-setup', this.showPinSetup.bind(this));
    EventBus.off('show-atm-pin-entry', this.showPinEntry.bind(this));
    EventBus.off('show-atm-success', this.showSuccessMessage.bind(this));
    EventBus.off('show-atm-error', this.showErrorMessage.bind(this));
    EventBus.off('show-atm-transactions', this.showTransactions.bind(this));
    EventBus.off('show-atm-balance', this.showBalance.bind(this));
  }
}