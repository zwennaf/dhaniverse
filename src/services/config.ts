// ICP Canister Configuration
export const ICP_CONFIG = {
  // Mainnet Canister Configuration
  CANISTER_ID: '2v55c-vaaaa-aaaas-qbrpq-cai',
  
  // Network URLs
  IC_HOST: process.env.NODE_ENV === 'production' ? 'https://ic0.app' : 'https://ic0.app',
  LOCAL_HOST: 'http://127.0.0.1:4943',
  
  // Internet Identity Configuration
  // Use Internet Identity v2 authorize URL
  INTERNET_IDENTITY_URL: 'https://identity.internetcomputer.org/#authorize',
  INTERNET_IDENTITY_CANISTER_ID: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
  
  // Canister URLs
  CANISTER_URL: 'https://2v55c-vaaaa-aaaas-qbrpq-cai.icp0.io/',
  CANDID_UI_URL: 'https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=2v55c-vaaaa-aaaas-qbrpq-cai',
  
  // Network Detection
  NETWORK: process.env.NODE_ENV === 'production' ? 'ic' : 'ic', // Always use mainnet for now
  
  // Feature Flags
  FEATURES: {
    WEB3_INTEGRATION: true,
    INTERNET_IDENTITY: true,
    DUAL_STORAGE: true,
    ACHIEVEMENTS: true,
  STAKING: false,
    DEFI_SIMULATIONS: true,
    HTTP_OUTCALLS: true,
    LEADERBOARD: true,
  },
  
  // Storage Configuration
  STORAGE: {
    // ICP Canister stores data on-chain in stable memory
    // No MongoDB needed for ICP functionality
    USE_ICP_STORAGE: true,
    USE_LOCAL_FALLBACK: true,
    SYNC_INTERVAL: 30000, // 30 seconds
  },
  
  // Supported Authentication Methods
  AUTH_METHODS: [
    'internet_identity',
    'web3_wallet'
  ] as const,
  
  // Supported Wallet Types
  SUPPORTED_WALLETS: [
    'MetaMask',
    'Coinbase',
    'WalletConnect',
    'Phantom'
  ] as const,
  
  // Default Settings
  DEFAULTS: {
    EXCHANGE_RATE: 0.1, // 1 Rupee = 0.1 Token
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    STAKING_APYS: {
      30: 5.0,   // 30 days = 5% APY
      90: 7.5,   // 90 days = 7.5% APY
      180: 10.0, // 180 days = 10% APY
      365: 15.0  // 365 days = 15% APY
    }
  }
} as const;

// Environment-specific configuration
export const getICPConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...ICP_CONFIG,
    HOST: isDevelopment ? ICP_CONFIG.LOCAL_HOST : ICP_CONFIG.IC_HOST,
    FETCH_ROOT_KEY: isDevelopment, // Only fetch root key in development
  };
};

// Data Storage Architecture Explanation
export const DATA_STORAGE_INFO = {
  description: `
    🏗️ Dhaniverse Data Storage Architecture
    
    📊 ICP Canister (Primary Storage):
    - All user data stored on-chain in stable memory
    - Wallet connections, balances, transactions
    - Achievements, staking pools, session data
    - Persistent across canister upgrades
    - No external database required
    
    🔄 Dual Storage System:
    - ICP Canister: Authoritative source
    - Local Storage: Caching and offline support
    - Web3 Services: Wallet integration layer
    
    💾 Data Types Stored in ICP:
    - UserData: Balances, transactions, achievements
    - Sessions: Web3 wallet sessions, Internet Identity
    - StakingPools: Token staking information
    - GlobalSettings: Exchange rates, APYs
    
    🚫 MongoDB NOT Required:
    - ICP canister handles all persistence
    - Stable memory survives upgrades
    - Built-in data consistency
    - Decentralized storage
    
    🔐 Security Features:
    - Internet Identity authentication
    - Cryptographic signatures for Web3
    - Principal-based access control
    - Immutable transaction history
    - Decentralized consensus
  `,
  
  benefits: [
    'No database setup required',
    'Automatic data persistence',
    'Decentralized storage',
    'Built-in security',
    'Upgrade-safe data',
    'Global accessibility',
    'Internet Identity integration'
  ],
  
  dataFlow: {
    'User Action': 'Frontend → ICP Canister → Stable Memory',
    'Data Retrieval': 'Frontend ← ICP Canister ← Stable Memory',
    'Internet Identity': 'II Auth → Frontend → ICP Canister',
    'Wallet Integration': 'Web3 Wallet → Frontend → ICP Canister',
    'Fallback': 'ICP Unavailable → Local Storage → Web3 Services'
  }
};

export type AuthMethod = typeof ICP_CONFIG.AUTH_METHODS[number];
export type WalletType = typeof ICP_CONFIG.SUPPORTED_WALLETS[number];
export type NetworkType = 'local' | 'ic';
export type StorageMode = 'icp' | 'local' | 'hybrid';