# Frontend APIs Reference

## Overview

The Dhaniverse frontend provides a comprehensive set of service APIs and React components for Web3 gaming functionality. The frontend is built with React, TypeScript, and integrates with ICP canisters, Web3 wallets, and the game server.

## Service Architecture

The frontend follows a service-oriented architecture with the following key services:

- **ICPActorService**: ICP canister integration
- **Web3BankingService**: Web3 banking operations
- **WalletManager**: Wallet connection management
- **Web3WalletService**: Web3 wallet interactions

## ICP Actor Service

### Class: ICPActorService

Provides integration with the ICP canister for blockchain operations.

#### Constructor

```typescript
constructor(canisterId: string)
```

#### Connection Methods

##### connect(walletService: Web3WalletService): Promise<boolean>

Connects the service with a wallet identity.

**Parameters**:
- `walletService`: Web3WalletService instance

**Returns**: Promise<boolean> - Connection success status

**Example**:
```typescript
const icpService = new ICPActorService('canister-id');
const connected = await icpService.connect(walletService);
```

##### isActorConnected(): boolean

Checks if the actor is connected.

**Returns**: boolean - Connection status

##### disconnect(): void

Disconnects the service.

#### Banking Methods

##### getDualBalance(): Promise<DualBalance>

Retrieves the dual currency balance (rupees and tokens).

**Returns**: Promise<DualBalance>

**DualBalance Interface**:
```typescript
interface DualBalance {
    rupeesBalance: number;
    tokenBalance: number;
    lastUpdated: number;
}
```

##### exchangeCurrency(fromCurrency, toCurrency, amount): Promise<ExchangeResult>

Exchanges between rupees and tokens.

**Parameters**:
- `fromCurrency`: 'rupees' | 'tokens'
- `toCurrency`: 'rupees' | 'tokens'  
- `amount`: number

**Returns**: Promise<ExchangeResult>

**ExchangeResult Interface**:
```typescript
interface ExchangeResult {
    success: boolean;
    fromAmount: number;
    toAmount: number;
    rate: number;
    transaction?: Web3Transaction;
    error?: string;
}
```

#### Staking Methods

##### stakeTokens(amount: number, duration: number): Promise<StakingResult>

Stakes tokens for a specified duration.

**Parameters**:
- `amount`: Token amount to stake
- `duration`: Staking duration in days

**Returns**: Promise<StakingResult>

**Example**:
```typescript
const result = await icpService.stakeTokens(1000, 30);
if (result.success) {
    console.log('APY:', result.apy);
}
```

##### getStakingInfo(): Promise<StakingPool[]>

Retrieves all staking pools.

**Returns**: Promise<StakingPool[]>

**StakingPool Interface**:
```typescript
interface StakingPool {
    id: string;
    stakedAmount: number;
    apy: number;
    startDate: number;
    maturityDate: number;
    currentRewards: number;
    status: 'active' | 'matured' | 'claimed';
}
```

##### claimStakingRewards(stakingId: string): Promise<ClaimResult>

Claims rewards from a staking pool.

**Parameters**:
- `stakingId`: Staking pool identifier

**Returns**: Promise<ClaimResult>

#### Achievement Methods

##### getAchievements(): Promise<Achievement[]>

Retrieves all achievements.

**Returns**: Promise<Achievement[]>

**Achievement Interface**:
```typescript
interface Achievement {
    id: string;
    title: string;
    description: string;
    category: 'trading' | 'saving' | 'staking' | 'learning';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlocked: boolean;
    unlockedAt?: number;
    reward?: {
        type: 'rupees' | 'tokens';
        amount: number;
    };
}
```

##### claimAchievementReward(achievementId: string): Promise<RewardResult>

Claims an achievement reward.

**Parameters**:
- `achievementId`: Achievement identifier

**Returns**: Promise<RewardResult>

#### DeFi Simulation Methods

##### simulateLiquidityPool(amount: number): Promise<SimulationResult>

Simulates liquidity pool participation.

**Parameters**:
- `amount`: Amount to simulate

**Returns**: Promise<SimulationResult>

##### simulateYieldFarming(amount: number): Promise<SimulationResult>

Simulates yield farming.

**Parameters**:
- `amount`: Amount to simulate

**Returns**: Promise<SimulationResult>

#### Real-time Data Methods

##### fetchRealTimeStockPrices(): Promise<StockPrice[]>

