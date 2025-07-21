# Dhaniverse ICP Canister

This package contains the Internet Computer Protocol (ICP) canister implementation for Dhaniverse's blockchain integration. The canister provides on-chain banking functionality and decentralized leaderboards for the financial education game.

## Features

### 🏦 Banking Operations
- **Account Management**: Principal-based account creation and balance tracking
- **Deposits & Withdrawals**: Secure transaction processing with unique IDs
- **Transaction History**: Complete audit trail of all financial operations
- **Balance Queries**: Real-time balance retrieval for any principal

### 🏆 Leaderboard System
- **Trade Recording**: Track profitable stock market trades on-chain
- **Ranking System**: Automatic ranking based on total profits
- **Achievement Badges**: Dynamic badge system for trading milestones
- **Verification**: Tamper-proof trading performance records

### 🔐 Security Features
- **Principal-based Access**: Each user identified by unique ICP principal
- **Transaction Validation**: Input validation and error handling
- **Immutable Records**: All data stored permanently on blockchain
- **Health Monitoring**: Canister health check endpoints

## Architecture

The canister is built using the Azle framework, providing TypeScript support for ICP development:

```typescript
// Core data structures
interface BankAccount {
  principal: string;
  balance: number;
  lastUpdated: number;
  transactionCount: number;
}

interface Transaction {
  id: string;
  principal: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  timestamp: number;
}

interface LeaderboardEntry {
  principal: string;
  totalProfit: number;
  tradeCount: number;
  rank: number;
  badges: string[];
}
```

## API Methods

### Banking Operations
- `getBalance(principal: string)` - Get account balance
- `deposit(amount: number)` - Deposit funds to caller's account
- `withdraw(amount: number)` - Withdraw funds from caller's account
- `getTransactionHistory(principal: string)` - Get transaction history

### Leaderboard Operations
- `recordTrade(profit: number, stockSymbol: string)` - Record a profitable trade
- `getLeaderboard(limit?: number)` - Get top traders
- `getUserRank(principal: string)` - Get user's current rank

### Utility
- `getHealth()` - Health check endpoint

## Development

### Prerequisites
- [DFX](https://internetcomputer.org/docs/current/references/cli-reference/dfx-parent) version 0.22.0+
- Node.js 18+
- ICP wallet (Plug recommended)

### Local Development

```bash
# Start local ICP replica
npm run start

# Deploy canister locally
npm run deploy

# Build canister
npm run build
```

### Deployment Configuration

The canister is configured in `dfx.json`:

```json
{
  "canisters": {
    "dhaniverse": {
      "type": "azle",
      "main": "src/index.ts",
      "declarations": {
        "output": "test/dfx_generated/dhaniverse",
        "node_compatibility": true
      }
    }
  }
}
```

## Integration with Frontend

The canister integrates with the Dhaniverse frontend through:

1. **ICPActorService**: TypeScript service for canister communication
2. **WalletManager**: Handles Plug wallet connection and authentication
3. **DualStorageManager**: Manages hybrid local/blockchain data storage

## WCHL25 Hackathon Alignment

This canister demonstrates:

- **Real Blockchain Utility**: Solves actual problems in financial education
- **User-friendly Integration**: Optional enhancement, not replacement
- **Tamper-proof Records**: Immutable financial education progress
- **Decentralized Verification**: Trustless leaderboard and achievement system

## Security Considerations

- All operations are principal-scoped for user isolation
- Input validation prevents invalid transactions
- Error handling provides graceful failure modes
- No sensitive data stored on-chain (only financial game data)

## Performance

- Efficient data structures for fast queries
- Minimal storage footprint
- Optimized for frequent read operations
- Scalable architecture for multiple concurrent users