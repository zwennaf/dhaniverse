// Network configuration utility for ICP canister connections
export const NetworkConfig = {
  // Detect environment based on hostname or env variable
  getNetwork(): 'local' | 'ic' {
    // Check if explicitly set via environment variable
    const envNetwork = import.meta.env.VITE_DFX_NETWORK;
    if (envNetwork === 'local') {
      return 'local';
    }
    
    // Auto-detect based on hostname
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    
    return isLocalHost ? 'local' : 'ic';
  },

  // Get host URL based on environment
  getHost(): string {
    const network = this.getNetwork();
    
    if (network === 'local') {
      // Use local dfx replica
      return import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:4943';
    }
    
    // Use IC mainnet
    return 'https://ic0.app';
  },

  // Get the canister ID based on environment
  getCanisterId(): string {
    const network = this.getNetwork();
    
    // For local development, try to get from environment or use default
    if (network === 'local') {
      return import.meta.env.VITE_CANISTER_ID_DHANIVERSE_BACKEND_LOCAL || 
             import.meta.env.VITE_CANISTER_ID_DHANIVERSE_BACKEND || 
             'bd3sg-teaaa-aaaaa-qaaba-cai'; // Default local canister ID
    }
    
    // For IC mainnet
    return import.meta.env.VITE_CANISTER_ID_DHANIVERSE_BACKEND || '2v55c-vaaaa-aaaas-qbrpq-cai';
  },

  // Check if we're running locally
  isLocal(): boolean {
    return this.getNetwork() === 'local';
  },

  // Get Identity Provider URL based on environment
  getIdentityProviderUrl(): string {
    // ALWAYS use IC mainnet for Internet Identity (local II is complex to setup)
    // This is safe - II just provides authentication, actual canister calls use local replica
    return 'https://identity.internetcomputer.org/#authorize';
  },

  // Log current configuration
  logConfig(): void {
    console.log('ICP Network Configuration:', {
      network: this.getNetwork(),
      host: this.getHost(),
      canisterId: this.getCanisterId(),
      isLocal: this.isLocal(),
      identityProvider: this.getIdentityProviderUrl()
    });
  }
};

export default NetworkConfig;
