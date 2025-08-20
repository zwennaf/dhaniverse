use ic_cdk::export_candid;

mod types;
mod auth;
mod wallet;
mod banking;
mod storage;
mod utils;
mod error;
mod monitoring;

#[cfg(test)]
mod tests;

// Import modules for internal use

// Re-export types for external use
pub use types::*;
pub use error::*;

// Initialize canister state
#[ic_cdk::init]
fn init() {
    storage::init_state();
}

// Pre-upgrade hook to save state
#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    storage::save_state();
}

// Post-upgrade hook to restore state
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    storage::restore_state();
}

// Authentication Methods
#[ic_cdk::update]
async fn authenticate_with_signature(address: String, signature: String) -> Result<AuthResult, String> {
    auth::authenticate_with_signature(address, signature).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn create_session(wallet_connection: WalletConnection) -> Result<Web3Session, String> {
    auth::create_session(wallet_connection).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn clear_session(wallet_address: String) -> Result<(), String> {
    auth::clear_session(wallet_address).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_session(wallet_address: String) -> Option<Web3Session> {
    auth::get_session(wallet_address)
}

// Wallet Management Methods
#[ic_cdk::query]
fn get_available_wallets() -> Vec<WalletInfo> {
    wallet::get_available_wallets()
}

#[ic_cdk::update]
async fn connect_wallet(wallet_type: WalletType, address: String, chain_id: String) -> Result<WalletConnection, String> {
    wallet::connect_wallet(wallet_type, address, chain_id).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn disconnect_wallet(address: String) -> Result<(), String> {
    wallet::disconnect_wallet(address).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_wallet_status(address: String) -> Option<WalletConnection> {
    wallet::get_wallet_status(address)
}

// Banking Methods
#[ic_cdk::query]
fn get_dual_balance(wallet_address: String) -> Result<DualBalance, String> {
    banking::get_dual_balance(wallet_address)
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn exchange_currency(
    wallet_address: String,
    from_currency: String,
    to_currency: String,
    amount: f64,
) -> Result<ExchangeResult, String> {
    banking::exchange_currency(wallet_address, from_currency, to_currency, amount).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn stake_tokens(
    wallet_address: String,
    amount: f64,
    duration: u32,
) -> Result<StakingPool, String> {
    banking::stake_tokens(wallet_address, amount, duration).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_staking_info(wallet_address: String) -> Vec<StakingPool> {
    banking::get_staking_info(wallet_address)
}

#[ic_cdk::update]
async fn claim_staking_rewards(wallet_address: String, staking_id: String) -> Result<f64, String> {
    banking::claim_staking_rewards(wallet_address, staking_id).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_achievements(wallet_address: String) -> Vec<Achievement> {
    banking::get_achievements(wallet_address)
}

#[ic_cdk::update]
async fn claim_achievement_reward(wallet_address: String, achievement_id: String) -> Result<AchievementReward, String> {
    banking::claim_achievement_reward(wallet_address, achievement_id).await
        .map_err(|e| e.to_string())
}

// DeFi Simulation Methods
#[ic_cdk::update]
async fn simulate_liquidity_pool(wallet_address: String, amount: f64) -> Result<f64, String> {
    banking::simulate_liquidity_pool(wallet_address, amount).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn simulate_yield_farming(wallet_address: String, amount: f64) -> Result<f64, String> {
    banking::simulate_yield_farming(wallet_address, amount).await
        .map_err(|e| e.to_string())
}

// Transaction Methods
#[ic_cdk::update]
async fn create_transaction(
    wallet_address: String,
    transaction_type: TransactionType,
    amount: f64,
    to: Option<String>,
) -> Result<Web3Transaction, String> {
    banking::create_transaction(wallet_address, transaction_type, amount, to).await
        .map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_transaction_history(wallet_address: String) -> Vec<Web3Transaction> {
    banking::get_transaction_history(wallet_address)
}

// Monitoring and Performance Methods
#[ic_cdk::query]
fn get_canister_metrics() -> monitoring::CanisterMetrics {
    monitoring::get_canister_metrics()
}

#[ic_cdk::query]
fn get_system_health() -> monitoring::SystemHealth {
    monitoring::get_system_health()
}

#[ic_cdk::query]
fn get_user_activity_metrics() -> monitoring::UserActivityMetrics {
    monitoring::get_user_activity_metrics()
}

#[ic_cdk::query]
fn get_transaction_metrics() -> monitoring::TransactionMetrics {
    monitoring::get_transaction_metrics()
}

#[ic_cdk::update]
async fn optimize_memory() -> Result<(), String> {
    monitoring::optimize_memory();
    Ok(())
}

#[ic_cdk::query]
fn get_optimization_suggestions() -> Vec<String> {
    monitoring::get_optimization_suggestions()
}

// Health check method
#[ic_cdk::query]
fn health_check() -> String {
    "Dhaniverse Rust ICP Canister is running".to_string()
}

// Export Candid interface
export_candid!();