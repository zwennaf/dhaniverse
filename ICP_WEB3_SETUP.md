# ICP Web3 Integration Setup Guide

## Overview
This project integrates Internet Computer Protocol (ICP) for Web3 functionality including wallet connection and token management.

## Canister Configuration

### Production (IC Network)
- **Canister ID**: `dzbzg-eqaaa-aaaap-an3rq-cai`
- **Network**: IC (Internet Computer mainnet)
- **Provider**: https://ic0.app

### Local Development
- **Network**: Local replica
- **Bind**: 127.0.0.1:4943
- **Type**: Ephemeral (temporary for testing)

## Quick Start

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Start Local Development
For local development with ICP replica:
```bash
# Start local ICP replica
dfx start --clean

# Deploy canister locally (in packages/icp-canister directory)
cd packages/icp-canister
dfx deploy

# Start frontend development server
cd ../..
npm run dev
```

### 3. Production Setup
The application is configured to automatically use the production canister on IC network when deployed.

## Features

### 🔐 Authentication
- **Internet Identity**: Secure authentication using ICP's Internet Identity
- **Web3 Wallets**: Support for connecting external Web3 wallets

### 💰 Token Management
- **Dual Balance**: Manages both game tokens and ICP tokens
- **Exchange**: Convert between game tokens and ICP tokens
- **Balance Tracking**: Real-time balance updates

### Note
Staking features have been removed from this project. The repo focuses on wallet connection, token management, and exchange functionality.

### 🔄 Canister Integration
The system automatically handles:
- ✅ **Canister Connection**: Connects to the appropriate canister based on environment
- ✅ **Network Detection**: Automatically switches between local/IC networks
- ✅ **Authentication Flow**: Manages Internet Identity and wallet connections
- ✅ **Token Operations**: All token transfers and exchanges
- ✅ **Error Handling**: Comprehensive error handling for all canister calls

## Configuration

### Environment Variables
Create a `.env` file in the client directory:
```env
# Network configuration
VITE_DFX_NETWORK=ic
VITE_CANISTER_ID=dzbzg-eqaaa-aaaap-an3rq-cai

# Development settings
NODE_ENV=development
```

### Canister Methods Available
The system integrates with these canister methods:
- `get_dual_balance() -> Result<{game_tokens: nat64, icp_tokens: nat64}, String>`
- `exchange_currency(from_game_to_icp: bool, amount: nat64) -> Result<(), String>`

## Dhani Coin Integration

### What is Dhani Coin?
Dhani Coin is the native game token that:
- 🎮 **Powers the Game Economy**: Used for in-game purchases, upgrades, and transactions
- 💱 **Exchangeable with ICP**: Players can convert between Dhani Coins and ICP tokens
- 🏆 **Earned Through Gameplay**: Players earn Dhani Coins by playing the game

### Automatic Handling
The system handles everything automatically:
- ✅ **Balance Management**: Tracks both Dhani Coins and ICP tokens
- ✅ **Exchange Rates**: Maintains current exchange rates between tokens
- ✅ **Transaction History**: Records all token movements and exchanges
- ✅ **Game Integration**: Seamlessly integrates with the Phaser game engine

## Troubleshooting

### Google One Tap Warning
The warning about Google One Tap is related to Internet Identity authentication. To resolve:

1. **For Development**: This warning can be safely ignored during development
2. **For Production**: Ensure Internet Identity integration follows the latest FedCM guidelines

The warning appears because:
- Internet Identity uses Google's authentication APIs
- Google is transitioning to FedCM (Federated Credential Management)
- The warning is informational and doesn't affect functionality

### Common Issues

#### 1. Canister Connection Failed
```typescript
Error: Canister not found or not accessible
```
**Solution**: Ensure the canister is deployed and the network is correct.

#### 2. Authentication Failed
```typescript
Error: Internet Identity authentication failed
```
**Solution**: Check Internet Identity service availability and try again.

#### 3. Balance Not Loading
```typescript
Error: Failed to fetch balance
```
**Solution**: Ensure wallet is connected and canister is accessible.

## File Structure

```
src/
├── services/
│   ├── ICPIntegrationService.ts     # Main ICP integration service
│   ├── TestnetBalanceManager.ts     # Balance and wallet management
├── ui/components/web3/
│   ├── Web3Integration.tsx         # Main Web3 wrapper component
│   ├── Web3Panel.tsx               # Web3 wallet panel UI
└── types/
    └── web3.ts                     # TypeScript type definitions
```

## API Reference

### ICPIntegrationService
```typescript
class ICPIntegrationService {
    // Initialize the service
    initialize(): Promise<boolean>
    
    // Authentication
    authenticateWithInternetIdentity(): Promise<boolean>
    connectWeb3Wallet(): Promise<boolean>
    
    // Balance operations
    getDualBalance(): Promise<{game_tokens: number, icp_tokens: number}>
    exchangeCurrency(fromGameToIcp: boolean, amount: number): Promise<boolean>
    
    // (Staking operations removed)
}
```

## Next Steps

1. **Deploy to Production**: Use `dfx deploy --network ic` to deploy to IC mainnet
2. **Test All Features**: Verify wallet connection and token operations
3. **Monitor Performance**: Use ICP dashboard to monitor canister performance
4. **Update Documentation**: Keep this guide updated as features evolve

## Support

For issues or questions:
1. Check the console for detailed error messages
2. Verify canister deployment status
3. Ensure Internet Identity service is accessible
4. Review network connectivity

The system is designed to handle all ICP operations automatically, including Dhani Coin management and Web3 integration.
