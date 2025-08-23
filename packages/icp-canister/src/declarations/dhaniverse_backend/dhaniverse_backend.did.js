export const idlFactory = ({ IDL }) => {
  const User = IDL.Record({
    'id' : IDL.Text,
    'auth_method' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'game_username' : IDL.Text,
    'wallet_address' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'email' : IDL.Opt(IDL.Text),
  });
  const AuthResult = IDL.Record({
    'token' : IDL.Opt(IDL.Text),
    'is_new_user' : IDL.Opt(IDL.Bool),
    'user' : IDL.Opt(User),
    'error' : IDL.Opt(IDL.Text),
    'success' : IDL.Bool,
  });
  const Result = IDL.Variant({ 'Ok' : AuthResult, 'Err' : IDL.Text });
  const AchievementReward = IDL.Record({
    'reward_type' : IDL.Text,
    'amount' : IDL.Float64,
  });
  const Result_8 = IDL.Variant({ 'Ok' : AchievementReward, 'Err' : IDL.Text });
  const Result_7 = IDL.Variant({ 'Ok' : IDL.Float64, 'Err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const WalletType = IDL.Variant({
    'MetaMask' : IDL.Null,
    'WalletConnect' : IDL.Null,
    'Coinbase' : IDL.Null,
    'Phantom' : IDL.Null,
    'Injected' : IDL.Null,
  });
  const WalletConnection = IDL.Record({
    'balance' : IDL.Opt(IDL.Text),
    'chain_id' : IDL.Text,
    'address' : IDL.Text,
    'wallet_type' : WalletType,
  });
  const Result_3 = IDL.Variant({ 'Ok' : WalletConnection, 'Err' : IDL.Text });
  const Web3Session = IDL.Record({
    'connected_at' : IDL.Nat64,
    'wallet_address' : IDL.Text,
    'last_activity' : IDL.Nat64,
    'chain_id' : IDL.Text,
    'wallet_type' : WalletType,
  });
  const Result_1 = IDL.Variant({ 'Ok' : Web3Session, 'Err' : IDL.Text });
  const TransactionType = IDL.Variant({
    'Withdraw' : IDL.Null,
    'Deposit' : IDL.Null,
    'Exchange' : IDL.Null,
  });
  const TransactionStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'Confirmed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const Web3Transaction = IDL.Record({
    'id' : IDL.Text,
    'to' : IDL.Opt(IDL.Text),
    'status' : TransactionStatus,
    'transaction_type' : TransactionType,
    'from' : IDL.Text,
    'hash' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Nat64,
    'amount' : IDL.Float64,
  });
  const Result_9 = IDL.Variant({ 'Ok' : Web3Transaction, 'Err' : IDL.Text });
  const ExchangeResult = IDL.Record({
    'from_amount' : IDL.Float64,
    'transaction' : IDL.Opt(Web3Transaction),
    'rate' : IDL.Float64,
    'error' : IDL.Opt(IDL.Text),
    'to_amount' : IDL.Float64,
    'success' : IDL.Bool,
  });
  const Result_5 = IDL.Variant({ 'Ok' : ExchangeResult, 'Err' : IDL.Text });
  const AchievementCategory = IDL.Variant({
    'Learning' : IDL.Null,
    'Trading' : IDL.Null,
    'Saving' : IDL.Null,
  });
  const AchievementRarity = IDL.Variant({
    'Epic' : IDL.Null,
    'Rare' : IDL.Null,
    'Legendary' : IDL.Null,
    'Common' : IDL.Null,
  });
  const Achievement = IDL.Record({
    'id' : IDL.Text,
    'reward' : IDL.Opt(AchievementReward),
    'title' : IDL.Text,
    'unlocked' : IDL.Bool,
    'description' : IDL.Text,
    'unlocked_at' : IDL.Opt(IDL.Nat64),
    'category' : AchievementCategory,
    'rarity' : AchievementRarity,
  });
  const WalletInfo = IDL.Record({
    'icon' : IDL.Text,
    'name' : IDL.Text,
    'installed' : IDL.Bool,
    'download_url' : IDL.Opt(IDL.Text),
    'wallet_type' : WalletType,
  });
  const DualBalance = IDL.Record({
    'rupees_balance' : IDL.Float64,
    'last_updated' : IDL.Nat64,
    'token_balance' : IDL.Float64,
  });
  const Result_4 = IDL.Variant({ 'Ok' : DualBalance, 'Err' : IDL.Text });
  // (staking types removed)
  return IDL.Service({
    'authenticate_with_signature' : IDL.Func(
        [IDL.Text, IDL.Text],
        [Result],
        [],
      ),
    'claim_achievement_reward' : IDL.Func([IDL.Text, IDL.Text], [Result_8], []),
    'clear_session' : IDL.Func([IDL.Text], [Result_2], []),
    'connect_wallet' : IDL.Func(
        [WalletType, IDL.Text, IDL.Text],
        [Result_3],
        [],
      ),
    'create_session' : IDL.Func([WalletConnection], [Result_1], []),
    'create_transaction' : IDL.Func(
        [IDL.Text, TransactionType, IDL.Float64, IDL.Opt(IDL.Text)],
        [Result_9],
        [],
      ),
    'disconnect_wallet' : IDL.Func([IDL.Text], [Result_2], []),
    'exchange_currency' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Float64],
        [Result_5],
        [],
      ),
    'get_achievements' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(Achievement)],
        ['query'],
      ),
    'get_available_wallets' : IDL.Func([], [IDL.Vec(WalletInfo)], ['query']),
    'get_dual_balance' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'get_session' : IDL.Func([IDL.Text], [IDL.Opt(Web3Session)], ['query']),
    'get_transaction_history' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(Web3Transaction)],
        ['query'],
      ),
    'get_wallet_status' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(WalletConnection)],
        ['query'],
      ),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
    'simulate_liquidity_pool' : IDL.Func(
        [IDL.Text, IDL.Float64],
        [Result_7],
        [],
      ),
    'simulate_yield_farming' : IDL.Func(
        [IDL.Text, IDL.Float64],
        [Result_7],
        [],
      ),
  // (staking methods removed)
  });
};
export const init = ({ IDL }) => { return []; };
