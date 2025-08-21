# Web3 Integration Guide for Dhaniverse

This guide explains how to integrate the Web3 staking functionality into your Dhaniverse game frontend.

## 📦 What's Included

### Services
- **`TestnetBalanceManager.ts`** - Manages testnet token balances and faucet interactions
- **`StakingService.ts`** - Core staking logic, pool management, and rewards calculation
- **`Web3Integration.tsx`** - Simple integration component for adding Web3 buttons to your game

### UI Components
- **`StakingPanel.tsx`** - Complete staking dashboard with pools, stakes, and rewards
- **`Web3Panel.tsx`** - Web3 wallet dashboard with balance management and faucet access

## 🚀 Quick Integration

### 1. Add to Your Game Page

```tsx
import React from 'react';
import Web3Integration from './components/Web3Integration';

const GamePage: React.FC = () => {
    return (
        <div className="game-container">
            {/* Your existing game content */}
            
            {/* Add Web3 Integration */}
            <Web3Integration 
                position="top-right" 
                showStakingButton={true} 
            />
        </div>
    );
};
```

### 2. Add to Your Game HUD

```tsx
import React from 'react';
import Web3Integration from '../Web3Integration';

const GameHUD: React.FC = () => {
    return (
        <div className="game-hud">
            {/* Your existing HUD elements */}
            
            {/* Web3 Integration */}
            <Web3Integration 
                position="bottom-right"
                className="opacity-90 hover:opacity-100"
            />
        </div>
    );
};
```

### 3. Standalone Usage

```tsx
import React, { useState } from 'react';
import StakingPanel from './components/web3/StakingPanel';
import Web3Panel from './components/web3/Web3Panel';

const MyComponent: React.FC = () => {
    const [showStaking, setShowStaking] = useState(false);
    const [showWeb3, setShowWeb3] = useState(false);

    return (
        <div>
            <button onClick={() => setShowStaking(true)}>
                Open Staking
            </button>
            <button onClick={() => setShowWeb3(true)}>
                Open Web3 Wallet
            </button>

            <StakingPanel 
                isOpen={showStaking} 
                onClose={() => setShowStaking(false)} 
            />
            <Web3Panel 
                isOpen={showWeb3} 
                onClose={() => setShowWeb3(false)} 
            />
        </div>
    );
};
```

## 🔧 Service Usage Examples

### TestnetBalanceManager

```typescript
import { testnetBalanceManager } from '../services/TestnetBalanceManager';

// Initialize
await testnetBalanceManager.initialize();

// Get all tokens
const tokens = testnetBalanceManager.getAllTokens();

// Request faucet tokens
await testnetBalanceManager.requestFromFaucet('USDC', '100');

// Add custom token
testnetBalanceManager.addToken({
    symbol: 'CUSTOM',
    name: 'Custom Token',
    address: '0x123...',
    decimals: 18,
    balance: '0'
});

// Subscribe to balance updates
const unsubscribe = testnetBalanceManager.onBalanceUpdate((tokens) => {
    console.log('Balances updated:', tokens);
});
```

### StakingService

```typescript
import { stakingService } from '../services/StakingService';

// Initialize
await stakingService.initialize();

// Get available pools
const pools = stakingService.getStakingPools();

// Stake tokens
await stakingService.stakeTokens('usdc_stable', '100');

// Get user stakes
const stakes = stakingService.getUserStakes();

// Claim rewards
await stakingService.claimRewards(stakeId);

// Subscribe to updates
const unsubscribe = stakingService.onStakingUpdate((stakes) => {
    console.log('Stakes updated:', stakes);
});
```

## 🎮 Game Integration Events

### Listen for Game Events

```typescript
// Listen for game events that should open Web3 features
document.addEventListener('openStakingUI', () => {
    setShowStakingPanel(true);
});

document.addEventListener('openWeb3UI', () => {
    setShowWeb3Panel(true);
});
```

### Trigger from Game

```typescript
// From your Phaser game or other game logic
document.dispatchEvent(new CustomEvent('openStakingUI'));
document.dispatchEvent(new CustomEvent('openWeb3UI'));
```

## 📊 Features Overview

### TestnetBalanceManager Features
- ✅ Multi-token balance management
- ✅ Testnet faucet integration
- ✅ Network switching (Sepolia, Goerli, Mumbai)
- ✅ Transaction history
- ✅ Local storage persistence
- ✅ Real-time balance updates

### StakingService Features
- ✅ Multiple staking pools with different APYs
- ✅ Lock periods and risk levels
- ✅ Automatic reward calculation
- ✅ Manual and auto-claim rewards
- ✅ Emergency unstaking with penalties
- ✅ Portfolio statistics

### UI Components Features
- ✅ Modern, game-themed design
- ✅ Responsive layout
- ✅ Real-time updates
- ✅ Transaction notifications
- ✅ Modal-based interface
- ✅ Mobile-friendly

## 🎨 Customization

### Styling
All components use Tailwind CSS and can be customized by:
1. Modifying the className props
2. Updating the color schemes in the components
3. Adding custom CSS classes

### Adding New Tokens
```typescript
testnetBalanceManager.addToken({
    symbol: 'DVERSE',
    name: 'Dhaniverse Token',
    address: '0x...',
    decimals: 18,
    balance: '0',
    usdValue: 1.50 // Optional USD value
});
```

### Adding New Staking Pools
```typescript
// Extend the DEFAULT_STAKING_POOLS array in StakingService.ts
{
    id: 'dverse_pool',
    name: 'DVERSE Rewards Pool',
    tokenSymbol: 'DVERSE',
    contractAddress: '0x...',
    apy: 20.0,
    minimumStake: '10',
    lockPeriod: 45,
    totalStaked: '0',
    totalParticipants: 0,
    isActive: true,
    description: 'High-yield DVERSE staking pool',
    riskLevel: 'high',
    rewardTokenSymbol: 'DVERSE'
}
```

## 🔄 Data Persistence

All data is automatically saved to localStorage:
- Token balances
- Staking positions
- Transaction history
- User preferences

## 🛠 Troubleshooting

### Common Issues

1. **Components not showing**: Ensure you've imported the components correctly
2. **Styles not applied**: Make sure Tailwind CSS is configured
3. **Services not initialized**: Call the initialize methods before using services

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('web3_debug', 'true');
```

## 🚀 Next Steps

1. **Real Smart Contracts**: Replace mock functionality with actual Web3 contract calls
2. **Real Wallet Integration**: Add MetaMask/WalletConnect integration
3. **Price Feeds**: Integrate real token price data
4. **DeFi Protocols**: Connect to actual DeFi protocols for staking

## 📝 Example Implementation

Check the `Web3Integration.tsx` component for a complete example of how to integrate all features into your game interface.

The implementation is designed to be:
- **Non-intrusive**: Won't interfere with your existing game
- **Modular**: Use only the parts you need
- **Extensible**: Easy to add new features
- **Game-ready**: Styled to fit gaming interfaces
