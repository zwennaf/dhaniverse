use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::fmt;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum CanisterError {
    // Authentication Errors
    InvalidSignature,
    SessionExpired,
    UnauthorizedAccess,
    InvalidAuthMessage,
    SignatureVerificationFailed,
    
    // Wallet Errors
    WalletNotConnected,
    InvalidWalletType,
    WalletConnectionFailed,
    InvalidWalletAddress,
    WalletAlreadyConnected,
    
    // Banking Errors
    InsufficientBalance,
    InvalidAmount,
    ExchangeRateFailed,
    InvalidCurrency,
    NegativeAmount,
    
    // Achievement Errors
    AchievementNotFound,
    AchievementNotUnlocked,
    AchievementAlreadyClaimed,
    NoRewardAvailable,
    
    // Transaction Errors
    TransactionNotFound,
    InvalidTransactionType,
    TransactionFailed,
    
    // General Errors
    UserNotFound,
    InvalidInput(String),
    InternalError(String),
    StateNotInitialized,
    SerializationError,
    DeserializationError,
}

impl fmt::Display for CanisterError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            // Authentication Errors
            CanisterError::InvalidSignature => write!(f, "Invalid signature provided"),
            CanisterError::SessionExpired => write!(f, "Session has expired, please reconnect"),
            CanisterError::UnauthorizedAccess => write!(f, "Unauthorized access to resource"),
            CanisterError::InvalidAuthMessage => write!(f, "Invalid authentication message format"),
            CanisterError::SignatureVerificationFailed => write!(f, "Failed to verify signature"),
            
            // Wallet Errors
            CanisterError::WalletNotConnected => write!(f, "No wallet connected"),
            CanisterError::InvalidWalletType => write!(f, "Unsupported wallet type"),
            CanisterError::WalletConnectionFailed => write!(f, "Failed to connect to wallet"),
            CanisterError::InvalidWalletAddress => write!(f, "Invalid wallet address format"),
            CanisterError::WalletAlreadyConnected => write!(f, "Wallet is already connected"),
            
            // Banking Errors
            CanisterError::InsufficientBalance => write!(f, "Insufficient balance for this operation"),
            CanisterError::InvalidAmount => write!(f, "Invalid amount specified"),
            CanisterError::ExchangeRateFailed => write!(f, "Failed to calculate exchange rate"),
            // staking errors removed
            CanisterError::InvalidCurrency => write!(f, "Invalid currency type"),
            CanisterError::NegativeAmount => write!(f, "Amount cannot be negative"),
            
            // Achievement Errors
            CanisterError::AchievementNotFound => write!(f, "Achievement not found"),
            CanisterError::AchievementNotUnlocked => write!(f, "Achievement has not been unlocked"),
            CanisterError::AchievementAlreadyClaimed => write!(f, "Achievement reward already claimed"),
            CanisterError::NoRewardAvailable => write!(f, "No reward available for this achievement"),
            
            // Transaction Errors
            CanisterError::TransactionNotFound => write!(f, "Transaction not found"),
            CanisterError::InvalidTransactionType => write!(f, "Invalid transaction type"),
            CanisterError::TransactionFailed => write!(f, "Transaction failed to process"),
            
            // General Errors
            CanisterError::UserNotFound => write!(f, "User not found"),
            CanisterError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            CanisterError::InternalError(msg) => write!(f, "Internal error: {}", msg),
            CanisterError::StateNotInitialized => write!(f, "Canister state not initialized"),
            CanisterError::SerializationError => write!(f, "Failed to serialize data"),
            CanisterError::DeserializationError => write!(f, "Failed to deserialize data"),
        }
    }
}

impl std::error::Error for CanisterError {}

// Helper functions for creating specific errors
impl CanisterError {
    pub fn invalid_input<T: Into<String>>(msg: T) -> Self {
        CanisterError::InvalidInput(msg.into())
    }
    
    pub fn internal_error<T: Into<String>>(msg: T) -> Self {
        CanisterError::InternalError(msg.into())
    }
    
