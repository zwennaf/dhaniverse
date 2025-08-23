import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Achievement {
  'id' : string,
  'reward' : [] | [AchievementReward],
  'title' : string,
  'unlocked' : boolean,
  'description' : string,
  'unlocked_at' : [] | [bigint],
  'category' : AchievementCategory,
  'rarity' : AchievementRarity,
}
export type AchievementCategory = { 'Learning' : null } |
  { 'Trading' : null } |
  { 'Saving' : null };
export type AchievementRarity = { 'Epic' : null } |
  { 'Rare' : null } |
  { 'Legendary' : null } |
  { 'Common' : null };
export interface AchievementReward { 'reward_type' : string, 'amount' : number }
export interface AuthResult {
  'token' : [] | [string],
  'is_new_user' : [] | [boolean],
  'user' : [] | [User],
  'error' : [] | [string],
  'success' : boolean,
}
export interface DualBalance {
  'rupees_balance' : number,
  'last_updated' : bigint,
  'token_balance' : number,
}
export interface ExchangeResult {
  'from_amount' : number,
  'transaction' : [] | [Web3Transaction],
  'rate' : number,
  'error' : [] | [string],
  'to_amount' : number,
  'success' : boolean,
}
export type Result = { 'Ok' : AuthResult } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : Web3Session } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : WalletConnection } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : DualBalance } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : ExchangeResult } |
  { 'Err' : string };
// (staking result removed)
export type Result_7 = { 'Ok' : number } |
  { 'Err' : string };
export type Result_8 = { 'Ok' : AchievementReward } |
  { 'Err' : string };
export type Result_9 = { 'Ok' : Web3Transaction } |
  { 'Err' : string };
// (staking types removed)
export type TransactionStatus = { 'Failed' : null } |
  { 'Confirmed' : null } |
  { 'Pending' : null };
export type TransactionType = { 'Withdraw' : null } |
  { 'Deposit' : null } |
  { 'Exchange' : null };
export interface User {
  'id' : string,
  'auth_method' : string,
  'updated_at' : bigint,
  'game_username' : string,
  'wallet_address' : [] | [string],
  'created_at' : bigint,
  'email' : [] | [string],
}
export interface WalletConnection {
  'balance' : [] | [string],
  'chain_id' : string,
  'address' : string,
  'wallet_type' : WalletType,
}
export interface WalletInfo {
  'icon' : string,
  'name' : string,
  'installed' : boolean,
  'download_url' : [] | [string],
  'wallet_type' : WalletType,
}
export type WalletType = { 'MetaMask' : null } |
  { 'WalletConnect' : null } |
  { 'Coinbase' : null } |
  { 'Phantom' : null } |
  { 'Injected' : null };
export interface Web3Session {
  'connected_at' : bigint,
  'wallet_address' : string,
  'last_activity' : bigint,
  'chain_id' : string,
  'wallet_type' : WalletType,
}
export interface Web3Transaction {
  'id' : string,
  'to' : [] | [string],
  'status' : TransactionStatus,
  'transaction_type' : TransactionType,
  'from' : string,
  'hash' : [] | [string],
  'timestamp' : bigint,
  'amount' : number,
}
export interface _SERVICE {
  'authenticate_with_signature' : ActorMethod<[string, string], Result>,
  'claim_achievement_reward' : ActorMethod<[string, string], Result_8>,
  // (staking methods removed)
  'clear_session' : ActorMethod<[string], Result_2>,
  'connect_wallet' : ActorMethod<[WalletType, string, string], Result_3>,
  'create_session' : ActorMethod<[WalletConnection], Result_1>,
  'create_transaction' : ActorMethod<
    [string, TransactionType, number, [] | [string]],
    Result_9
  >,
  'disconnect_wallet' : ActorMethod<[string], Result_2>,
  'exchange_currency' : ActorMethod<[string, string, string, number], Result_5>,
  'get_achievements' : ActorMethod<[string], Array<Achievement>>,
  'get_available_wallets' : ActorMethod<[], Array<WalletInfo>>,
  'get_dual_balance' : ActorMethod<[string], Result_4>,
  'get_session' : ActorMethod<[string], [] | [Web3Session]>,
  // Staking methods removed
  'get_transaction_history' : ActorMethod<[string], Array<Web3Transaction>>,
  'get_wallet_status' : ActorMethod<[string], [] | [WalletConnection]>,
  'health_check' : ActorMethod<[], string>,
  'simulate_liquidity_pool' : ActorMethod<[string, number], Result_7>,
  'simulate_yield_farming' : ActorMethod<[string, number], Result_7>,
  // Staking methods removed
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
