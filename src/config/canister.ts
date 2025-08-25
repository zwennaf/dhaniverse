// Canister configuration for dhaniverse
export const CANISTER_CONFIG = {
  // Main network canister IDs
  DHANIVERSE_BACKEND: '2v55c-vaaaa-aaaas-qbrpq-cai',
  
  // Network configuration
  NETWORK: 'ic', // 'local' for development, 'ic' for mainnet
  
  // Local development canister IDs (if needed)
  LOCAL_CANISTERS: {
    DHANIVERSE_BACKEND: 'rdmx6-jaaaa-aaaaa-aaadq-cai', // Example local ID
  }
};

// Helper function to get the correct canister ID based on environment
export function getCanisterId(canisterName: keyof typeof CANISTER_CONFIG.LOCAL_CANISTERS): string {
  // For now, always use the main network
  // You can add logic here to detect local vs production environment
  return CANISTER_CONFIG.DHANIVERSE_BACKEND;
}

// Environment helpers
export const isDevelopment = () => CANISTER_CONFIG.NETWORK === 'local';
export const isProduction = () => CANISTER_CONFIG.NETWORK === 'ic';
