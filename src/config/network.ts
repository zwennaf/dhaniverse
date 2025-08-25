// Network configuration utility for ICP canister connections
export const NetworkConfig = {
  // Always use IC mainnet - never local for production
  getNetwork(): 'local' | 'ic' {
    // Force IC network always - we want to use real canister on IC mainnet
    return 'ic';
  },

  // Always use IC mainnet host
  getHost(): string {
    // Always connect to IC mainnet, never localhost
    return 'https://ic0.app';
  },

  // Get the canister ID
  getCanisterId(): string {
    return import.meta.env.VITE_CANISTER_ID_DHANIVERSE_BACKEND || '2v55c-vaaaa-aaaas-qbrpq-cai';
  },

  // Check if we're running locally (always false now since we force IC)
  isLocal(): boolean {
    return false; // Always use IC mainnet
  },

  // Always use IC mainnet Identity Provider
  getIdentityProviderUrl(): string {
    return 'https://identity.ic0.app/#authorize';
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
