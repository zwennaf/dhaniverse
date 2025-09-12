use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::HashMap;
use ic_stable_structures::{Storable, storable::Bound};
use std::borrow::Cow;

// Wallet Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum WalletType {
    MetaMask,
    Phantom,
    Coinbase,
    WalletConnect,
    Injected,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WalletConnection {
    pub address: String,
    pub chain_id: String,
    pub wallet_type: WalletType,
    pub balance: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WalletInfo {
    pub name: String,
    pub wallet_type: WalletType,
    pub icon: String,
    pub installed: bool,
    pub download_url: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WalletStatus {
    pub connected: bool,
    pub address: Option<String>,
    pub wallet_type: Option<WalletType>,
    pub error: Option<String>,
    pub is_connecting: Option<bool>,
    pub balance: Option<String>,
}

// Banking Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DualBalance {
    pub rupees_balance: f64,
    pub token_balance: f64,
    pub last_updated: u64,
}

// Staking feature removed: StakingStatus and StakingPool types deleted

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ExchangeResult {
    pub success: bool,
    pub from_amount: f64,
    pub to_amount: f64,
    pub rate: f64,
    pub transaction: Option<Web3Transaction>,
    pub error: Option<String>,
}

// Achievement Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum AchievementCategory {
    Trading,
    Saving,
    Learning,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum AchievementRarity {
    Common,
    Rare,
    Epic,
    Legendary,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AchievementReward {
    pub reward_type: String, // "rupees" or "tokens"
    pub amount: f64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Achievement {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: AchievementCategory,
    pub rarity: AchievementRarity,
    pub unlocked: bool,
    pub unlocked_at: Option<u64>,
    pub reward: Option<AchievementReward>,
}

// Transaction Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum TransactionType {
    Deposit,
    Withdraw,
    Exchange,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Web3Transaction {
    pub id: String,
    pub from: String,
    pub to: Option<String>,
    pub amount: f64,
    pub transaction_type: TransactionType,
    pub timestamp: u64,
    pub status: TransactionStatus,
    pub hash: Option<String>,
}

// Authentication Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Web3Session {
    pub wallet_address: String,
    pub wallet_type: WalletType,
    pub chain_id: String,
    pub connected_at: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct User {
    pub id: String,
    pub email: Option<String>,
    pub game_username: String,
    pub wallet_address: Option<String>,
    pub auth_method: String, // "email", "google", "web3"
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AuthResult {
    pub success: bool,
    pub user: Option<User>,
    pub token: Option<String>,
    pub is_new_user: Option<bool>,
    pub error: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Web3AuthRequest {
    pub wallet_address: String,
    pub signature: String,
    pub message: String,
    pub timestamp: u64,
}

// State Management Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct CanisterState {
    pub users: HashMap<String, UserData>,
    pub sessions: HashMap<String, Web3Session>,
    pub wallet_connections: HashMap<String, WalletConnection>,
    pub global_settings: GlobalSettings,
    pub price_feeds: HashMap<String, f64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserData {
    pub wallet_address: String,
    pub dual_balance: DualBalance,
    pub staking_pools: Vec<()> /* staking removed */,
    pub achievements: Vec<Achievement>,
    pub transactions: Vec<Web3Transaction>,
    pub created_at: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct GlobalSettings {
    pub exchange_rate: f64, // 1 Rupee = 0.1 Token
    pub staking_apys: HashMap<u32, f64>, // Staking removed: left empty by default
    pub achievement_definitions: Vec<Achievement>,
    pub session_timeout: u64, // in nanoseconds
}

impl Default for GlobalSettings {
    fn default() -> Self {
    let staking_apys = HashMap::new();
        Self {
            exchange_rate: 0.1,
            staking_apys,
            achievement_definitions: Vec::new(),
            session_timeout: 24 * 60 * 60 * 1_000_000_000, // 24 hours in nanoseconds
        }
    }
}

impl UserData {
    pub fn new(wallet_address: String) -> Self {
        let now = ic_cdk::api::time();
        Self {
            wallet_address,
            dual_balance: DualBalance {
                rupees_balance: 0.0, // Starting balance
                token_balance: 0.0,
                last_updated: now,
            },
            staking_pools: Vec::new(),
            achievements: Vec::new(),
            transactions: Vec::new(),
            created_at: now,
            last_activity: now,
        }
    }
}

// Utility functions for type conversions
impl From<&str> for WalletType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "metamask" => WalletType::MetaMask,
            "phantom" => WalletType::Phantom,
            "coinbase" => WalletType::Coinbase,
            "walletconnect" => WalletType::WalletConnect,
            _ => WalletType::Injected,
        }
    }
}

impl From<&str> for TransactionType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "deposit" => TransactionType::Deposit,
            "withdraw" => TransactionType::Withdraw,
            "exchange" => TransactionType::Exchange,
            // "stake" mapping removed
            _ => TransactionType::Deposit,
        }
    }
}

