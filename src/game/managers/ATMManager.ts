import { GameObjects, Input } from "phaser";
import { MainGameScene } from "../scenes/MainScene";
import { BankAccount } from "../../types/BankAccount";
import { EventBus } from "../../utils/EventBus";

interface ATMLocation {
    id: string;
    x: number;
    y: number;
    name: string;
}

export class ATMManager {
    private scene: MainGameScene;
    private atmLocations: ATMLocation[] = [
        { id: "atm1", x: 2355, y: 1159, name: "ATM 1" },
        { id: "atm2", x: 7311, y: 534, name: "ATM 2" },
        { id: "atm3", x: 11055, y: 535, name: "ATM 3" },
        { id: "atm4", x: 3822, y: 3446, name: "ATM 4" },
        { id: "atm5", x: 9100, y: 3416, name: "ATM 5" },
        { id: "atm6", x: 1612, y: 4727, name: "ATM 6" },
        { id: "atm7", x: 5740, y: 4438, name: "ATM 7" },
        { id: "atm8", x: 7343, y: 5686, name: "ATM 8" },
    ];

    private interactionTexts: Map<string, GameObjects.Text> = new Map();
    private interactionKey: Input.Keyboard.Key | null = null;
    private readonly interactionDistance: number = 150;
    private nearestATM: ATMLocation | null = null;
    private isPlayerNearATM: boolean = false;
    private activeATMDialog: boolean = false;
    private playerBankAccount: BankAccount | null = null;
    private isPinSetup: boolean = false;
    private handleATMClosedBound = this.handleATMClosed.bind(this);

    constructor(scene: MainGameScene) {
        this.scene = scene;
        this.setupATMInteractions();
        this.loadPlayerATMPin();
    }

