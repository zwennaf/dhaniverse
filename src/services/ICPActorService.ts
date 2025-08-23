import { Web3BankingService, DualBalance, StakingPool, ExchangeResult, Achievement } from './Web3BankingService';
import { Web3WalletService } from './Web3WalletService';
import { ICPService } from './icp';

// ICP Canister Types
export interface StockPrice {
    symbol: string;
    price: number;
    change: string;
    lastUpdated: number;
    source: string;
}

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    category: string;
    timestamp: number;
    impact: string;
}

export interface BankAccount {
    principal: string;
    rupeesBalance: number;
    tokenBalance: number;
    createdAt: number;
    lastUpdated: number;
}

export class ICPActorService {
    private web3BankingService: Web3BankingService | null = null;
    private icpService: ICPService;
    private canisterId: string;
    private connected = false;
    private connectedWallet: string | null = null;
    private icpReady = false;

    constructor(canisterId: string = 'dzbzg-eqaaa-aaaap-an3rq-cai') {
        this.canisterId = canisterId;
        this.icpService = new ICPService();
        this.initializeICP();
    }

    private async initializeICP() {
        try {
            // Wait for ICP service to be ready
            await this.icpService.healthCheck();
            this.icpReady = true;
            console.log('ICP Service initialized successfully');
        } catch (error) {
            console.warn('ICP Service initialization failed, will use fallback:', error);
            this.icpReady = false;
        }
    }

    // Connect with wallet identity
    async connect(walletService: Web3WalletService): Promise<boolean> {
        try {
            // Always set up Web3 banking service for fallback
            this.web3BankingService = new Web3BankingService(walletService);
            
            // Get wallet info
            const walletStatus = walletService.getStatus();
            
            // Try ICP connection if service is ready
            if (this.icpReady && walletStatus.connected && walletStatus.address) {
                try {
                    const result = await this.icpService.connectWallet(
                        walletStatus.walletType || 'MetaMask',
                        walletStatus.address,
                        '1' // Ethereum mainnet
                    );
                    
                    if (result.success) {
                        this.connectedWallet = walletStatus.address;
                        this.connected = true;
                        console.log('ICP connection successful');
                        return true;
                    }
                } catch (error) {
                    console.warn('ICP connection failed, using Web3 fallback:', error);
                }
            }
            
            // Set connection status (with or without ICP)
            this.connected = true;
            console.log('Service connected with Web3 fallback');
            return true;
        } catch (error) {
            console.error('Failed to connect Actor Service:', error);
            return false;
        }
    }

    // Check if actor is connected
    isActorConnected(): boolean {
        return this.connected;
    }

    // Check if ICP canister is available
    isICPReady(): boolean {
        return this.icpReady && this.connectedWallet !== null;
    }

    // Get dual balance (Rupees + Tokens)
    async getDualBalance(): Promise<DualBalance> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        // Try ICP canister first, fallback to Web3
        if (this.connectedWallet) {
            try {
                const icpBalance = await this.icpService.getDualBalance(this.connectedWallet);
                return {
                    rupeesBalance: icpBalance.rupees_balance,
                    tokenBalance: icpBalance.token_balance,
                    lastUpdated: icpBalance.last_updated
                };
            } catch (error) {
                console.warn('ICP balance fetch failed, using Web3 fallback:', error);
            }
        }
        
