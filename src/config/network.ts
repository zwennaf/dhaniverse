// Network configuration utility for ICP canister connections
export const NetworkConfig = {
  // Detect environment based on hostname or env variable
  getNetwork(): 'local' | 'ic' {
    // Check environment variable to determine network
    const envNetwork = import.meta.env.VITE_DFX_NETWORK;
    if (envNetwork === 'local') {
      return 'local';
    }
    if (envNetwork === 'ic') {
      return 'ic';
    }
    
    // Fallback: auto-detect based on hostname
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    return isLocalHost ? 'local' : 'ic';
  },

  // Get host URL based on environment
  getHost(): string {
    const envHost = import.meta.env.VITE_IC_HOST;
    if (envHost) {
      return envHost;
    }
    
    // Fallback based on network
    return this.getNetwork() === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
  },

  // Get the canister ID based on environment
  getCanisterId(): string {
    const envCanisterId = import.meta.env.VITE_CANISTER_ID_DHANIVERSE_BACKEND;
    if (envCanisterId) {
      return envCanisterId;
    }
    
    // Fallback to production canister
    return '2v55c-vaaaa-aaaas-qbrpq-cai';
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