    private setupATMInteractions(): void {
        // Create interaction key
        this.interactionKey =
            this.scene.input.keyboard?.addKey(Input.Keyboard.KeyCodes.E) ||
            null;

        // Create interaction texts for each ATM
        this.atmLocations.forEach((atm) => {
            const interactionText = this.scene.add
                .text(atm.x, atm.y - 50, "Press E to use ATM", {
                    fontFamily: "Arial",
                    fontSize: "16px",
                    color: "#ffffff",
                    align: "center",
                    backgroundColor: "#00000080",
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(0.5)
                .setAlpha(0);

            // Add to game container for proper positioning
            this.scene.getGameContainer().add(interactionText);

            this.interactionTexts.set(atm.id, interactionText);
        });

        // Listen for ATM UI closure
        EventBus.on("atm-closed", this.handleATMClosedBound);
    }

    private async loadPlayerATMPin(): Promise<void> {
        try {
            // For now, skip PIN setup to avoid API errors
            // TODO: Implement ATM PIN API endpoints on backend
            this.isPinSetup = true; // Skip PIN setup for now
            console.log('ATM PIN check skipped - using existing bank account');
        } catch (error) {
            console.error("Failed to load ATM pin:", error);
            this.isPinSetup = true; // Fallback to skip PIN setup
        }
    }

    update(): void {
        if (!this.scene.getPlayer() || this.activeATMDialog) return;

        const player = this.scene.getPlayer();
        const playerSprite = player.getSprite();
        let closestATM: ATMLocation | null = null;
        let closestDistance = Infinity;

        // Find the closest ATM within interaction distance
        this.atmLocations.forEach((atm) => {
            const distance = Phaser.Math.Distance.Between(
                playerSprite.x,
                playerSprite.y,
                atm.x,
                atm.y
            );

            if (
                distance <= this.interactionDistance &&
                distance < closestDistance
            ) {
                closestDistance = distance;
                closestATM = atm;
            }
        });

        // Update interaction state
        const wasNearATM = this.isPlayerNearATM;
        this.isPlayerNearATM = closestATM !== null;
        this.nearestATM = closestATM;

        // Show/hide interaction texts with smooth transitions
        this.atmLocations.forEach((atm) => {
            const text = this.interactionTexts.get(atm.id);
            if (text) {
                if (atm === closestATM && !this.activeATMDialog) {
                    // Show text for nearest ATM only if not in dialog
                    if (text.alpha === 0) {
                        console.log(
                            `Showing ATM interaction text for ${atm.name} at (${atm.x}, ${atm.y})`
                        );
                        text.setAlpha(1);
                    }
                } else {
                    // Hide text for other ATMs or when in dialog
                    if (text.alpha === 1) {
                        text.setAlpha(0);
                    }
                }
            }
        });

        // Handle interaction key press
        if (
            this.isPlayerNearATM &&
            this.nearestATM &&
            this.interactionKey &&
            Phaser.Input.Keyboard.JustDown(this.interactionKey)
        ) {
            console.log("E key pressed near ATM, starting ATM interaction");
            this.startATMInteraction();
        }
    }

    private async startATMInteraction(): Promise<void> {
        if (!this.nearestATM) return;

        this.activeATMDialog = true;

        // Hide interaction text
        const text = this.interactionTexts.get(this.nearestATM.id);
        if (text) {
            text.setAlpha(0);
        }

        // Load current bank account data
        await this.loadBankAccount();

        // Since we're skipping PIN setup for now, go directly to ATM interface
        this.showATMInterface();
    }

    private showATMPinSetup(): void {
        // Dispatch event to show ATM pin setup UI
        EventBus.emit("show-atm-pin-setup", {
            atmName: this.nearestATM?.name || "ATM",
            onPinSetup: this.handlePinSetup.bind(this),
            onCancel: this.handleATMClosed.bind(this),
        });
    }

    private showATMPinEntry(): void {
        // Dispatch event to show ATM pin entry UI
        EventBus.emit("show-atm-pin-entry", {
            atmName: this.nearestATM?.name || "ATM",
            onPinVerified: this.handlePinVerified.bind(this),
            onCancel: this.handleATMClosed.bind(this),
        });
    }

    private async handlePinSetup(
        pin: string,
        confirmPin: string
    ): Promise<void> {
        if (pin !== confirmPin) {
            EventBus.emit(
                "show-atm-error",
                "PINs do not match. Please try again."
            );
            return;
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            EventBus.emit("show-atm-error", "PIN must be exactly 4 digits.");
            return;
        }

        try {
            // Save PIN to backend
            const response = await fetch("/api/game/player/atm-pin", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ pin }),
            });

            if (response.ok) {
                this.isPinSetup = true;
                EventBus.emit(
                    "show-atm-success",
                    "ATM PIN successfully created!"
                );

                // After successful pin setup, show ATM interface
                setTimeout(() => {
                    this.showATMInterface();
                }, 2000);
            } else {
                EventBus.emit(
                    "show-atm-error",
                    "Failed to set up ATM PIN. Please try again."
                );
            }
        } catch (error) {
            console.error("ATM PIN setup error:", error);
            EventBus.emit("show-atm-error", "Network error. Please try again.");
        }
    }

    private async handlePinVerified(enteredPin: string): Promise<void> {
        try {
            // Verify PIN with backend
            const response = await fetch("/api/game/player/atm-pin/verify", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ pin: enteredPin }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.data.valid) {
                    this.showATMInterface();
                } else {
                    EventBus.emit(
                        "show-atm-error",
                        "Incorrect PIN. Please try again."
                    );
                }
            } else {
                EventBus.emit(
                    "show-atm-error",
                    "PIN verification failed. Please try again."
                );
            }
        } catch (error) {
            console.error("PIN verification error:", error);
            EventBus.emit(
                "show-atm-error",
                "Network error during PIN verification."
            );
        }
    }

    private showATMInterface(): void {
        console.log('Showing ATM interface for:', this.nearestATM?.name);
        console.log('Bank account data:', this.playerBankAccount);
        
        // Dispatch event to show ATM banking interface (same as bank UI)
        EventBus.emit("show-atm-interface", {
            atmName: this.nearestATM?.name || "ATM",
            bankAccount: this.playerBankAccount,
            onDeposit: this.handleDeposit.bind(this),
            onWithdraw: this.handleWithdraw.bind(this),
            onCreateFixedDeposit: this.handleCreateFixedDeposit.bind(this),
            onViewTransactions: this.handleViewTransactions.bind(this),
            onCheckBalance: this.handleCheckBalance.bind(this),
            onClose: this.handleATMClosed.bind(this),
        });
        
        console.log('ATM interface event emitted');
    }

    private async loadBankAccount(): Promise<void> {
        try {
            // Create a mock bank account for now to avoid API errors
            // TODO: Replace with actual API call when backend is ready
            this.playerBankAccount = {
                _id: 'mock-account',
                userId: 'current-user',
                balance: 5000, // Mock balance
                transactions: [
                    {
                        id: 'mock-1',
                        type: 'deposit' as const,
                        amount: 1000,
                        timestamp: new Date(),
                        description: 'Initial deposit'
                    }
                ],
                createdAt: new Date(),
                lastUpdated: new Date()
            };
            console.log('Using mock bank account data for ATM');
        } catch (error) {
            console.error("Error loading bank account:", error);
            // Fallback to empty account
            this.playerBankAccount = {
                _id: 'fallback-account',
                userId: 'current-user',
                balance: 0,
                transactions: [],
                createdAt: new Date(),
                lastUpdated: new Date()
            };
        }
    }

    private async handleDeposit(amount: number): Promise<boolean> {
        try {
            // Mock deposit operation for now
            // TODO: Replace with actual API call when backend is ready
            if (this.playerBankAccount && amount > 0) {
                this.playerBankAccount.balance += amount;
                this.playerBankAccount.transactions.push({
                    id: `deposit-${Date.now()}`,
                    type: 'deposit' as const,
                    amount: amount,
                    timestamp: new Date(),
                    description: `ATM Deposit - ₹${amount}`
                });
                this.playerBankAccount.lastUpdated = new Date();
                
                EventBus.emit(
                    "show-atm-success",
                    `Successfully deposited ₹${amount}`
                );
                console.log(`Mock deposit: ₹${amount}, new balance: ₹${this.playerBankAccount.balance}`);
                return true;
            } else {
                EventBus.emit("show-atm-error", "Invalid deposit amount");
                return false;
            }
        } catch (error) {
            console.error("Deposit error:", error);
            EventBus.emit("show-atm-error", "Error during deposit");
            return false;
        }
    }

    private async handleWithdraw(amount: number): Promise<boolean> {
        try {
            // Mock withdrawal operation for now
            // TODO: Replace with actual API call when backend is ready
            if (this.playerBankAccount && amount > 0) {
                if (this.playerBankAccount.balance >= amount) {
                    this.playerBankAccount.balance -= amount;
                    this.playerBankAccount.transactions.push({
                        id: `withdraw-${Date.now()}`,
                        type: 'withdrawal' as const,
                        amount: amount,
                        timestamp: new Date(),
                        description: `ATM Withdrawal - ₹${amount}`
                    });
                    this.playerBankAccount.lastUpdated = new Date();
                    
                    EventBus.emit(
                        "show-atm-success",
                        `Successfully withdrew ₹${amount}`
                    );
                    console.log(`Mock withdrawal: ₹${amount}, new balance: ₹${this.playerBankAccount.balance}`);
                    return true;
                } else {
                    EventBus.emit("show-atm-error", "Insufficient balance");
                    return false;
                }
            } else {
                EventBus.emit("show-atm-error", "Invalid withdrawal amount");
                return false;
            }
        } catch (error) {
            console.error("Withdrawal error:", error);
            EventBus.emit("show-atm-error", "Error during withdrawal");
            return false;
        }
    }

    private async handleCreateFixedDeposit(
        amount: number,
        duration: number
    ): Promise<boolean> {
        try {
            // Mock fixed deposit operation for now
            // TODO: Replace with actual API call when backend is ready
            if (this.playerBankAccount && amount >= 100) {
                if (this.playerBankAccount.balance >= amount) {
                    // Deduct amount from balance
                    this.playerBankAccount.balance -= amount;
                    
                    // Add transaction record
                    this.playerBankAccount.transactions.push({
                        id: `fd-${Date.now()}`,
                        type: 'withdrawal' as const,
                        amount: amount,
                        timestamp: new Date(),
                        description: `Fixed Deposit Creation - ₹${amount} for ${duration} months`
                    });
                    
                    // Calculate interest rate based on duration
                    let interestRate = 5.0; // Base rate
                    if (duration >= 24) interestRate = 7.0;
                    else if (duration >= 12) interestRate = 6.0;
                    else if (duration >= 6) interestRate = 5.5;
                    
                    // Add fixed deposit to account (if fixedDeposits array exists)
                    if (!this.playerBankAccount.fixedDeposits) {
                        this.playerBankAccount.fixedDeposits = [];
                    }
                    
                    const maturityDate = new Date();
                    maturityDate.setMonth(maturityDate.getMonth() + duration);
                    
                    this.playerBankAccount.fixedDeposits.push({
                        id: `fd-${Date.now()}`,
                        amount: amount,
                        interestRate: interestRate,
                        startDate: new Date(),
                        duration: duration * 30, // Convert months to days
                        maturityDate: maturityDate,
                        matured: false,
                        status: 'active' as const
                    });
                    
                    this.playerBankAccount.lastUpdated = new Date();
                    
                    EventBus.emit(
                        "show-atm-success",
                        `Fixed deposit of ₹${amount} created successfully (${interestRate}% APR for ${duration} months)`
                    );
                    console.log(`Mock fixed deposit: ₹${amount} for ${duration} months at ${interestRate}% APR`);
                    return true;
                } else {
                    EventBus.emit("show-atm-error", "Insufficient balance for fixed deposit");
                    return false;
                }
            } else {
                EventBus.emit("show-atm-error", "Minimum fixed deposit amount is ₹100");
                return false;
            }
        } catch (error) {
            console.error("Fixed deposit error:", error);
            EventBus.emit("show-atm-error", "Error during fixed deposit creation");
            return false;
        }
    }

    private handleViewTransactions(): void {
        EventBus.emit("show-atm-transactions", {
            transactions: this.playerBankAccount?.transactions || [],
            atmName: this.nearestATM?.name || "ATM",
        });
    }

    private handleCheckBalance(): void {
        EventBus.emit("show-atm-balance", {
            balance: this.playerBankAccount?.balance || 0,
            fixedDeposits: this.playerBankAccount?.fixedDeposits || [],
            atmName: this.nearestATM?.name || "ATM",
        });
    }

    private handleATMClosed(): void {
        console.log('ATM dialog closed');
        this.activeATMDialog = false;

        // Force refresh of interaction text visibility
        // This ensures the text shows up again when the player is still near the ATM
        if (this.isPlayerNearATM && this.nearestATM) {
            const text = this.interactionTexts.get(this.nearestATM.id);
            if (text) {
                console.log('Reshowing interaction text after ATM closed');
                text.setAlpha(1);
            }
        }
    }

    /**
     * Called when the player enters a building
     */
    onPlayerEnterBuilding(): void {
        // Hide all ATM interaction texts when player enters a building
        this.interactionTexts.forEach((text) => {
            text.setAlpha(0);
        });
        this.isPlayerNearATM = false;
        this.nearestATM = null;
    }

    /**
     * Called when the player exits a building
     */
    onPlayerExitBuilding(): void {
        // ATM interactions will resume normally in the next update cycle
    }

    /**
     * Clean up resources when scene is being destroyed
     */
    destroy(): void {
        EventBus.off("atm-closed", this.handleATMClosedBound);

        this.interactionTexts.forEach((text) => {
            text.destroy();
        });
        this.interactionTexts.clear();

        if (this.interactionKey) {
            this.interactionKey.destroy();
        }
    }
}