Fetches real-time stock prices via HTTP outcalls.

**Returns**: Promise<StockPrice[]>

**StockPrice Interface**:
```typescript
interface StockPrice {
    symbol: string;
    price: number;
    change: string;
    lastUpdated: number;
    source: string;
}
```

##### fetchFinancialNews(): Promise<NewsItem[]>

Fetches financial news via HTTP outcalls.

**Returns**: Promise<NewsItem[]>

**NewsItem Interface**:
```typescript
interface NewsItem {
    id: string;
    title: string;
    summary: string;
    category: string;
    timestamp: number;
    impact: string;
}
```

## Web3 Banking Service

### Class: Web3BankingService

Handles Web3 banking operations and dual currency management.

#### Constructor

```typescript
constructor(walletService: Web3WalletService)
```

#### Balance Methods

##### getDualBalance(): DualBalance

Gets the current dual currency balance.

**Returns**: DualBalance

#### Currency Exchange

##### exchangeCurrency(fromCurrency, toCurrency, amount): Promise<ExchangeResult>

Exchanges between rupees and tokens.

**Parameters**:
- `fromCurrency`: 'rupees' | 'tokens'
- `toCurrency`: 'rupees' | 'tokens'
- `amount`: number

**Returns**: Promise<ExchangeResult>

**Example**:
```typescript
const result = await bankingService.exchangeCurrency('rupees', 'tokens', 1000);
if (result.success) {
    console.log('Exchanged:', result.fromAmount, 'to', result.toAmount);
}
```

#### Staking Operations

##### stakeTokens(amount: number, duration: number): Promise<StakingResult>

Stakes tokens for rewards.

**Parameters**:
- `amount`: Token amount
- `duration`: Duration in days (30, 90, 180)

**Returns**: Promise<StakingResult>

##### getStakingInfo(): StakingPool[]

Gets all staking pools.

**Returns**: StakingPool[]

##### claimStakingRewards(stakingId: string): Promise<ClaimResult>

Claims staking rewards.

**Parameters**:
- `stakingId`: Pool identifier

**Returns**: Promise<ClaimResult>

#### Achievement System

##### getAchievements(): Achievement[]

Gets all achievements.

**Returns**: Achievement[]

##### claimAchievementReward(achievementId: string): Promise<RewardResult>

Claims achievement rewards.

**Parameters**:
- `achievementId`: Achievement identifier

**Returns**: Promise<RewardResult>

## Wallet Manager

### Class: WalletManager

Manages Web3 wallet connections and provides a unified interface.

#### Constructor

```typescript
constructor()
```

#### Connection Methods

##### connectWallet(walletType?: WalletType): Promise<WalletConnectionResult>

Connects to a Web3 wallet.

**Parameters**:
- `walletType`: Optional specific wallet type

**WalletType Enum**:
```typescript
enum WalletType {
    METAMASK = 'metamask',
    COINBASE = 'coinbase',
    WALLETCONNECT = 'walletconnect',
    INJECTED = 'injected'
}
```

**Returns**: Promise<WalletConnectionResult>

**WalletConnectionResult Interface**:
```typescript
interface WalletConnectionResult {
    success: boolean;
    address?: string;
    walletType?: WalletType;
    error?: string;
}
```

**Example**:
```typescript
const walletManager = new WalletManager();
const result = await walletManager.connectWallet(WalletType.METAMASK);
if (result.success) {
    console.log('Connected to:', result.address);
}
```

##### autoDetectAndConnect(): Promise<WalletConnectionResult>

Auto-detects and connects to available wallets.

**Returns**: Promise<WalletConnectionResult>

##### disconnectWallet(): void

Disconnects the current wallet.

#### Status Methods

##### getConnectionStatus(): WalletStatus

Gets the current connection status.

**Returns**: WalletStatus

**WalletStatus Interface**:
```typescript
interface WalletStatus {
    connected: boolean;
    address?: string;
    walletType?: WalletType;
    error?: string;
    isConnecting?: boolean;
    lastConnected?: number;
    balance?: string;
}
```

##### isWalletAvailable(walletType: WalletType): boolean

Checks if a specific wallet is available.

**Parameters**:
- `walletType`: Wallet type to check

**Returns**: boolean

##### getAvailableWallets(): WalletInfo[]

Gets all available wallets.

**Returns**: WalletInfo[]

**WalletInfo Interface**:
```typescript
interface WalletInfo {
    type: WalletType;
    name: string;
    available: boolean;
}
```

