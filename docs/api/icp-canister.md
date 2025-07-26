# ICP Canister API Reference

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
const result = await actor.authenticate_with_signature(
    "0x742d35Cc6634C0532925a3b8D404d3aABe5475cc",
    "0x1234567890abcdef..."
);
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

### clear_session

Clears an existing session for a wallet address.

**Method Type**: Update
**Parameters**:
- `wallet_address: String`

**Returns**: `Result<(), String>`

### get_session

Retrieves session information for a wallet address.

**Method Type**: Query
**Parameters**:
- `wallet_address: String`

**Returns**: `Option<Web3Session>`

## Wallet Management Methods

### get_available_wallets

Returns a list of supported wallet types and their information.

**Method Type**: Query
**Parameters**: None

**Returns**: `Vec<WalletInfo>`

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

### Error Handling Example

```typescript
try {
    const result = await actor.stake_tokens(walletAddress, 500.0, 30);
    if ('Ok' in result) {
        console.log('Staking successful:', result.Ok);
    } else {
        console.error('Staking failed:', result.Err);
    }
} catch (error) {
    console.error('Network error:', error);
}
```