        return this.web3BankingService.getDualBalance();
    }

    // Currency exchange
    async exchangeCurrency(
        fromCurrency: 'rupees' | 'tokens',
        toCurrency: 'rupees' | 'tokens',
        amount: number
    ): Promise<ExchangeResult> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.exchangeCurrency(fromCurrency, toCurrency, amount);
    }

    // Token staking
    async stakeTokens(amount: number, duration: number): Promise<{ success: boolean; apy?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        const result = await this.web3BankingService.stakeTokens(amount, duration);
        return {
            success: result.success,
            apy: result.stakingPool?.apy,
            error: result.error
        };
    }

    // Get staking information
    async getStakingInfo(): Promise<StakingPool[]> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.getStakingInfo();
    }

    // Claim staking rewards
    async claimStakingRewards(stakingId: string): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.claimStakingRewards(stakingId);
    }

    // Get achievements
    async getAchievements(): Promise<Achievement[]> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.getAchievements();
    }

    // Claim achievement reward
    async claimAchievementReward(achievementId: string): Promise<{ success: boolean; reward?: { type: string; amount: number }; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.claimAchievementReward(achievementId);
    }

    // Advanced ICP Features - HTTP Outcalls for Real-time Data
    async fetchRealTimeStockPrices(): Promise<StockPrice[]> {
        try {
            // In a real implementation, this would call the canister's fetchStockPrice method
            // For now, simulate the HTTP outcall response
            const mockPrices: StockPrice[] = [
                {
                    symbol: 'AAPL',
                    price: 17500,
                    change: '+2.1%',
                    lastUpdated: Date.now(),
                    source: 'polygon.io'
                },
                {
                    symbol: 'GOOGL',
                    price: 14200,
                    change: '-0.5%',
                    lastUpdated: Date.now(),
                    source: 'polygon.io'
                },
                {
                    symbol: 'MSFT',
                    price: 41000,
                    change: '+1.8%',
                    lastUpdated: Date.now(),
                    source: 'polygon.io'
                }
            ];
            return mockPrices;
        } catch (error) {
            console.error('Failed to fetch real-time stock prices:', error);
            return [];
        }
    }

    // Fetch financial news via HTTP outcalls
    async fetchFinancialNews(): Promise<NewsItem[]> {
        try {
            // In a real implementation, this would call the canister's fetchFinancialNews method
            const mockNews: NewsItem[] = [
                {
                    id: 'news_1',
                    title: 'Indian Stock Market Reaches New Heights',
                    summary: 'BSE Sensex crosses 75,000 mark amid strong investor sentiment',
                    category: 'finance',
                    timestamp: Date.now(),
                    impact: 'positive'
                },
                {
                    id: 'news_2',
                    title: 'RBI Announces New Digital Currency Guidelines',
                    summary: 'Central bank releases comprehensive framework for digital rupee',
                    category: 'crypto',
                    timestamp: Date.now() - 3600000,
                    impact: 'neutral'
                },
                {
                    id: 'news_3',
                    title: 'Tech Stocks Show Strong Performance',
                    summary: 'IT sector leads market gains with robust quarterly results',
                    category: 'market',
                    timestamp: Date.now() - 7200000,
                    impact: 'positive'
                }
            ];
            return mockNews;
        } catch (error) {
            console.error('Failed to fetch financial news:', error);
            return [];
        }
    }

    // Create account on ICP canister
    async createICPAccount(principal: string): Promise<BankAccount> {
        try {
            // In a real implementation, this would call the canister's createAccount method
            const account: BankAccount = {
                principal,
                rupeesBalance: 1000,
                tokenBalance: 0,
                createdAt: Date.now(),
                lastUpdated: Date.now()
            };
            return account;
        } catch (error) {
            console.error('Failed to create ICP account:', error);
            throw error;
        }
    }

    // Advanced staking with timer-based rewards
    async createAdvancedStakingPool(amount: number, durationDays: number): Promise<{ success: boolean; poolId?: string; error?: string }> {
        try {
            if (!this.web3BankingService) {
                throw new Error('Service not connected');
            }

            // This would call the canister's createStakingPool method which uses ICP timers
            const poolId = `stake_${Date.now()}`;
            
            // Simulate the canister call
            const result = await this.web3BankingService.stakeTokens(amount, durationDays);
            
            if (result.success) {
                return {
                    success: true,
                    poolId,
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Get canister health status
    async getCanisterHealth(): Promise<{ status: string; stats: any }> {
        try {
            const healthCheck = await this.icpService.healthCheck();
            const metrics = await this.icpService.getCanisterMetrics();
            
            return {
                status: healthCheck === 'OK' ? 'healthy' : 'error',
                stats: {
                    ...metrics,
                    canisterId: this.canisterId,
                    connected: this.connected,
                    walletConnected: !!this.connectedWallet
                }
            };
        } catch (error) {
            console.error('Canister health check failed:', error);
            return {
                status: 'error',
                stats: { error: String(error) }
            };
        }
    }

    // Alias for getCanisterHealth to match expected interface
    async getHealth(): Promise<{ status: string; stats: any }> {
        return this.getCanisterHealth();
    }

    // Record trade method for leaderboard
    async recordTrade(profit: number, stockSymbol: string): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.web3BankingService) {
                throw new Error('Service not connected');
            }

            // In a real implementation, this would call the canister's recordTrade method
            // For now, simulate recording the trade
            console.log(`Recording trade: ${stockSymbol} with profit: ${profit}`);
            
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Get leaderboard data
    async getLeaderboard(): Promise<{ success: boolean; data?: any[]; error?: string }> {
        try {
            // In a real implementation, this would call the canister's getLeaderboard method
            const mockLeaderboard = [
                { rank: 1, principal: 'user1', totalProfit: 15000, trades: 25 },
                { rank: 2, principal: 'user2', totalProfit: 12500, trades: 20 },
                { rank: 3, principal: 'user3', totalProfit: 10000, trades: 18 }
            ];
            
            return {
                success: true,
                data: mockLeaderboard
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Get user rank
    async getUserRank(principal?: string): Promise<{ success: boolean; rank?: number; error?: string }> {
        try {
            // In a real implementation, this would call the canister's getUserRank method
            const mockRank = Math.floor(Math.random() * 100) + 1;
            
            return {
                success: true,
                rank: mockRank
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // DeFi canister methods
    async simulateLiquidityPool(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        try {
            // Check wallet connection
            if (!this.connectedWallet) {
                return { success: false, error: 'Wallet not connected' };
            }

            // Call real ICP canister method
            const result = await this.icpService.simulateLiquidityPool(this.connectedWallet, amount);
            
            if ('Ok' in result) {
                return { success: true, rewards: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Liquidity pool simulation failed:', error);
            return { success: false, error: String(error) };
        }
    }

    async simulateYieldFarming(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        try {
            // Check wallet connection
            if (!this.connectedWallet) {
                return { success: false, error: 'Wallet not connected' };
            }

            // Call real ICP canister method
            const result = await this.icpService.simulateYieldFarming(this.connectedWallet, amount);
            
            if ('Ok' in result) {
                return { success: true, rewards: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Yield farming simulation failed:', error);
            return { success: false, error: String(error) };
        }
    }

    // Banking operations (for compatibility)
    async deposit(amount: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        try {
            const balance = this.web3BankingService.getDualBalance();
            // Simulate deposit by adding to rupees balance
            const result = await this.web3BankingService.exchangeCurrency('tokens', 'rupees', 0);
            return {
                success: true,
                newBalance: balance.rupeesBalance + amount
            };
        } catch (error) {
            return {
                success: false,
                error: String(error)
            };
        }
    }

    async withdraw(amount: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        try {
            const balance = this.web3BankingService.getDualBalance();
            if (balance.rupeesBalance < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }
            
            return {
                success: true,
                newBalance: balance.rupeesBalance - amount
            };
        } catch (error) {
            return {
                success: false,
                error: String(error)
            };
        }
    }

    async getBalance(): Promise<{ balance: number; lastUpdated: number }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        const dualBalance = this.web3BankingService.getDualBalance();
        return {
            balance: dualBalance.rupeesBalance + dualBalance.tokenBalance,
            lastUpdated: dualBalance.lastUpdated
        };
    }

    // Disconnect
    disconnect(): void {
        this.web3BankingService = null;
        this.connected = false;
    }
}