#### Event Handling

##### onConnectionChange(callback: (status: WalletStatus) => void): void

Registers a connection status change callback.

**Parameters**:
- `callback`: Function to call on status changes

**Example**:
```typescript
walletManager.onConnectionChange((status) => {
    if (status.connected) {
        console.log('Wallet connected:', status.address);
    }
});
```

##### removeConnectionCallback(callback: Function): void

Removes a connection callback.

**Parameters**:
- `callback`: Callback function to remove

## Web3 Wallet Service

### Class: Web3WalletService

Low-level Web3 wallet interaction service.

#### Connection Methods

##### connectWallet(walletType: WalletType): Promise<ConnectionResult>

Connects to a specific wallet type.

**Parameters**:
- `walletType`: Type of wallet to connect

**Returns**: Promise<ConnectionResult>

##### autoConnect(): Promise<ConnectionResult>

Attempts to auto-connect to available wallets.

**Returns**: Promise<ConnectionResult>

##### disconnectWallet(): void

Disconnects the current wallet.

#### Transaction Methods

##### exchangeCurrency(from, to, amount): Promise<Web3Transaction>

Creates a currency exchange transaction.

**Parameters**:
- `from`: Source currency
- `to`: Target currency
- `amount`: Amount to exchange

**Returns**: Promise<Web3Transaction>

**Web3Transaction Interface**:
```typescript
interface Web3Transaction {
    id: string;
    from: string;
    to?: string;
    amount: number;
    type: 'exchange' | 'stake' | 'deposit' | 'withdraw';
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    hash?: string;
}
```

##### stakeTokens(amount: number, duration: number): Promise<Web3Transaction>

Creates a token staking transaction.

**Parameters**:
- `amount`: Amount to stake
- `duration`: Staking duration

**Returns**: Promise<Web3Transaction>

#### Status Methods

##### getStatus(): WalletStatus

Gets the current wallet status.

**Returns**: WalletStatus

##### getAvailableWallets(): WalletInfo[]

Gets available wallet information.

**Returns**: WalletInfo[]

##### onStatusChange(callback: (status: WalletStatus) => void): void

Registers status change callback.

**Parameters**:
- `callback`: Status change handler

## React Component APIs

### Authentication Components

#### CustomSignIn Component

```typescript
interface CustomSignInProps {
    onSignIn: (credentials: LoginCredentials) => void;
    loading?: boolean;
    error?: string;
}

interface LoginCredentials {
    email: string;
    password: string;
    autoRegister?: boolean;
}
```

#### CustomSignUp Component

```typescript
interface CustomSignUpProps {
    onSignUp: (userData: SignUpData) => void;
    loading?: boolean;
    error?: string;
}

interface SignUpData {
    email: string;
    password: string;
    gameUsername: string;
}
```

### Banking Components

#### BankingDashboard Component

```typescript
interface BankingDashboardProps {
    balance: DualBalance;
    onDeposit: (amount: number) => void;
    onWithdraw: (amount: number) => void;
    onExchange: (from: string, to: string, amount: number) => void;
    transactions: Transaction[];
    loading?: boolean;
}
```

#### CurrencyExchange Component

```typescript
interface CurrencyExchangeProps {
    balance: DualBalance;
    onExchange: (from: string, to: string, amount: number) => void;
    exchangeRate: number;
    loading?: boolean;
}
```

### Stock Market Components

#### StockMarketDashboard Component

```typescript
interface StockMarketDashboardProps {
    portfolio: StockPortfolio;
    stockPrices: StockPrice[];
    onBuyStock: (stockId: string, quantity: number, price: number) => void;
    onSellStock: (stockId: string, quantity: number, price: number) => void;
    loading?: boolean;
}

interface StockPortfolio {
    holdings: StockHolding[];
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
}

interface StockHolding {
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    totalValue: number;
    gainLoss: number;
    gainLossPercentage: number;
}
```

### Game Components

#### GameHUD Component

```typescript
interface GameHUDProps {
    playerState: PlayerState;
    onlineUsers: number;
    notifications: Notification[];
    onDismissNotification: (id: string) => void;
}

interface PlayerState {
    position: { x: number; y: number; scene: string };
    financial: {
        rupees: number;
        totalWealth: number;
        bankBalance: number;
        stockPortfolioValue: number;
    };
    progress: {
        level: number;
        experience: number;
        unlockedBuildings: string[];
    };
}
```