impl From<&str> for AchievementCategory {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "trading" => AchievementCategory::Trading,
            "saving" => AchievementCategory::Saving,
            "learning" => AchievementCategory::Learning,
            _ => AchievementCategory::Trading,
        }
    }
}

impl From<&str> for AchievementRarity {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "common" => AchievementRarity::Common,
            "rare" => AchievementRarity::Rare,
            "epic" => AchievementRarity::Epic,
            "legendary" => AchievementRarity::Legendary,
            _ => AchievementRarity::Common,
        }
    }
}

// Storable implementations for stable structures
impl Storable for WalletConnection {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 1024,
        is_fixed_size: false,
    };
}

impl Storable for UserData {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8192,
        is_fixed_size: false,
    };
}

impl Storable for Web3Session {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 512,
        is_fixed_size: false,
    };
}

// Server-Sent Events (SSE) Types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SseEvent {
    pub id: u64,
    pub event_type: String,
    pub data: String,
    pub timestamp: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum SseEventType {
    PeerJoined,
    PeerLeft,
    Offer,
    Answer,
    IceCandidate,
    RoomState,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PeerJoinedEvent {
    pub peer_id: String,
    pub meta: HashMap<String, String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PeerLeftEvent {
    pub peer_id: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OfferEvent {
    pub from: String,
    pub to: String,
    pub sdp: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AnswerEvent {
    pub from: String,
    pub to: String,
    pub sdp: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct IceCandidateEvent {
    pub from: String,
    pub to: String,
    pub candidate: HashMap<String, String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RoomStateEvent {
    pub peers: Vec<String>,
    pub meta: HashMap<String, String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SseConnection {
    pub connection_id: String,
    pub room_id: String,
    pub peer_id: String,
    pub last_event_id: Option<u64>,
    pub connected_at: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SseRoom {
    pub room_id: String,
    pub connections: Vec<String>, // connection IDs
    pub event_buffer: Vec<SseEvent>,
    pub max_buffer_size: usize,
    pub created_at: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SseConfig {
    pub max_connections_per_room: usize,
    pub max_buffer_size_per_room: usize,
    pub connection_timeout_ms: u64,
    pub max_event_age_ms: u64,
    pub cleanup_interval_ms: u64,
}

impl Default for SseConfig {
    fn default() -> Self {
        Self {
            max_connections_per_room: 100,
            max_buffer_size_per_room: 1000,
            connection_timeout_ms: 5 * 60 * 1000, // 5 minutes
            max_event_age_ms: 10 * 60 * 1000, // 10 minutes
            cleanup_interval_ms: 60 * 1000, // 1 minute
        }
    }
}

impl Storable for SseConnection {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 1024,
        is_fixed_size: false,
    };
}

impl Storable for SseRoom {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8192, // Large enough for event buffer
        is_fixed_size: false,
    };
}

// Stock-related types for SSE streaming
#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct StockPrice {
    pub timestamp: u64,
    pub price: f64,
    pub volume: u64,
    pub high: f64,
    pub low: f64,
    pub open: f64,
    pub close: f64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct StockMetrics {
    pub market_cap: f64,
    pub pe_ratio: f64,
    pub eps: f64,
    pub debt_equity_ratio: f64,
    pub business_growth: f64,
    pub industry_avg_pe: f64,
    pub outstanding_shares: u64,
    pub volatility: f64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct Stock {
    pub id: String,
    pub name: String,
    pub symbol: String,
    pub current_price: f64,
    pub price_history: Vec<StockPrice>, // Last week of data
    pub metrics: StockMetrics,
    pub news: Vec<String>,
    pub last_update: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct StockCache {
    pub stock_id: String,
    pub stock_data: Stock,
    pub cached_at: u64,
    pub expiry_time: u64, // Cache expires after this timestamp
    pub access_count: u32,
    pub last_access: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize, Serialize)]
pub struct StockSubscription {
    pub connection_id: String,
    pub stock_id: String,
    pub subscribed_at: u64,
    pub last_event_id: Option<String>,
}

impl Storable for StockCache {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StockSubscription {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}