    pub fn is_retryable(&self) -> bool {
        match self {
            // Non-retryable errors
            CanisterError::InvalidSignature |
            CanisterError::UnauthorizedAccess |
            CanisterError::InvalidAuthMessage |
            CanisterError::InvalidWalletType |
            CanisterError::InvalidWalletAddress |
            CanisterError::InvalidAmount |
            CanisterError::InvalidCurrency |
            CanisterError::NegativeAmount |
            CanisterError::AchievementNotFound |
            CanisterError::AchievementNotUnlocked |
            CanisterError::AchievementAlreadyClaimed |
            CanisterError::NoRewardAvailable |
            CanisterError::InvalidTransactionType |
            CanisterError::UserNotFound |
            CanisterError::InvalidInput(_) => false,
            
            // Potentially retryable errors
            CanisterError::SessionExpired |
            CanisterError::WalletConnectionFailed |
            CanisterError::ExchangeRateFailed |
            CanisterError::TransactionFailed |
            CanisterError::InternalError(_) |
            CanisterError::StateNotInitialized |
            CanisterError::SerializationError |
            CanisterError::DeserializationError => true,
            
            // Context-dependent errors
            CanisterError::WalletNotConnected |
            CanisterError::WalletAlreadyConnected |
            CanisterError::InsufficientBalance |
            // staking errors removed
            CanisterError::TransactionNotFound |
            CanisterError::SignatureVerificationFailed => false,
        }
    }
    
    pub fn get_error_code(&self) -> u32 {
        match self {
            // Authentication Errors (1000-1099)
            CanisterError::InvalidSignature => 1001,
            CanisterError::SessionExpired => 1002,
            CanisterError::UnauthorizedAccess => 1003,
            CanisterError::InvalidAuthMessage => 1004,
            CanisterError::SignatureVerificationFailed => 1005,
            
            // Wallet Errors (1100-1199)
            CanisterError::WalletNotConnected => 1101,
            CanisterError::InvalidWalletType => 1102,
            CanisterError::WalletConnectionFailed => 1103,
            CanisterError::InvalidWalletAddress => 1104,
            CanisterError::WalletAlreadyConnected => 1105,
            
            // Banking Errors (1200-1299)
            CanisterError::InsufficientBalance => 1201,
            CanisterError::InvalidAmount => 1202,
            CanisterError::ExchangeRateFailed => 1203,
            // Staking error codes removed (1204, 1205)
            CanisterError::InvalidCurrency => 1204,
            CanisterError::NegativeAmount => 1205,
            
            // Achievement Errors (1300-1399)
            CanisterError::AchievementNotFound => 1301,
            CanisterError::AchievementNotUnlocked => 1302,
            CanisterError::AchievementAlreadyClaimed => 1303,
            CanisterError::NoRewardAvailable => 1304,
            
            // Transaction Errors (1400-1499)
            CanisterError::TransactionNotFound => 1401,
            CanisterError::InvalidTransactionType => 1402,
            CanisterError::TransactionFailed => 1403,
            
            // General Errors (1500-1599)
            CanisterError::UserNotFound => 1501,
            CanisterError::InvalidInput(_) => 1502,
            CanisterError::InternalError(_) => 1503,
            CanisterError::StateNotInitialized => 1504,
            CanisterError::SerializationError => 1505,
            CanisterError::DeserializationError => 1506,
        }
    }
}

// Result type alias for convenience
pub type CanisterResult<T> = Result<T, CanisterError>;

// Macro for creating internal errors with context
#[macro_export]
macro_rules! internal_error {
    ($msg:expr) => {
        CanisterError::internal_error($msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        CanisterError::internal_error(format!($fmt, $($arg)*))
    };
}

// Macro for creating invalid input errors with context
#[macro_export]
macro_rules! invalid_input {
    ($msg:expr) => {
        CanisterError::invalid_input($msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        CanisterError::invalid_input(format!($fmt, $($arg)*))
    };
}