import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

// Import the generated declarations
// Note: Run 'dfx generate --network ic dhaniverse_backend' first in packages/icp-canister directory

// Canister configuration
const CANISTER_ID = 'dzbzg-eqaaa-aaaap-an3rq-cai';
const HOST = process.env.NODE_ENV === 'production' ? 'https://ic0.app' : 'https://ic0.app';

// Store the canister URL for reference
export const CANISTER_URL = `https://${CANISTER_ID}.icp0.io/`;
export const CANDID_UI_URL = `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=${CANISTER_ID}`;

// Create HTTP agent
const agent = new HttpAgent({ host: HOST });

// For local development, uncomment this line:
// agent.fetchRootKey();

// Create actor (canister interface)
export const createActor = async (canisterId: string, options?: { agentOptions?: any }) => {
  const agent = new HttpAgent({
    host: HOST,
    ...options?.agentOptions,
  });

  // For local development only
  if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch(err => {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
      console.error(err);
    });
  }

  // Dynamic import to avoid module conflicts
  try {
    const { idlFactory } = await import('../../packages/icp-canister/src/declarations/dhaniverse_backend/dhaniverse_backend.did.js');
    
    return Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });
  } catch (error) {
    console.error('Failed to import declarations. Make sure to run: dfx generate --network ic dhaniverse_backend');
    throw new Error('Canister declarations not found. Run dfx generate first.');
  }
};

// ICP Service class
export class ICPService {
  private actor: any;
  private authClient: AuthClient | null = null;
  private actorInitialized: boolean = false;

  constructor() {
    this.initializeActor();
  }

  private async initializeActor() {
    try {
      this.actor = await createActor(CANISTER_ID);
      this.actorInitialized = true;
    } catch (error) {
      console.error('Failed to initialize actor:', error);
    }
  }

  private async ensureActor() {
    if (!this.actorInitialized) {
      await this.initializeActor();
    }
    if (!this.actor) {
      throw new Error('Actor not initialized. Make sure to run: dfx generate --network ic dhaniverse_backend');
    }
  }

  // Initialize auth client
  async initAuth() {
    this.authClient = await AuthClient.create();
    return this.authClient;
  }

  // Login with Internet Identity
  async login() {
    if (!this.authClient) {
      await this.initAuth();
    }

    return new Promise<boolean>((resolve) => {
      this.authClient!.login({
        identityProvider: 'https://identity.ic0.app/#authorize',
        onSuccess: () => {
          console.log('Login successful');
          resolve(true);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          resolve(false);
        },
      });
    });
  }

  // Logout
  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    if (!this.authClient) {
      await this.initAuth();
    }
    return await this.authClient!.isAuthenticated();
  }

  // Get user principal
  async getPrincipal() {
    if (!this.authClient) {
      await this.initAuth();
    }
    const identity = this.authClient!.getIdentity();
    return identity.getPrincipal().toString();
  }

  // Canister method calls (add these after dfx generate)
  
  // Health check
  async healthCheck() {
    try {
      await this.ensureActor();
      return await this.actor.health_check();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Get available wallets
  async getAvailableWallets() {
    try {
      return await this.actor.get_available_wallets();
    } catch (error) {
      console.error('Get wallets failed:', error);
      throw error;
    }
  }

  // Connect wallet
  async connectWallet(walletType: string, address: string, chainId: string) {
    try {
      return await this.actor.connect_wallet(walletType, address, chainId);
    } catch (error) {
      console.error('Connect wallet failed:', error);
      throw error;
    }
  }

  // Get dual balance
  async getDualBalance(walletAddress: string) {
    try {
      return await this.actor.get_dual_balance(walletAddress);
    } catch (error) {
      console.error('Get balance failed:', error);
      throw error;
    }
  }

  // Exchange currency
  async exchangeCurrency(walletAddress: string, fromCurrency: string, toCurrency: string, amount: number) {
    try {
      return await this.actor.exchange_currency(walletAddress, fromCurrency, toCurrency, amount);
    } catch (error) {
      console.error('Exchange currency failed:', error);
      throw error;
    }
  }

  // Get canister metrics
  async getCanisterMetrics() {
    try {
      return await this.actor.get_canister_metrics();
    } catch (error) {
      console.error('Get metrics failed:', error);
      throw error;
    }
  }

  // Additional methods for your canister
  async getAchievements(walletAddress: string) {
    try {
      return await this.actor.get_achievements(walletAddress);
    } catch (error) {
      console.error('Get achievements failed:', error);
      throw error;
    }
  }

  async stakeTokens(walletAddress: string, amount: number, duration: number) {
    try {
      return await this.actor.stake_tokens(walletAddress, amount, duration);
    } catch (error) {
      console.error('Stake tokens failed:', error);
      throw error;
    }
  }

  async getStakingInfo(walletAddress: string) {
    try {
      return await this.actor.get_staking_info(walletAddress);
    } catch (error) {
      console.error('Get staking info failed:', error);
      throw error;
    }
  }

  async getTransactionHistory(walletAddress: string) {
    try {
      return await this.actor.get_transaction_history(walletAddress);
    } catch (error) {
      console.error('Get transaction history failed:', error);
      throw error;
    }
  }

  async claimStakingRewards(walletAddress: string, stakingId: string) {
    try {
      return await this.actor.claim_staking_rewards(walletAddress, stakingId);
    } catch (error) {
      console.error('Claim staking rewards failed:', error);
      throw error;
    }
  }

  async simulateLiquidityPool(walletAddress: string, amount: number) {
    try {
      return await this.actor.simulate_liquidity_pool(walletAddress, amount);
    } catch (error) {
      console.error('Simulate liquidity pool failed:', error);
      throw error;
    }
  }

  async simulateYieldFarming(walletAddress: string, amount: number) {
    try {
      return await this.actor.simulate_yield_farming(walletAddress, amount);
    } catch (error) {
      console.error('Simulate yield farming failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const icpService = new ICPService();