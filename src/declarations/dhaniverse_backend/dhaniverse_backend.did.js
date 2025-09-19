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
  const Result_10 = IDL.Variant({
    'Ok' : IDL.Opt(IDL.Float64),
    'Err' : IDL.Text,
  });
  const Result_11 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Float64)),
    'Err' : IDL.Text,
  });
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
  const PriceEntry = IDL.Record({ 'price' : IDL.Float64, 'symbol' : IDL.Text });
  const PriceSnapshot = IDL.Record({
    'timestamp' : IDL.Nat64,
    'prices' : IDL.Vec(PriceEntry),
  });
  const Result_7 = IDL.Variant({ 'Ok' : IDL.Float64, 'Err' : IDL.Text });
  const Result_12 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  return IDL.Service({
    'authenticate_with_signature' : IDL.Func(
        [IDL.Text, IDL.Text],
        [Result],
        [],
      ),
    'broadcast_market_summary' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'broadcast_stock_news' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'broadcast_stock_update' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'claim_achievement_reward' : IDL.Func([IDL.Text, IDL.Text], [Result_8], []),
    'cleanup_stock_cache' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
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
    'fetch_and_append_snapshot' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'fetch_coin_history' : IDL.Func(
        [IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Float64)),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
    'fetch_coin_market_chart_range' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat64, IDL.Nat64],
        [
          IDL.Variant({
            'Ok' : IDL.Vec(
              IDL.Tuple(IDL.Text, IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Float64)))
            ),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
    'fetch_coin_ohlc' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat32],
        [
          IDL.Variant({
            'Ok' : IDL.Vec(
              IDL.Tuple(
                IDL.Nat64,
                IDL.Float64,
                IDL.Float64,
                IDL.Float64,
                IDL.Float64,
              )
            ),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
    'fetch_external_price' : IDL.Func([IDL.Text], [Result_10], []),
    'fetch_multiple_crypto_prices' : IDL.Func([IDL.Text], [Result_11], []),
    'fetch_stock_price' : IDL.Func([IDL.Text], [Result_10], []),
    'get_achievements' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(Achievement)],
        ['query'],
      ),
    'get_available_wallets' : IDL.Func([], [IDL.Vec(WalletInfo)], ['query']),
    'get_dual_balance' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'get_market_summary' : IDL.Func(
        [],
        [
          IDL.Variant({
            'Ok' : IDL.Vec(
              IDL.Tuple(
                IDL.Text,
                IDL.Record({
                  'id' : IDL.Text,
                  'metrics' : IDL.Record({
                    'eps' : IDL.Float64,
                    'market_cap' : IDL.Float64,
                    'volatility' : IDL.Float64,
                    'pe_ratio' : IDL.Float64,
                    'outstanding_shares' : IDL.Nat64,
                    'industry_avg_pe' : IDL.Float64,
                    'business_growth' : IDL.Float64,
                    'debt_equity_ratio' : IDL.Float64,
                  }),
                  'name' : IDL.Text,
                  'news' : IDL.Vec(IDL.Text),
                  'current_price' : IDL.Float64,
                  'price_history' : IDL.Vec(
                    IDL.Record({
                      'low' : IDL.Float64,
                      'high' : IDL.Float64,
                      'close' : IDL.Float64,
                      'open' : IDL.Float64,
                      'volume' : IDL.Nat64,
                      'timestamp' : IDL.Nat64,
                      'price' : IDL.Float64,
                    })
                  ),
                  'last_update' : IDL.Nat64,
                  'symbol' : IDL.Text,
                }),
              )
            ),
            'Err' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'get_price_history' : IDL.Func([], [IDL.Vec(PriceSnapshot)], ['query']),
    'get_session' : IDL.Func([IDL.Text], [IDL.Opt(Web3Session)], ['query']),
    'get_stock_data' : IDL.Func(
        [IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'id' : IDL.Text,
              'metrics' : IDL.Record({
                'eps' : IDL.Float64,
                'market_cap' : IDL.Float64,
                'volatility' : IDL.Float64,
                'pe_ratio' : IDL.Float64,
                'outstanding_shares' : IDL.Nat64,
                'industry_avg_pe' : IDL.Float64,
                'business_growth' : IDL.Float64,
                'debt_equity_ratio' : IDL.Float64,
              }),
              'name' : IDL.Text,
              'news' : IDL.Vec(IDL.Text),
              'current_price' : IDL.Float64,
              'price_history' : IDL.Vec(
                IDL.Record({
                  'low' : IDL.Float64,
                  'high' : IDL.Float64,
                  'close' : IDL.Float64,
                  'open' : IDL.Float64,
                  'volume' : IDL.Nat64,
                  'timestamp' : IDL.Nat64,
                  'price' : IDL.Float64,
                })
              ),
              'last_update' : IDL.Nat64,
              'symbol' : IDL.Text,
            }),
            'Err' : IDL.Text,
          }),
        ],
        ['query'],
      ),
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
    'refresh_stock_cache' : IDL.Func(
        [IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'id' : IDL.Text,
              'metrics' : IDL.Record({
                'eps' : IDL.Float64,
                'market_cap' : IDL.Float64,
                'volatility' : IDL.Float64,
                'pe_ratio' : IDL.Float64,
                'outstanding_shares' : IDL.Nat64,
                'industry_avg_pe' : IDL.Float64,
                'business_growth' : IDL.Float64,
                'debt_equity_ratio' : IDL.Float64,
              }),
              'name' : IDL.Text,
              'news' : IDL.Vec(IDL.Text),
              'current_price' : IDL.Float64,
              'price_history' : IDL.Vec(
                IDL.Record({
                  'low' : IDL.Float64,
                  'high' : IDL.Float64,
                  'close' : IDL.Float64,
                  'open' : IDL.Float64,
                  'volume' : IDL.Nat64,
                  'timestamp' : IDL.Nat64,
                  'price' : IDL.Float64,
                })
              ),
              'last_update' : IDL.Nat64,
              'symbol' : IDL.Text,
            }),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
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
    'sse_broadcast_answer' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_broadcast_ice_candidate' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_broadcast_offer' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_broadcast_peer_joined' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_broadcast_peer_left' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_cleanup_connections' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'sse_get_global_stats' : IDL.Func(
        [],
        [IDL.Tuple(IDL.Nat, IDL.Nat, IDL.Nat)],
        ['query'],
      ),
    'sse_get_room_stats' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Tuple(IDL.Nat, IDL.Nat), 'Err' : IDL.Text })],
        ['query'],
      ),
    'subscribe_stock_updates' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'update_prices_from_external' : IDL.Func([], [Result_12], []),
  });
};
export const init = ({ IDL }) => { return []; };
