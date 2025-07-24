import { Web3BankingService, DualBalance, StakingPool, ExchangeResult, Achievement } from './Web3BankingService';
import { Web3WalletService } from './Web3WalletService';

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
    private canisterId: string;
    private connected = false;

    constructor(canisterId: string) {
        this.canisterId = canisterId;
    }

    // Connect with wallet identity
    async connect(walletService: Web3WalletService): Promise<boolean> {
        try {
            this.web3BankingService = new Web3BankingService(walletService);
            this.connected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect ICP Actor Service:', error);
            return false;
        }
    }

    // Check if actor is connected
    isActorConnected(): boolean {
        return this.connected && this.web3BankingService !== null;
    }

    // Get dual balance (Rupees + Tokens)
    async getDualBalance(): Promise<DualBalance> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
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
            // In a real implementation, this would call the canister's healthCheck method
            return {
                status: 'healthy',
                stats: {
                    accounts: 150,
                    transactions: 1250,
                    newsItems: 25,
                    stockPrices: 5,
                    timersActive: true,
                    httpOutcallsEnabled: true
                }
            };
        } catch (error) {
            return {
                status: 'error',
                stats: {}
            };
        }
    }

    // DeFi simulation methods
    async simulateLiquidityPool(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.simulateLiquidityPool(amount);
    }

    async simulateYieldFarming(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.simulateYieldFarming(amount);
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