# ICP Canister API Reference

## Table of Contents

- [Overview](#overview)
- [Canister Information](#canister-information)
- [Authentication Methods](#authentication-methods)
  - [authenticate_with_signature](#authenticate_with_signature)
  - [create_session](#create_session)
  - [clear_session](#clear_session)
  - [get_session](#get_session)
- [Wallet Management Methods](#wallet-management-methods)
  - [get_available_wallets](#get_available_wallets)
  - [connect_wallet](#connect_wallet)
  - [disconnect_wallet](#disconnect_wallet)
  - [get_wallet_status](#get_wallet_status)
- [Banking Methods](#banking-methods)
  - [get_dual_balance](#get_dual_balance)
  - [exchange_currency](#exchange_currency)
  - [stake_tokens](#stake_tokens)
  - [get_staking_info](#get_staking_info)
  - [claim_staking_rewards](#claim_staking_rewards)
- [Achievement System](#achievement-system)
  - [get_achievements](#get_achievements)
  - [claim_achievement_reward](#claim_achievement_reward)
- [DeFi Simulation Methods](#defi-simulation-methods)
- [Transaction Methods](#transaction-methods)
- [Monitoring and Health Methods](#monitoring-and-health-methods)
- [Error Handling](#error-handling)

## Overview

The Dhaniverse ICP canister provides a comprehensive Web3 banking and gaming backend built on the Internet Computer Protocol. This canister handles authentication, wallet management, banking operations, DeFi simulations, and transaction processing.

## Canister Information

- **Language**: Rust
- **Candid Interface**: Available at `packages/icp-canister/rust_icp_canister.did`
- **Main Module**: `packages/icp-canister/src/lib.rs`

## Authentication Methods

### authenticate_with_signature

Authenticates a user using wallet signature verification.

**Method Type**: Update
**Parameters**:
- `address: String` - Wallet address
- `signature: String` - Cryptographic signature

**Returns**: `Result<AuthResult, String>`

**AuthResult Structure**:
```rust
type AuthResult = record {
    success: bool;
    user: opt User;
    token: opt text;
    is_new_user: opt bool;
    error: opt text;
};
```

**Example Usage**:
```javascript
// Basic authentication
const result = await actor.authenticate_with_signature(
    "0x742d35Cc6634C0532925a3b8D404d3aABe5475cc",
    "0x1234567890abcdef..."
);

if (result.Ok && result.Ok.success) {
    console.log('Authentication successful');
    console.log('User ID:', result.Ok.user?.id);
    console.log('JWT Token:', result.Ok.token);
    console.log('Is new user:', result.Ok.is_new_user);
} else {
    console.error('Authentication failed:', result.Err || result.Ok?.error);
}
```

**Error Handling Example**:
```javascript
try {
    const result = await actor.authenticate_with_signature(walletAddress, signature);
    
    // Handle Result type from Rust
    if ('Ok' in result) {
        const authResult = result.Ok;
        if (authResult.success) {
            // Store token for future requests
            localStorage.setItem('auth_token', authResult.token);
            return authResult.user;
        } else {
            throw new Error(authResult.error || 'Authentication failed');
        }
    } else {
        throw new Error(result.Err);
    }
} catch (error) {
    console.error('Network or canister error:', error);
    // Handle network failures, canister unavailability, etc.
    throw error;
}
```

### create_session

Creates a new Web3 session for an authenticated wallet.

**Method Type**: Update
**Parameters**:
- `wallet_connection: WalletConnection`

**WalletConnection Structure**:
```rust
type WalletConnection = record {
    address: text;
    chain_id: text;
    wallet_type: WalletType;
    balance: opt text;
};
```

**Returns**: `Result<Web3Session, String>`

**Web3Session Structure**:
```rust
type Web3Session = record {
    wallet_address: text;
    session_id: text;
    created_at: nat64;
    expires_at: nat64;
    chain_id: text;
    wallet_type: WalletType;
};
```

**Example Usage**:
```javascript
const walletConnection = {
    address: "0x742d35Cc6634C0532925a3b8D404d3aABe5475cc",
    chain_id: "1", // Ethereum mainnet
    wallet_type: { MetaMask: null },
    balance: "1.5" // ETH balance
};

const sessionResult = await actor.create_session(walletConnection);
if ('Ok' in sessionResult) {
    console.log('Session created:', sessionResult.Ok.session_id);
    console.log('Expires at:', new Date(Number(sessionResult.Ok.expires_at) / 1000000));
} else {
    console.error('Session creation failed:', sessionResult.Err);
}
```

### clear_session

Clears an existing session for a wallet address.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`

**Returns**: `Result<(), String>`

**Example Usage**:
```javascript
// Clear session on logout
const clearResult = await actor.clear_session(walletAddress);
if ('Ok' in clearResult) {
    console.log('Session cleared successfully');
    localStorage.removeItem('auth_token');
} else {
    console.error('Failed to clear session:', clearResult.Err);
}
```

### get_session

Retrieves session information for a wallet address.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Option<Web3Session>`

**Example Usage**:
```javascript
// Check if user has active session
const session = await actor.get_session(walletAddress);
if (session.length > 0) {
    const sessionData = session[0];
    console.log('Active session found:', sessionData.session_id);
    
    // Check if session is still valid
    const now = Date.now() * 1000000; // Convert to nanoseconds
    if (now < sessionData.expires_at) {
        console.log('Session is valid');
        return sessionData;
    } else {
        console.log('Session expired');
        await actor.clear_session(walletAddress);
    }
} else {
    console.log('No active session');
}
```

## Wallet Management Methods

### get_available_wallets

Returns a list of supported wallet types and their information.

**Method Type**: Query
**Parameters**: None

**Returns**: `Vec<WalletInfo>`

**Example Usage**:
```javascript
// Get list of supported wallets
const wallets = await actor.get_available_wallets();
console.log('Supported wallets:');

wallets.forEach(wallet => {
    console.log(`- ${wallet.name} (${wallet.wallet_type})`);
    console.log(`  Installed: ${wallet.installed}`);
    if (!wallet.installed && wallet.download_url.length > 0) {
        console.log(`  Download: ${wallet.download_url[0]}`);
    }
});

// Filter for installed wallets
const installedWallets = wallets.filter(w => w.installed);
if (installedWallets.length === 0) {
    console.log('No wallets installed. Please install a supported wallet.');
}
```

**WalletInfo Structure**:
```rust
type WalletInfo = record {
    name: text;
    wallet_type: WalletType;
    icon: text;
    installed: bool;
    download_url: opt text;
};
```

### connect_wallet

Connects a wallet to the canister.

**Method Type**: Update
**Parameters**:
- `wallet_type: WalletType`
- `address: String`
- `chain_id: String`

**WalletType Variants**:
```rust
type WalletType = variant {
    MetaMask;
    Phantom;
    Coinbase;
    WalletConnect;
    Injected;
};
```

**Returns**: `Result<WalletConnection, String>`

**Example Usage**:
```javascript
// Connect MetaMask wallet
const connectResult = await actor.connect_wallet(
    { MetaMask: null },
    "0x742d35Cc6634C0532925a3b8D404d3aABe5475cc",
    "1" // Ethereum mainnet
);

if ('Ok' in connectResult) {
    const connection = connectResult.Ok;
    console.log('Wallet connected successfully');
    console.log('Address:', connection.address);
    console.log('Chain ID:', connection.chain_id);
    console.log('Balance:', connection.balance);
    
    // Store connection info
    localStorage.setItem('wallet_connection', JSON.stringify(connection));
} else {
    console.error('Wallet connection failed:', connectResult.Err);
    
    // Handle specific error cases
    if (connectResult.Err.includes('unsupported_chain')) {
        alert('Please switch to Ethereum mainnet');
    } else if (connectResult.Err.includes('wallet_not_found')) {
        alert('MetaMask not detected. Please install MetaMask.');
    }
}
```

### disconnect_wallet

Disconnects a wallet from the canister.

**Method Type**: Update
**Parameters**:
- `address: String`

**Returns**: `Result<(), String>`

### get_wallet_status

Gets the connection status of a wallet.

**Method Type**: Query
**Parameters**:
- `address: String`

**Returns**: `Option<WalletConnection>`

## Banking Methods

### get_dual_balance

Retrieves the dual currency balance (rupees and tokens) for a wallet.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Result<DualBalance, String>`

**Example Usage**:
```javascript
// Get user's dual currency balance
const balanceResult = await actor.get_dual_balance(walletAddress);

if ('Ok' in balanceResult) {
    const balance = balanceResult.Ok;
    console.log('Current Balances:');
    console.log(`Rupees: ₹${balance.rupees_balance.toLocaleString()}`);
    console.log(`Tokens: ${balance.token_balance.toFixed(2)} DHV`);
    console.log(`Last updated: ${new Date(Number(balance.last_updated) / 1000000)}`);
    
    // Calculate total wealth in rupees (assuming 1 token = 10 rupees)
    const totalWealth = balance.rupees_balance + (balance.token_balance * 10);
    console.log(`Total wealth: ₹${totalWealth.toLocaleString()}`);
} else {
    console.error('Failed to get balance:', balanceResult.Err);
    
    // Handle common errors
    if (balanceResult.Err.includes('user_not_found')) {
        console.log('User account not found. Creating new account...');
        // Trigger account creation flow
    }
}
```

**Polling for Balance Updates**:
```javascript
// Set up periodic balance updates
let balanceInterval;

function startBalancePolling(walletAddress, callback) {
    balanceInterval = setInterval(async () => {
        try {
            const result = await actor.get_dual_balance(walletAddress);
            if ('Ok' in result) {
                callback(result.Ok);
            }
        } catch (error) {
            console.error('Balance polling error:', error);
        }
    }, 5000); // Poll every 5 seconds
}

function stopBalancePolling() {
    if (balanceInterval) {
        clearInterval(balanceInterval);
        balanceInterval = null;
    }
}
```

**DualBalance Structure**:
```rust
type DualBalance = record {
    rupees_balance: float64;
    token_balance: float64;
    last_updated: nat64;
};
```

### exchange_currency

Exchanges between rupees and tokens.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `from_currency: String`
- `to_currency: String`
- `amount: f64`

**Returns**: `Result<ExchangeResult, String>`

**Example Usage**:
```javascript
// Exchange 1000 rupees for tokens
const exchangeResult = await actor.exchange_currency(
    walletAddress,
    "rupees",
    "tokens", 
    1000.0
);

if ('Ok' in exchangeResult) {
    const result = exchangeResult.Ok;
    if (result.success) {
        console.log('Exchange successful!');
        console.log(`Exchanged: ₹${result.from_amount} → ${result.to_amount} DHV`);
        console.log(`Exchange rate: ${result.rate}`);
        
        if (result.transaction.length > 0) {
            const tx = result.transaction[0];
            console.log(`Transaction ID: ${tx.id}`);
            console.log(`Status: ${tx.status}`);
        }
        
        // Update UI with new balances
        updateBalanceDisplay();
    } else {
        console.error('Exchange failed:', result.error);
    }
} else {
    console.error('Exchange request failed:', exchangeResult.Err);
}
```

**Exchange Rate Calculation**:
```javascript
// Get current exchange rate before making exchange
async function getExchangeRate(fromCurrency, toCurrency) {
    // Simulate small exchange to get rate
    const testResult = await actor.exchange_currency(
        walletAddress,
        fromCurrency,
        toCurrency,
        0.01 // Very small amount for rate check
    );
    
    if ('Ok' in testResult && testResult.Ok.success) {
        return testResult.Ok.rate;
    }
    return null;
}

// Use rate for UI display
const rate = await getExchangeRate("rupees", "tokens");
if (rate) {
    document.getElementById('exchange-rate').textContent = 
        `1 Rupee = ${rate} DHV Tokens`;
}
```

**Validation Example**:
```javascript
// Validate exchange parameters before calling canister
function validateExchange(fromCurrency, toCurrency, amount, userBalance) {
    const errors = [];
    
    if (amount <= 0) {
        errors.push('Amount must be positive');
    }
    
    if (fromCurrency === toCurrency) {
        errors.push('Cannot exchange same currency');
    }
    
    const balanceKey = fromCurrency === 'rupees' ? 'rupees_balance' : 'token_balance';
    if (userBalance[balanceKey] < amount) {
        errors.push(`Insufficient ${fromCurrency} balance`);
    }
    
    if (amount < 1) {
        errors.push('Minimum exchange amount is 1');
    }
    
    if (amount > 1000000) {
        errors.push('Maximum exchange amount is 1,000,000');
    }
    
    return errors;
}

// Usage
const errors = validateExchange('rupees', 'tokens', 1000, currentBalance);
if (errors.length > 0) {
    console.error('Validation errors:', errors);
    return;
}
```

**ExchangeResult Structure**:
```rust
type ExchangeResult = record {
    success: bool;
    from_amount: float64;
    to_amount: float64;
    rate: float64;
    transaction: opt Web3Transaction;
    error: opt text;
};
```

### stake_tokens

Stakes tokens for a specified duration to earn rewards.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `amount: f64`
- `duration: u32` (in days)

**Returns**: `Result<StakingPool, String>`

**StakingStatus Variants**:
```rust
type StakingStatus = variant {
    Active;
    Matured;
    Claimed;
    Cancelled;
};
```

**Example Usage**:
```javascript
// Stake 500 tokens for 90 days
const stakingResult = await actor.stake_tokens(
    walletAddress,
    500.0,
    90
);

if ('Ok' in stakingResult) {
    const pool = stakingResult.Ok;
    console.log('Staking successful!');
    console.log(`Pool ID: ${pool.id}`);
    console.log(`Staked Amount: ${pool.staked_amount} DHV`);
    console.log(`APY: ${pool.apy}%`);
    console.log(`Maturity Date: ${new Date(Number(pool.maturity_date) / 1000000)}`);
    
    // Calculate expected rewards
    const expectedRewards = (pool.staked_amount * pool.apy / 100) * (90 / 365);
    console.log(`Expected Rewards: ${expectedRewards.toFixed(2)} DHV`);
    
    // Set reminder for maturity
    const maturityTime = Number(pool.maturity_date) / 1000000;
    const timeUntilMaturity = maturityTime - Date.now();
    
    if (timeUntilMaturity > 0) {
        setTimeout(() => {
            alert(`Your staking pool ${pool.id} has matured! You can now claim rewards.`);
        }, timeUntilMaturity);
    }
} else {
    console.error('Staking failed:', stakingResult.Err);
    
    // Handle specific errors
    if (stakingResult.Err.includes('insufficient_balance')) {
        alert('Insufficient token balance for staking');
    } else if (stakingResult.Err.includes('invalid_duration')) {
        alert('Invalid staking duration. Choose 30, 90, or 180 days.');
    }
}
```

**Staking Duration Options**:
```javascript
// Available staking options with APY rates
const STAKING_OPTIONS = [
    { duration: 30, apy: 5.0, label: '30 Days - 5% APY' },
    { duration: 90, apy: 7.5, label: '90 Days - 7.5% APY' },
    { duration: 180, apy: 10.0, label: '180 Days - 10% APY' }
];

// Calculate potential rewards for each option
function calculateStakingRewards(amount, duration, apy) {
    const annualRewards = amount * (apy / 100);
    const periodRewards = annualRewards * (duration / 365);
    return {
        principal: amount,
        rewards: periodRewards,
        total: amount + periodRewards,
        apy: apy
    };
}

// Display staking options to user
STAKING_OPTIONS.forEach(option => {
    const calculation = calculateStakingRewards(1000, option.duration, option.apy);
    console.log(`${option.label}:`);
    console.log(`  1000 DHV → ${calculation.total.toFixed(2)} DHV`);
    console.log(`  Profit: ${calculation.rewards.toFixed(2)} DHV`);
});
```

**StakingPool Structure**:
```rust
type StakingPool = record {
    id: text;
    staked_amount: float64;
    apy: float64;
    start_date: nat64;
    maturity_date: nat64;
    current_rewards: float64;
    status: StakingStatus;
};
```

### get_staking_info

Retrieves all staking pools for a wallet address.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Vec<StakingPool>`

**Example Usage**:
```javascript
// Get all staking pools for user
const stakingPools = await actor.get_staking_info(walletAddress);

console.log(`Found ${stakingPools.length} staking pools:`);

let totalStaked = 0;
let totalRewards = 0;
let activePoolsCount = 0;

stakingPools.forEach((pool, index) => {
    console.log(`\nPool ${index + 1}:`);
    console.log(`  ID: ${pool.id}`);
    console.log(`  Amount: ${pool.staked_amount} DHV`);
    console.log(`  APY: ${pool.apy}%`);
    console.log(`  Status: ${pool.status}`);
    console.log(`  Current Rewards: ${pool.current_rewards.toFixed(4)} DHV`);
    
    const startDate = new Date(Number(pool.start_date) / 1000000);
    const maturityDate = new Date(Number(pool.maturity_date) / 1000000);
    console.log(`  Started: ${startDate.toLocaleDateString()}`);
    console.log(`  Matures: ${maturityDate.toLocaleDateString()}`);
    
    // Calculate time remaining
    const now = Date.now();
    const maturityTime = Number(pool.maturity_date) / 1000000;
    
    if (pool.status === 'Active') {
        activePoolsCount++;
        totalStaked += pool.staked_amount;
        totalRewards += pool.current_rewards;
        
        if (maturityTime > now) {
            const daysRemaining = Math.ceil((maturityTime - now) / (1000 * 60 * 60 * 24));
            console.log(`  Days remaining: ${daysRemaining}`);
        } else {
            console.log(`  ⚠️  Ready to claim!`);
        }
    }
});

console.log(`\nSummary:`);
console.log(`Active pools: ${activePoolsCount}`);
console.log(`Total staked: ${totalStaked} DHV`);
console.log(`Total current rewards: ${totalRewards.toFixed(4)} DHV`);
```

**Filter and Sort Pools**:
```javascript
// Filter pools by status
const activePools = stakingPools.filter(pool => pool.status === 'Active');
const maturedPools = stakingPools.filter(pool => pool.status === 'Matured');
const claimedPools = stakingPools.filter(pool => pool.status === 'Claimed');

// Sort by maturity date (earliest first)
const sortedByMaturity = activePools.sort((a, b) => 
    Number(a.maturity_date) - Number(b.maturity_date)
);

// Find pools ready to claim
const readyToClaim = stakingPools.filter(pool => {
    const maturityTime = Number(pool.maturity_date) / 1000000;
    return pool.status === 'Active' && Date.now() >= maturityTime;
});

if (readyToClaim.length > 0) {
    console.log(`🎉 ${readyToClaim.length} pools ready to claim!`);
    readyToClaim.forEach(pool => {
        console.log(`  Pool ${pool.id}: ${pool.staked_amount + pool.current_rewards} DHV available`);
    });
}
```

### claim_staking_rewards

Claims rewards from a matured staking pool.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `staking_id: String`

**Returns**: `Result<f64, String>`

## Achievement System

### get_achievements

Retrieves all achievements for a wallet address.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Vec<Achievement>`

**AchievementCategory Variants**:
```rust
type AchievementCategory = variant {
    Trading;
    Saving;
    Staking;
    Learning;
    Social;
};
```

**AchievementRarity Variants**:
```rust
type AchievementRarity = variant {
    Common;
    Rare;
    Epic;
    Legendary;
};
```

**AchievementReward Structure**:
```rust
type AchievementReward = record {
    reward_type: text; // "rupees" or "tokens"
    amount: float64;
    bonus_multiplier: opt float64;
};
```

**Example Usage**:
```javascript
// Get all achievements for user
const achievements = await actor.get_achievements(walletAddress);

console.log(`Total achievements: ${achievements.length}`);

// Categorize achievements
const categories = {};
const rarities = {};
let unlockedCount = 0;
let totalRewardValue = 0;

achievements.forEach(achievement => {
    // Group by category
    const category = Object.keys(achievement.category)[0];
    if (!categories[category]) categories[category] = [];
    categories[category].push(achievement);
    
    // Group by rarity
    const rarity = Object.keys(achievement.rarity)[0];
    if (!rarities[rarity]) rarities[rarity] = 0;
    rarities[rarity]++;
    
    // Count unlocked
    if (achievement.unlocked) {
        unlockedCount++;
        
        // Calculate reward value
        if (achievement.reward && achievement.reward.length > 0) {
            const reward = achievement.reward[0];
            totalRewardValue += reward.amount;
        }
    }
    
    console.log(`\n${achievement.unlocked ? '🏆' : '🔒'} ${achievement.title}`);
    console.log(`   ${achievement.description}`);
    console.log(`   Category: ${category} | Rarity: ${rarity}`);
    
    if (achievement.unlocked && achievement.unlocked_at && achievement.unlocked_at.length > 0) {
        const unlockedDate = new Date(Number(achievement.unlocked_at[0]) / 1000000);
        console.log(`   Unlocked: ${unlockedDate.toLocaleDateString()}`);
    }
    
    if (achievement.reward && achievement.reward.length > 0) {
        const reward = achievement.reward[0];
        console.log(`   Reward: ${reward.amount} ${reward.reward_type}`);
    }
});

console.log(`\nProgress: ${unlockedCount}/${achievements.length} (${((unlockedCount/achievements.length)*100).toFixed(1)}%)`);
console.log(`Total reward value: ${totalRewardValue}`);

// Show category breakdown
console.log('\nBy Category:');
Object.entries(categories).forEach(([category, items]) => {
    const unlocked = items.filter(item => item.unlocked).length;
    console.log(`  ${category}: ${unlocked}/${items.length}`);
});
```

**Achievement Progress Tracking**:
```javascript
// Check for newly unlocked achievements
let lastKnownAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');

function checkForNewAchievements(currentAchievements) {
    const newlyUnlocked = [];
    
    currentAchievements.forEach(current => {
        const previous = lastKnownAchievements.find(prev => prev.id === current.id);
        
        if (current.unlocked && (!previous || !previous.unlocked)) {
            newlyUnlocked.push(current);
        }
    });
    
    if (newlyUnlocked.length > 0) {
        console.log(`🎉 New achievements unlocked: ${newlyUnlocked.length}`);
        newlyUnlocked.forEach(achievement => {
            console.log(`   🏆 ${achievement.title}`);
            
            // Show notification
            showAchievementNotification(achievement);
        });
    }
    
    // Update stored achievements
    localStorage.setItem('achievements', JSON.stringify(currentAchievements));
    return newlyUnlocked;
}

function showAchievementNotification(achievement) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <h3>Achievement Unlocked!</h3>
            <p><strong>${achievement.title}</strong></p>
            <p>${achievement.description}</p>
            ${achievement.reward && achievement.reward.length > 0 ? 
                `<p class="reward">Reward: ${achievement.reward[0].amount} ${achievement.reward[0].reward_type}</p>` : 
                ''
            }
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
```

**Achievement Structure**:
```rust
type Achievement = record {
    id: text;
    title: text;
    description: text;
    category: AchievementCategory;
    rarity: AchievementRarity;
    unlocked: bool;
    unlocked_at: opt nat64;
    reward: opt AchievementReward;
};
```

### claim_achievement_reward

Claims a reward from an unlocked achievement.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `achievement_id: String`

**Returns**: `Result<AchievementReward, String>`

## DeFi Simulation Methods

### simulate_liquidity_pool

Simulates liquidity pool participation and returns estimated rewards.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `amount: f64`

**Returns**: `Result<f64, String>`

### simulate_yield_farming

Simulates yield farming and returns estimated rewards.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `amount: f64`

**Returns**: `Result<f64, String>`

## Transaction Methods

### create_transaction

Creates a new transaction record.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`
- `transaction_type: TransactionType`
- `amount: f64`
- `to: Option<String>`

**TransactionType Variants**:
```rust
type TransactionType = variant {
    Deposit;
    Withdraw;
    Exchange;
    Stake;
};
```

**Returns**: `Result<Web3Transaction, String>`

### get_transaction_history

Retrieves transaction history for a wallet address.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Vec<Web3Transaction>`

**Web3Transaction Structure**:
```rust
type Web3Transaction = record {
    id: text;
    from: text;
    to: opt text;
    amount: float64;
    transaction_type: TransactionType;
    timestamp: nat64;
    status: TransactionStatus;
    hash: opt text;
};
```

## Monitoring and Health Methods

### health_check

Basic health check endpoint.

**Method Type**: Query
**Parameters**: None

**Returns**: `String`

### get_canister_metrics

Retrieves canister performance metrics (available in monitoring module).

**Method Type**: Query
**Parameters**: None

**Returns**: `CanisterMetrics`

### get_system_health

Gets overall system health status.

**Method Type**: Query
**Parameters**: None

**Returns**: `SystemHealth`

## Error Handling

All methods return `Result` types that can contain either success data or error messages. Common error scenarios include:

- **Authentication Errors**: Invalid signatures, expired sessions
- **Insufficient Balance**: Not enough funds for operations
- **Invalid Parameters**: Malformed input data
- **System Errors**: Canister storage or processing issues

### Error Types and Handling

**Common Error Patterns**:
```javascript
// Generic error handler for all canister calls
async function handleCanisterCall(canisterMethod, ...args) {
    try {
        const result = await canisterMethod(...args);
        
        if ('Ok' in result) {
            return { success: true, data: result.Ok };
        } else {
            return { success: false, error: result.Err };
        }
    } catch (error) {
        console.error('Canister call failed:', error);
        
        // Handle different types of network errors
        if (error.message.includes('fetch')) {
            return { success: false, error: 'Network connection failed' };
        } else if (error.message.includes('timeout')) {
            return { success: false, error: 'Request timed out' };
        } else if (error.message.includes('canister')) {
            return { success: false, error: 'Canister unavailable' };
        } else {
            return { success: false, error: 'Unknown error occurred' };
        }
    }
}

// Usage example
const result = await handleCanisterCall(
    actor.exchange_currency,
    walletAddress,
    'rupees',
    'tokens',
    1000
);

if (result.success) {
    console.log('Exchange successful:', result.data);
} else {
    console.error('Exchange failed:', result.error);
    showErrorToUser(result.error);
}
```

**Specific Error Handling Examples**:

```javascript
// Authentication error handling
async function authenticateUser(walletAddress, signature) {
    const result = await actor.authenticate_with_signature(walletAddress, signature);
    
    if ('Err' in result) {
        const error = result.Err;
        
        if (error.includes('invalid_signature')) {
            throw new Error('Invalid wallet signature. Please try signing again.');
        } else if (error.includes('expired_signature')) {
            throw new Error('Signature expired. Please generate a new signature.');
        } else if (error.includes('unsupported_wallet')) {
            throw new Error('Wallet type not supported. Please use MetaMask, Coinbase, or WalletConnect.');
        } else if (error.includes('rate_limited')) {
            throw new Error('Too many authentication attempts. Please wait before trying again.');
        } else {
            throw new Error(`Authentication failed: ${error}`);
        }
    }
    
    return result.Ok;
}

// Balance operation error handling
async function safeExchangeCurrency(walletAddress, fromCurrency, toCurrency, amount) {
    // Pre-validation
    if (amount <= 0) {
        throw new Error('Exchange amount must be positive');
    }
    
    if (fromCurrency === toCurrency) {
        throw new Error('Cannot exchange same currency');
    }
    
    // Get current balance first
    const balanceResult = await actor.get_dual_balance(walletAddress);
    if ('Err' in balanceResult) {
        throw new Error(`Failed to get balance: ${balanceResult.Err}`);
    }
    
    const balance = balanceResult.Ok;
    const availableBalance = fromCurrency === 'rupees' ? 
        balance.rupees_balance : balance.token_balance;
    
    if (availableBalance < amount) {
        throw new Error(`Insufficient ${fromCurrency} balance. Available: ${availableBalance}, Required: ${amount}`);
    }
    
    // Perform exchange
    const exchangeResult = await actor.exchange_currency(
        walletAddress, fromCurrency, toCurrency, amount
    );
    
    if ('Err' in exchangeResult) {
        const error = exchangeResult.Err;
        
        if (error.includes('insufficient_balance')) {
            throw new Error('Insufficient balance (balance changed during transaction)');
        } else if (error.includes('exchange_rate_changed')) {
            throw new Error('Exchange rate changed. Please try again.');
        } else if (error.includes('daily_limit_exceeded')) {
            throw new Error('Daily exchange limit exceeded. Please try again tomorrow.');
        } else if (error.includes('maintenance_mode')) {
            throw new Error('Exchange temporarily unavailable due to maintenance.');
        } else {
            throw new Error(`Exchange failed: ${error}`);
        }
    }
    
    return exchangeResult.Ok;
}

// Staking error handling
async function safeStakeTokens(walletAddress, amount, duration) {
    const validDurations = [30, 90, 180];
    
    if (!validDurations.includes(duration)) {
        throw new Error(`Invalid staking duration. Must be one of: ${validDurations.join(', ')} days`);
    }
    
    if (amount < 10) {
        throw new Error('Minimum staking amount is 10 tokens');
    }
    
    if (amount > 100000) {
        throw new Error('Maximum staking amount is 100,000 tokens');
    }
    
    const result = await actor.stake_tokens(walletAddress, amount, duration);
    
    if ('Err' in result) {
        const error = result.Err;
        
        if (error.includes('insufficient_tokens')) {
            throw new Error('Insufficient token balance for staking');
        } else if (error.includes('max_pools_reached')) {
            throw new Error('Maximum number of staking pools reached. Please claim existing pools first.');
        } else if (error.includes('staking_disabled')) {
            throw new Error('Staking is temporarily disabled');
        } else {
            throw new Error(`Staking failed: ${error}`);
        }
    }
    
    return result.Ok;
}
```

**Retry Logic for Network Errors**:
```javascript
// Exponential backoff retry logic
async function retryCanisterCall(canisterMethod, args, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await canisterMethod(...args);
            return result;
        } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors
            if (error.message.includes('invalid_signature') || 
                error.message.includes('insufficient_balance')) {
                throw error;
            }
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage
try {
    const result = await retryCanisterCall(
        actor.get_dual_balance,
        [walletAddress]
    );
    console.log('Balance retrieved:', result);
} catch (error) {
    console.error('Failed to get balance after retries:', error);
}
```

**Error Recovery Strategies**:
```javascript
// Comprehensive error recovery system
class CanisterErrorHandler {
    constructor(actor) {
        this.actor = actor;
        this.errorCounts = new Map();
        this.lastErrors = new Map();
    }
    
    async callWithRecovery(methodName, args, options = {}) {
        const { maxRetries = 3, fallbackValue = null } = options;
        
        try {
            const method = this.actor[methodName];
            const result = await retryCanisterCall(method.bind(this.actor), args, maxRetries);
            
            // Reset error count on success
            this.errorCounts.delete(methodName);
            return result;
            
        } catch (error) {
            // Track error frequency
            const count = this.errorCounts.get(methodName) || 0;
            this.errorCounts.set(methodName, count + 1);
            this.lastErrors.set(methodName, { error, timestamp: Date.now() });
            
            // Implement circuit breaker pattern
            if (count >= 5) {
                console.warn(`Circuit breaker activated for ${methodName}`);
                if (fallbackValue !== null) {
                    return fallbackValue;
                }
            }
            
            throw error;
        }
    }
    
    getErrorStats() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            lastErrors: Object.fromEntries(
                Array.from(this.lastErrors.entries()).map(([key, value]) => [
                    key, 
                    { error: value.error.message, timestamp: value.timestamp }
                ])
            )
        };
    }
}

// Usage
const errorHandler = new CanisterErrorHandler(actor);

// Get balance with fallback
const balance = await errorHandler.callWithRecovery(
    'get_dual_balance',
    [walletAddress],
    { 
        fallbackValue: { 
            Ok: { rupees_balance: 0, token_balance: 0, last_updated: Date.now() * 1000000 }
        }
    }
);
```

## Rate Limiting

The canister implements rate limiting for:
- Authentication attempts: 5 per minute per wallet
- Transaction creation: 10 per minute per wallet
- Balance queries: 60 per minute per wallet

## Security Considerations

- All update methods require proper authentication
- Wallet signatures are verified using cryptographic methods
- Session tokens have expiration times
- Transaction amounts are validated for reasonable limits
- All user inputs are sanitized and validated

## Integration Examples

### JavaScript/TypeScript Integration

```typescript
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/rust_icp_canister';

const agent = new HttpAgent();
const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: 'your-canister-id'
});

// Authenticate user
const authResult = await actor.authenticate_with_signature(
    walletAddress,
    signature
);

// Get balance
const balance = await actor.get_dual_balance(walletAddress);

// Exchange currency
const exchangeResult = await actor.exchange_currency(
    walletAddress,
    'rupees',
    'tokens',
    1000.0
);
```

### Complete Integration Example

```typescript
// Complete ICP canister integration with error handling and state management
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/rust_icp_canister';

class ICPCanisterService {
    private actor: any;
    private walletAddress: string | null = null;
    private isConnected = false;

    constructor(canisterId: string, host?: string) {
        const agent = new HttpAgent({ 
            host: host || 'http://localhost:4943' 
        });
        
        // Fetch root key for local development
        if (host?.includes('localhost')) {
            agent.fetchRootKey();
        }
        
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId
        });
    }

    // Initialize connection with wallet
    async connect(walletAddress: string, signature: string): Promise<boolean> {
        try {
            const authResult = await this.actor.authenticate_with_signature(
                walletAddress, 
                signature
            );
            
            if ('Ok' in authResult && authResult.Ok.success) {
                this.walletAddress = walletAddress;
                this.isConnected = true;
                
                // Store auth token
                if (authResult.Ok.token) {
                    localStorage.setItem('icp_auth_token', authResult.Ok.token);
                }
                
                console.log('Connected to ICP canister');
                return true;
            } else {
                throw new Error(authResult.Err || authResult.Ok?.error);
            }
        } catch (error) {
            console.error('ICP connection failed:', error);
            return false;
        }
    }

    // Get user's financial overview
    async getFinancialOverview(): Promise<{
        balance: any;
        stakingPools: any[];
        achievements: any[];
        totalWealth: number;
    }> {
        if (!this.isConnected || !this.walletAddress) {
            throw new Error('Not connected to canister');
        }

        try {
            // Fetch all financial data in parallel
            const [balanceResult, stakingPools, achievements] = await Promise.all([
                this.actor.get_dual_balance(this.walletAddress),
                this.actor.get_staking_info(this.walletAddress),
                this.actor.get_achievements(this.walletAddress)
            ]);

            if ('Err' in balanceResult) {
                throw new Error(`Failed to get balance: ${balanceResult.Err}`);
            }

            const balance = balanceResult.Ok;
            
            // Calculate total staked amount
            const totalStaked = stakingPools.reduce((sum, pool) => 
                sum + pool.staked_amount, 0
            );
            
            // Calculate total wealth (balance + staked + rewards)
            const totalRewards = stakingPools.reduce((sum, pool) => 
                sum + pool.current_rewards, 0
            );
            
            const totalWealth = balance.rupees_balance + 
                               (balance.token_balance * 10) + // Assume 1 token = 10 rupees
                               (totalStaked * 10) + 
                               (totalRewards * 10);

            return {
                balance,
                stakingPools,
                achievements,
                totalWealth
            };
        } catch (error) {
            console.error('Failed to get financial overview:', error);
            throw error;
        }
    }

    // Perform currency exchange with validation
    async exchangeCurrency(
        fromCurrency: 'rupees' | 'tokens',
        toCurrency: 'rupees' | 'tokens',
        amount: number
    ): Promise<any> {
        if (!this.isConnected || !this.walletAddress) {
            throw new Error('Not connected to canister');
        }

        // Validate inputs
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        if (fromCurrency === toCurrency) {
            throw new Error('Cannot exchange same currency');
        }

        try {
            // Check balance first
            const balanceResult = await this.actor.get_dual_balance(this.walletAddress);
            if ('Err' in balanceResult) {
                throw new Error(`Failed to check balance: ${balanceResult.Err}`);
            }

            const balance = balanceResult.Ok;
            const availableBalance = fromCurrency === 'rupees' ? 
                balance.rupees_balance : balance.token_balance;

            if (availableBalance < amount) {
                throw new Error(
                    `Insufficient ${fromCurrency} balance. ` +
                    `Available: ${availableBalance}, Required: ${amount}`
                );
            }

            // Perform exchange
            const exchangeResult = await this.actor.exchange_currency(
                this.walletAddress,
                fromCurrency,
                toCurrency,
                amount
            );

            if ('Err' in exchangeResult) {
                throw new Error(`Exchange failed: ${exchangeResult.Err}`);
            }

            const result = exchangeResult.Ok;
            if (!result.success) {
                throw new Error(result.error || 'Exchange failed');
            }

            console.log(`Exchange successful: ${result.from_amount} ${fromCurrency} → ${result.to_amount} ${toCurrency}`);
            return result;

        } catch (error) {
            console.error('Exchange error:', error);
            throw error;
        }
    }

    // Create staking pool with comprehensive validation
    async createStakingPool(amount: number, duration: number): Promise<any> {
        if (!this.isConnected || !this.walletAddress) {
            throw new Error('Not connected to canister');
        }

        // Validate staking parameters
        const validDurations = [30, 90, 180];
        if (!validDurations.includes(duration)) {
            throw new Error(`Invalid duration. Must be one of: ${validDurations.join(', ')} days`);
        }

        if (amount < 10) {
            throw new Error('Minimum staking amount is 10 tokens');
        }

        if (amount > 100000) {
            throw new Error('Maximum staking amount is 100,000 tokens');
        }

        try {
            // Check token balance
            const balanceResult = await this.actor.get_dual_balance(this.walletAddress);
            if ('Err' in balanceResult) {
                throw new Error(`Failed to check balance: ${balanceResult.Err}`);
            }

            if (balanceResult.Ok.token_balance < amount) {
                throw new Error(
                    `Insufficient token balance. ` +
                    `Available: ${balanceResult.Ok.token_balance}, Required: ${amount}`
                );
            }

            // Create staking pool
            const stakingResult = await this.actor.stake_tokens(
                this.walletAddress,
                amount,
                duration
            );

            if ('Err' in stakingResult) {
                throw new Error(`Staking failed: ${stakingResult.Err}`);
            }

            const pool = stakingResult.Ok;
            console.log(`Staking pool created: ${pool.id} (${amount} tokens for ${duration} days)`);
            
            return pool;

        } catch (error) {
            console.error('Staking error:', error);
            throw error;
        }
    }

    // Monitor staking pools and notify when ready to claim
    async monitorStakingPools(): Promise<any[]> {
        if (!this.isConnected || !this.walletAddress) {
            throw new Error('Not connected to canister');
        }

        try {
            const pools = await this.actor.get_staking_info(this.walletAddress);
            const now = Date.now() * 1000000; // Convert to nanoseconds
            
            const readyToClaim = pools.filter(pool => 
                pool.status === 'Active' && now >= pool.maturity_date
            );

            if (readyToClaim.length > 0) {
                console.log(`🎉 ${readyToClaim.length} staking pools ready to claim!`);
                
                // Calculate total claimable amount
                const totalClaimable = readyToClaim.reduce((sum, pool) => 
                    sum + pool.staked_amount + pool.current_rewards, 0
                );
                
                console.log(`Total claimable: ${totalClaimable.toFixed(2)} tokens`);
            }

            return readyToClaim;

        } catch (error) {
            console.error('Failed to monitor staking pools:', error);
            throw error;
        }
    }

    // Claim all available staking rewards
    async claimAllAvailableRewards(): Promise<{
        claimed: number;
        totalRewards: number;
        errors: string[];
    }> {
        const readyPools = await this.monitorStakingPools();
        const results = {
            claimed: 0,
            totalRewards: 0,
            errors: []
        };

        for (const pool of readyPools) {
            try {
                const claimResult = await this.actor.claim_staking_rewards(
                    this.walletAddress,
                    pool.id
                );

                if ('Ok' in claimResult) {
                    results.claimed++;
                    results.totalRewards += claimResult.Ok;
                    console.log(`Claimed pool ${pool.id}: ${claimResult.Ok} tokens`);
                } else {
                    results.errors.push(`Failed to claim pool ${pool.id}: ${claimResult.Err}`);
                }
            } catch (error) {
                results.errors.push(`Error claiming pool ${pool.id}: ${error.message}`);
            }
        }

        return results;
    }

    // Disconnect from canister
    disconnect(): void {
        this.walletAddress = null;
        this.isConnected = false;
        localStorage.removeItem('icp_auth_token');
        console.log('Disconnected from ICP canister');
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const health = await this.actor.health_check();
            return health === 'healthy';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

// Usage example
async function initializeICPService() {
    const icpService = new ICPCanisterService('your-canister-id');
    
    try {
        // Connect with wallet
        const connected = await icpService.connect(walletAddress, signature);
        if (!connected) {
            throw new Error('Failed to connect to ICP canister');
        }

        // Get financial overview
        const overview = await icpService.getFinancialOverview();
        console.log('Financial Overview:', overview);

        // Set up periodic monitoring
        setInterval(async () => {
            try {
                const readyPools = await icpService.monitorStakingPools();
                if (readyPools.length > 0) {
                    // Notify user about claimable rewards
                    showNotification(`${readyPools.length} staking pools ready to claim!`);
                }
            } catch (error) {
                console.error('Monitoring error:', error);
            }
        }, 60000); // Check every minute

    } catch (error) {
        console.error('ICP service initialization failed:', error);
    }
}

// Initialize the service
initializeICPService();
```

## Related Documentation

- [Blockchain Integration](../components/blockchain-integration.md) - ICP integration patterns and best practices
- [Web3 Authentication](../setup/configuration.md#web3-authentication) - Setting up wallet authentication
- [Game Server API](./game-server.md) - Game server endpoints and integration
- [Frontend APIs](./frontend-apis.md) - Frontend service integration
- [System Architecture](../architecture/system-architecture.md) - Overall system design

## External Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [Candid Interface Guide](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)
- [DFX Command Reference](https://internetcomputer.org/docs/current/references/cli-reference/dfx-parent)
- [Rust Canister Development](https://internetcomputer.org/docs/current/developer-docs/backend/rust/)

---

**Navigation**: [← API Index](./index.md) | [Main Documentation](../README.md) | [Game Server API →](./game-server.md)