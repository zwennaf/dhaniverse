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
    
    // Create simple, working ATM interface
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
    
    // Create simple dialog
    const dialog = document.createElement("div");
    dialog.style.background = "linear-gradient(135deg, #1e3a8a, #1e40af)";
    dialog.style.padding = "2rem";
    dialog.style.borderRadius = "1rem";
    dialog.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    dialog.style.maxWidth = "600px";
    dialog.style.width = "90%";
    dialog.style.color = "white";
    dialog.style.textAlign = "center";
    
    // Create header
    const header = document.createElement("div");
    header.style.marginBottom = "2rem";
    
    const title = document.createElement("h2");
    title.style.fontSize = "2rem";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "0.5rem";
    title.style.color = "#FFD700";
    title.textContent = `${this.currentATMName} Services`;
    
    const subtitle = document.createElement("p");
    subtitle.style.color = "#93C5FD";
    subtitle.textContent = "Automated Banking Terminal";
    
    header.appendChild(title);
    header.appendChild(subtitle);
    
    // Create balance display
    const balanceDisplay = document.createElement("div");
    balanceDisplay.style.background = "rgba(255, 255, 255, 0.1)";
    balanceDisplay.style.padding = "1rem";
    balanceDisplay.style.borderRadius = "0.5rem";
    balanceDisplay.style.marginBottom = "2rem";
    
    const balanceLabel = document.createElement("p");
    balanceLabel.style.color = "#93C5FD";
    balanceLabel.style.fontSize = "0.875rem";
    balanceLabel.style.marginBottom = "0.5rem";
    balanceLabel.textContent = "Current Balance";
    
    const balanceAmount = document.createElement("p");
    balanceAmount.style.fontSize = "1.5rem";
    balanceAmount.style.fontWeight = "bold";
    balanceAmount.style.color = "#FFD700";
    balanceAmount.textContent = `₹${this.bankAccount?.balance?.toLocaleString() || '0'}`;
    
    balanceDisplay.appendChild(balanceLabel);
    balanceDisplay.appendChild(balanceAmount);
    
    // Create buttons
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "grid";
    buttonsContainer.style.gridTemplateColumns = "repeat(2, 1fr)";
    buttonsContainer.style.gap = "1rem";
    buttonsContainer.style.marginBottom = "2rem";
    
    const buttons = [
      { id: "atm-deposit", text: "💰 Deposit", color: "#16a34a", action: () => this.showDepositForm() },
      { id: "atm-withdraw", text: "💸 Withdraw", color: "#dc2626", action: () => this.showWithdrawForm() },
      { id: "atm-balance", text: "📊 Balance", color: "#2563eb", action: () => this.onCheckBalance?.() },
      { id: "atm-transactions", text: "📋 History", color: "#9333ea", action: () => this.onViewTransactions?.() },
      { id: "atm-fd", text: "🏦 Fixed Deposit", color: "#ca8a04", action: () => this.showFixedDepositForm() },
      { id: "atm-close", text: "❌ Exit", color: "#4b5563", action: () => this.close() }
    ];
    
    buttons.forEach(btn => {
      const button = document.createElement("button");
      button.id = btn.id;
      button.textContent = btn.text;
      button.style.background = btn.color;
      button.style.color = "white";
      button.style.border = "none";
      button.style.padding = "1rem";
      button.style.borderRadius = "0.5rem";
      button.style.cursor = "pointer";
      button.style.fontSize = "1rem";
      button.style.fontWeight = "500";
      button.style.transition = "all 0.2s";
      
      button.addEventListener('mouseover', () => {
        button.style.opacity = "0.8";
      });
      
      button.addEventListener('mouseout', () => {
        button.style.opacity = "1";
      });
      
      button.addEventListener('click', btn.action);
      buttonsContainer.appendChild(button);
    });
    
    // Create action area for forms
    const actionArea = document.createElement("div");
    actionArea.id = "atm-action-area";
    actionArea.style.display = "none";
    actionArea.style.marginTop = "1rem";
    actionArea.style.padding = "1rem";
    actionArea.style.background = "rgba(255, 255, 255, 0.1)";
    actionArea.style.borderRadius = "0.5rem";
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(balanceDisplay);
    dialog.appendChild(buttonsContainer);
    dialog.appendChild(actionArea);
    
    this.container.appendChild(dialog);
    
    // Append to body
    document.body.appendChild(this.container);
    console.log('Simple ATM interface created and appended to body');
    
    // Force visibility
    this.container.style.display = "flex";
    this.container.style.visibility = "visible";
    this.container.style.opacity = "1";
    
    console.log('ATM interface should now be visible!');
  }

  private setupATMEventListeners(): void {
    if (!this.container) return;

    // Quick action buttons from the overview section
    const quickDeposit = this.container.querySelector('#quick-deposit');
    const quickWithdraw = this.container.querySelector('#quick-withdraw');
    const quickBalance = this.container.querySelector('#quick-balance');
    const quickFD = this.container.querySelector('#quick-fd');

    quickDeposit?.addEventListener('click', () => this.showDepositForm());
    quickWithdraw?.addEventListener('click', () => this.showWithdrawForm());
    quickBalance?.addEventListener('click', () => this.onCheckBalance?.());
    quickFD?.addEventListener('click', () => this.showFixedDepositForm());

    // Legacy button support (if any exist)
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

  private createModernHeader(): HTMLElement {
    // Modern Header matching BankingDashboard
    const header = document.createElement("div");
    header.className = "relative flex items-center justify-between p-6 border-b border-dhani-gold/20 flex-shrink-0";
    header.style.borderBottom = "1px solid rgba(255, 215, 0, 0.2)";
    header.style.padding = "1.5rem";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    
    // Left side - ATM icon and title
    const leftSide = document.createElement("div");
    leftSide.className = "flex items-center space-x-4";
    leftSide.style.display = "flex";
    leftSide.style.alignItems = "center";
    leftSide.style.gap = "1rem";
    
    // ATM Icon
    const iconContainer = document.createElement("div");
    iconContainer.className = "w-10 h-10 bg-gradient-to-br from-dhani-gold to-dhani-gold/80 rounded-lg flex items-center justify-center";
    iconContainer.style.width = "2.5rem";
    iconContainer.style.height = "2.5rem";
    iconContainer.style.background = "linear-gradient(135deg, #FFD700, rgba(255, 215, 0, 0.8))";
    iconContainer.style.borderRadius = "0.5rem";
    iconContainer.style.display = "flex";
    iconContainer.style.alignItems = "center";
    iconContainer.style.justifyContent = "center";
    iconContainer.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: black"/>
      </svg>
    `;
    
    // Title section
    const titleSection = document.createElement("div");
    const title = document.createElement("h1");
    title.className = "text-xl font-bold text-white tracking-tight";
    title.style.fontSize = "1.25rem";
    title.style.fontWeight = "bold";
    title.style.color = "white";
    title.textContent = `${this.currentATMName} Services`;
    
    const subtitle = document.createElement("p");
    subtitle.className = "text-sm text-gray-400 hidden sm:block";
    subtitle.style.fontSize = "0.875rem";
    subtitle.style.color = "#9CA3AF";
    subtitle.textContent = "Automated Banking Terminal";
    
    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);
    
    leftSide.appendChild(iconContainer);
    leftSide.appendChild(titleSection);
    
    // Right side - Status and Close button
    const rightSide = document.createElement("div");
    rightSide.className = "flex items-center space-x-4";
    rightSide.style.display = "flex";
    rightSide.style.alignItems = "center";
    rightSide.style.gap = "1rem";
    
    // Status indicator
    const statusContainer = document.createElement("div");
    statusContainer.className = "hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10";
    statusContainer.style.display = "flex";
    statusContainer.style.alignItems = "center";
    statusContainer.style.gap = "0.5rem";
    statusContainer.style.padding = "0.375rem 0.75rem";
    statusContainer.style.background = "rgba(255, 255, 255, 0.05)";
    statusContainer.style.borderRadius = "0.5rem";
    statusContainer.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    
    const statusDot = document.createElement("div");
    statusDot.className = "w-2 h-2 rounded-full bg-green-400";
    statusDot.style.width = "0.5rem";
    statusDot.style.height = "0.5rem";
    statusDot.style.borderRadius = "50%";
    statusDot.style.backgroundColor = "#4ADE80";
    
    const statusText = document.createElement("span");
    statusText.className = "text-xs text-gray-300";
    statusText.style.fontSize = "0.75rem";
    statusText.style.color = "#D1D5DB";
    statusText.textContent = "ATM Online";
    
    statusContainer.appendChild(statusDot);
    statusContainer.appendChild(statusText);
    
    // Close button
    const closeButton = document.createElement("button");
    closeButton.className = "w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-red-600 hover:border-red-400";
    closeButton.style.width = "2rem";
    closeButton.style.height = "2rem";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.style.color = "#F87171";
    closeButton.style.borderRadius = "0.5rem";
    closeButton.style.border = "1px solid #DC2626";
    closeButton.style.cursor = "pointer";
    closeButton.style.transition = "all 0.2s";
    closeButton.addEventListener('click', () => this.close());
    closeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    
    rightSide.appendChild(statusContainer);
    rightSide.appendChild(closeButton);
    
    header.appendChild(leftSide);
    header.appendChild(rightSide);
    
    return header;
  }

  private createBalanceSection(): HTMLElement {
    // Modern Balance Cards matching BankingDashboard
    const balanceSection = document.createElement("div");
    balanceSection.className = "p-6 border-b border-dhani-gold/10 flex-shrink-0";
    balanceSection.style.padding = "1.5rem";
    balanceSection.style.borderBottom = "1px solid rgba(255, 215, 0, 0.1)";
    
    const balanceGrid = document.createElement("div");
    balanceGrid.className = "grid grid-cols-1 md:grid-cols-3 gap-4";
    balanceGrid.style.display = "grid";
    balanceGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(250px, 1fr))";
    balanceGrid.style.gap = "1rem";
    
    // Bank Balance Card
    const bankCard = document.createElement("div");
    bankCard.className = "bg-gradient-to-br from-white/5 to-white/2 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300";
    bankCard.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))";
    bankCard.style.borderRadius = "0.75rem";
    bankCard.style.padding = "1rem";
    bankCard.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    bankCard.style.transition = "all 0.3s";
    
    bankCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 2rem; height: 2rem; background: rgba(255, 255, 255, 0.1); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span style="font-size: 0.875rem; color: #D1D5DB;">Bank Account</span>
        </div>
      </div>
      <div style="font-size: 1.5rem; font-weight: bold; color: white; margin-bottom: 0.25rem;">
        ₹${this.bankAccount?.balance?.toLocaleString() || '0'}
      </div>
      <div style="font-size: 0.75rem; color: #9CA3AF;">Available Balance</div>
    `;
    
    // Transactions Card
    const transactionsCard = document.createElement("div");
    transactionsCard.className = "bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-4 border border-dhani-gold/20 hover:border-dhani-gold/40 transition-all duration-300";
    transactionsCard.style.background = "linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))";
    transactionsCard.style.borderRadius = "0.75rem";
    transactionsCard.style.padding = "1rem";
    transactionsCard.style.border = "1px solid rgba(255, 215, 0, 0.2)";
    transactionsCard.style.transition = "all 0.3s";
    
    transactionsCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 2rem; height: 2rem; background: rgba(255, 215, 0, 0.2); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span style="font-size: 0.875rem; color: #D1D5DB;">Transactions</span>
        </div>
      </div>
      <div style="font-size: 1.5rem; font-weight: bold; color: #FFD700; margin-bottom: 0.25rem;">
        ${this.bankAccount?.transactions?.length || 0}
      </div>
      <div style="font-size: 0.75rem; color: #9CA3AF;">Recent Activities</div>
    `;
    
    // Services Card
    const servicesCard = document.createElement("div");
    servicesCard.className = "bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300";
    servicesCard.style.background = "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))";
    servicesCard.style.borderRadius = "0.75rem";
    servicesCard.style.padding = "1rem";
    servicesCard.style.border = "1px solid rgba(34, 197, 94, 0.2)";
    servicesCard.style.transition = "all 0.3s";
    
    servicesCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 2rem; height: 2rem; background: rgba(34, 197, 94, 0.2); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span style="font-size: 0.875rem; color: #D1D5DB;">Services</span>
        </div>
      </div>
      <div style="font-size: 1.5rem; font-weight: bold; color: #22C55E; margin-bottom: 0.25rem;">
        Available
      </div>
      <div style="font-size: 0.75rem; color: #9CA3AF;">All ATM Services</div>
    `;
    
    balanceGrid.appendChild(bankCard);
    balanceGrid.appendChild(transactionsCard);
    balanceGrid.appendChild(servicesCard);
    balanceSection.appendChild(balanceGrid);
    
    return balanceSection;
  }

  private createTabNavigation(): HTMLElement {
    // Modern Tab Navigation matching BankingDashboard
    const tabContainer = document.createElement("div");
    tabContainer.className = "px-6 border-b border-dhani-gold/10 flex-shrink-0";
    tabContainer.style.padding = "0 1.5rem";
    tabContainer.style.borderBottom = "1px solid rgba(255, 215, 0, 0.1)";
    
    const tabNav = document.createElement("div");
    tabNav.className = "flex space-x-1 overflow-x-auto";
    tabNav.style.display = "flex";
    tabNav.style.gap = "0.25rem";
    tabNav.style.overflowX = "auto";
    
    const tabs = [
      { id: "overview", name: "Overview", icon: "📊", active: true },
      { id: "account", name: "Banking", icon: "🏦", active: false },
      { id: "transactions", name: "History", icon: "📋", active: false }
    ];
    
    tabs.forEach(tab => {
      const tabButton = document.createElement("button");
      tabButton.className = `flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all duration-200 ${
        tab.active 
          ? "text-dhani-gold bg-dhani-gold/10 border-b-2 border-dhani-gold"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`;
      tabButton.style.display = "flex";
      tabButton.style.alignItems = "center";
      tabButton.style.gap = "0.5rem";
      tabButton.style.padding = "0.75rem 1rem";
      tabButton.style.fontSize = "0.875rem";
      tabButton.style.fontWeight = "500";
      tabButton.style.borderTopLeftRadius = "0.5rem";
      tabButton.style.borderTopRightRadius = "0.5rem";
      tabButton.style.whiteSpace = "nowrap";
      tabButton.style.transition = "all 0.2s";
      tabButton.style.cursor = "pointer";
      tabButton.style.border = "none";
      tabButton.style.background = tab.active ? "rgba(255, 215, 0, 0.1)" : "transparent";
      tabButton.style.color = tab.active ? "#FFD700" : "#9CA3AF";
      
      if (tab.active) {
        tabButton.style.borderBottom = "2px solid #FFD700";
      }
      
      tabButton.innerHTML = `
        <span style="font-size: 1rem;">${tab.icon}</span>
        <span class="hidden sm:inline">${tab.name}</span>
      `;
      
      tabNav.appendChild(tabButton);
    });
    
    tabContainer.appendChild(tabNav);
    return tabContainer;
  }

  private createContentArea(): HTMLElement {
    // Content Area matching BankingDashboard
    const contentArea = document.createElement("div");
    contentArea.className = "flex-1 overflow-y-auto p-6 min-h-0 modern-scrollbar";
    contentArea.style.flex = "1";
    contentArea.style.overflowY = "auto";
    contentArea.style.padding = "1.5rem";
    contentArea.style.minHeight = "0";
    
    // Create overview content
    const overviewContent = this.createOverviewContent();
    contentArea.appendChild(overviewContent);
    
    return contentArea;
  }

  private createOverviewContent(): HTMLElement {
    const overview = document.createElement("div");
    overview.className = "space-y-6";
    overview.style.display = "flex";
    overview.style.flexDirection = "column";
    overview.style.gap = "1.5rem";
    
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(400px, 1fr))";
    grid.style.gap = "1.5rem";
    
    // Account Summary
    const accountSummary = document.createElement("div");
    accountSummary.className = "bg-white/5 rounded-xl p-6 border border-white/10";
    accountSummary.style.background = "rgba(255, 255, 255, 0.05)";
    accountSummary.style.borderRadius = "0.75rem";
    accountSummary.style.padding = "1.5rem";
    accountSummary.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    
    accountSummary.innerHTML = `
      <h3 style="color: white; font-weight: 600; font-size: 1.125rem; margin-bottom: 1rem; display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 0.75rem;">
          <path d="M3 3v18h18" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Account Summary
      </h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #9CA3AF; font-size: 0.875rem;">Available Balance</span>
          <span style="color: white; font-weight: 600;">₹${this.bankAccount?.balance?.toLocaleString() || '0'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #9CA3AF; font-size: 0.875rem;">Total Transactions</span>
          <span style="color: white; font-weight: 600;">${this.bankAccount?.transactions?.length || 0}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #9CA3AF; font-size: 0.875rem;">Fixed Deposits</span>
          <span style="color: white; font-weight: 600;">${this.bankAccount?.fixedDeposits?.length || 0} Active</span>
        </div>
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #FFD700; font-weight: 600;">Account Status</span>
            <span style="color: #22C55E; font-weight: bold; font-size: 1.125rem;">Active</span>
          </div>
        </div>
      </div>
    `;
    
    // Quick Actions
    const quickActions = document.createElement("div");
    quickActions.className = "bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-6 border border-dhani-gold/20";
    quickActions.style.background = "linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))";
    quickActions.style.borderRadius = "0.75rem";
    quickActions.style.padding = "1.5rem";
    quickActions.style.border = "1px solid rgba(255, 215, 0, 0.2)";
    
    quickActions.innerHTML = `
      <h3 style="color: #FFD700; font-weight: 600; font-size: 1.125rem; margin-bottom: 1rem; display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 0.75rem;">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Quick Actions
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
        <button id="quick-deposit" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: #FFD700; color: black; font-weight: 500; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Deposit</span>
        </button>
        <button id="quick-withdraw" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); color: white; font-weight: 500; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Withdraw</span>
        </button>
        <button id="quick-balance" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); color: white; font-weight: 500; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Balance</span>
        </button>
        <button id="quick-fd" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); color: white; font-weight: 500; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Fixed Deposit</span>
        </button>
      </div>
    `;
    
    grid.appendChild(accountSummary);
    grid.appendChild(quickActions);
    overview.appendChild(grid);
    
    // Add action area for forms
    const actionArea = document.createElement("div");
    actionArea.id = "atm-action-area";
    actionArea.className = "hidden";
    overview.appendChild(actionArea);
    
    return overview;
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