## React Hooks

### useGameWebSocket Hook

```typescript
function useGameWebSocket(serverUrl: string, authToken: string): {
    connected: boolean;
    players: Player[];
    messages: ChatMessage[];
    updatePosition: (x: number, y: number, animation?: string) => void;
    sendChat: (message: string) => void;
}
```

### useWalletConnection Hook

```typescript
function useWalletConnection(): {
    status: WalletStatus;
    connect: (walletType?: WalletType) => Promise<WalletConnectionResult>;
    disconnect: () => void;
    availableWallets: WalletInfo[];
}
```

### usePlayerState Hook

```typescript
function usePlayerState(): {
    playerState: PlayerState | null;
    updatePlayerState: (updates: Partial<PlayerState>) => Promise<void>;
    updateRupees: (amount: number, operation: 'set' | 'add' | 'subtract') => Promise<void>;
    loading: boolean;
    error: string | null;
}
```

## Error Handling

### Error Types

```typescript
interface ServiceError {
    code: string;
    message: string;
    details?: any;
}

// Common error codes
enum ErrorCodes {
    WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED'
}
```

### Error Handling Example

```typescript
try {
    const result = await icpService.exchangeCurrency('rupees', 'tokens', 1000);
    if (!result.success) {
        throw new Error(result.error);
    }
    // Handle success
} catch (error) {
    if (error.code === ErrorCodes.INSUFFICIENT_BALANCE) {
        // Handle insufficient balance
    } else {
        // Handle other errors
    }
}
```

## Integration Examples

### Complete Wallet Integration

```typescript
import { WalletManager, ICPActorService, Web3BankingService } from './services';

class GameIntegration {
    private walletManager: WalletManager;
    private icpService: ICPActorService;
    private bankingService: Web3BankingService;

    constructor() {
        this.walletManager = new WalletManager();
        this.icpService = new ICPActorService('canister-id');
        
        this.walletManager.onConnectionChange(this.handleWalletChange.bind(this));
    }

    async initialize() {
        // Auto-connect wallet
        const result = await this.walletManager.autoDetectAndConnect();
        if (result.success) {
            await this.setupServices();
        }
    }

    private async setupServices() {
        const web3Service = this.walletManager.getWeb3Service();
        this.bankingService = new Web3BankingService(web3Service);
        
        await this.icpService.connect(web3Service);
    }

    private handleWalletChange(status: WalletStatus) {
        if (status.connected) {
            this.setupServices();
        } else {
            this.icpService.disconnect();
        }
    }

    async performExchange(amount: number) {
        try {
            const result = await this.bankingService.exchangeCurrency(
                'rupees', 'tokens', amount
            );
            return result;
        } catch (error) {
            console.error('Exchange failed:', error);
            throw error;
        }
    }
}
```

### React Component Integration

```typescript
import React, { useEffect, useState } from 'react';
import { WalletManager, ICPActorService } from '../services';

export function BankingComponent() {
    const [walletManager] = useState(() => new WalletManager());
    const [icpService] = useState(() => new ICPActorService('canister-id'));
    const [balance, setBalance] = useState<DualBalance | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        walletManager.onConnectionChange((status) => {
            setConnected(status.connected);
            if (status.connected) {
                initializeServices();
            }
        });
    }, []);

    const initializeServices = async () => {
        const web3Service = walletManager.getWeb3Service();
        await icpService.connect(web3Service);
        
        const currentBalance = await icpService.getDualBalance();
        setBalance(currentBalance);
    };

    const handleExchange = async (amount: number) => {
        try {
            const result = await icpService.exchangeCurrency(
                'rupees', 'tokens', amount
            );
            if (result.success) {
                const newBalance = await icpService.getDualBalance();
                setBalance(newBalance);
            }
        } catch (error) {
            console.error('Exchange failed:', error);
        }
    };

    if (!connected) {
        return (
            <button onClick={() => walletManager.connectWallet()}>
                Connect Wallet
            </button>
        );
    }

    return (
        <div>
            <h2>Banking Dashboard</h2>
            {balance && (
                <div>
                    <p>Rupees: {balance.rupeesBalance}</p>
                    <p>Tokens: {balance.tokenBalance}</p>
                </div>
            )}
            <button onClick={() => handleExchange(1000)}>
                Exchange 1000 Rupees to Tokens
            </button>
        </div>
    );
}
```