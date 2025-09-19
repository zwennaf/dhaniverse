// Mirror of relevant canister types used by the frontend (lightweight)
export type WalletType =
  | 'MetaMask'
  | 'Phantom'
  | 'Coinbase'
  | 'WalletConnect'
  | 'Injected';

export interface WalletInfo {
  name: string;
  wallet_type: WalletType;
  icon: string;
  installed: boolean;
  download_url?: string | null;
}

export interface DualBalance {
  rupees_balance: number;
  token_balance: number;
  last_updated: bigint | number;
}

export type TransactionType = 'Deposit' | 'Withdraw' | 'Exchange';
export type TransactionStatus = 'Pending' | 'Confirmed' | 'Failed';

export interface Web3Transaction {
  id: string;
  from: string;
  to?: string | null;
  amount: number;
  transaction_type: TransactionType;
  timestamp: number | bigint;
  status: TransactionStatus;
  hash?: string | null;
}

export interface PriceEntry {
  symbol: string;
  price: number;
}

export interface AchievementReward {
  reward_type: string;
  amount: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'Trading' | 'Saving' | 'Learning';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  unlocked: boolean;
  unlocked_at?: number | null;
  reward?: AchievementReward | null;
}

export default {};
