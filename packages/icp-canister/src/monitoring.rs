dfx canister call dhaniverse_backend get_price_history// Removed unused import
use crate::storage;
use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::{HashMap, VecDeque};

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CanisterMetrics {
    pub total_users: usize,
    pub active_sessions: usize,
    pub total_transactions: usize,
    // staking removed
    pub total_achievements_unlocked: usize,
    pub memory_usage: MemoryMetrics,
    pub performance_metrics: PerformanceMetrics,
    pub error_metrics: ErrorMetrics,
    pub timestamp: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct MemoryMetrics {
    pub heap_size: u64,
    pub stable_memory_size: u64,
    pub instruction_count: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PerformanceMetrics {
    pub avg_response_time_ms: f64,
    pub operations_per_second: f64,
    pub cycles_per_operation: u64,
    pub peak_memory_usage: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ErrorMetrics {
    pub total_errors: usize,
    pub error_rate_percent: f64,
    pub error_breakdown: HashMap<String, usize>,
    pub recent_errors: Vec<ErrorEvent>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ErrorEvent {
    pub error_type: String,
    pub error_message: String,
    pub timestamp: u64,
    pub user_address: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PriceSnapshot {
    pub timestamp: u64,
    /// Mapping from symbol (e.g. "BTC") to price in rupees/fiat (or native unit returned by feed)
    pub prices: HashMap<String, f64>,
}

// Max entries to keep in memory = 24 hours / 10 minutes = 144
const MAX_PRICE_HISTORY_ENTRIES: usize = 24 * 60 / 10; // 144

// In-memory rolling store for price snapshots
thread_local! {
    static PRICE_HISTORY: std::cell::RefCell<VecDeque<PriceSnapshot>> = std::cell::RefCell::new(VecDeque::with_capacity(MAX_PRICE_HISTORY_ENTRIES));
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserActivityMetrics {
    pub daily_active_users: usize,
    pub weekly_active_users: usize,
    pub monthly_active_users: usize,
    pub new_users_today: usize,
    pub retention_rate: f64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct TransactionMetrics {
    pub total_volume_rupees: f64,
    pub total_volume_tokens: f64,
    pub exchange_count: usize,
    // staking counters removed
    pub average_transaction_size: f64,
    pub transaction_success_rate: f64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SystemHealth {
    pub status: HealthStatus,
    pub uptime_seconds: u64,
    pub cycles_balance: u64,
    pub memory_pressure: MemoryPressure,
    pub error_rate: f64,
    pub last_upgrade: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Critical,
    Maintenance,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum MemoryPressure {
    Low,
    Medium,
    High,
    Critical,
}

// Global metrics storage
thread_local! {
    static METRICS_STORE: std::cell::RefCell<MetricsStore> = std::cell::RefCell::new(MetricsStore::new());
}

struct MetricsStore {
    operation_count: usize,
    error_count: usize,
    total_response_time: u64,
    error_events: Vec<ErrorEvent>,
    start_time: u64,
    last_metrics_update: u64,
}

impl MetricsStore {
    fn new() -> Self {
        Self {
            operation_count: 0,
            error_count: 0,
            total_response_time: 0,
            error_events: Vec::new(),
            start_time: ic_cdk::api::time(),
            last_metrics_update: ic_cdk::api::time(),
        }
    }
}

// Public monitoring functions
pub fn get_canister_metrics() -> CanisterMetrics {
    METRICS_STORE.with(|store| {
        let store = store.borrow();
        let now = ic_cdk::api::time();
        
        CanisterMetrics {
            total_users: storage::get_users_count(),
            active_sessions: storage::get_active_sessions_count(),
            total_transactions: calculate_total_transactions(),
            // staking removed
            total_achievements_unlocked: calculate_total_achievements(),
            memory_usage: get_memory_metrics(),
            performance_metrics: get_performance_metrics(&store),
            error_metrics: get_error_metrics(&store),
            timestamp: now,
        }
    })
}

pub fn get_system_health() -> SystemHealth {
    METRICS_STORE.with(|store| {
        let store = store.borrow();
        let now = ic_cdk::api::time();
        let uptime = (now - store.start_time) / 1_000_000_000; // Convert to seconds
        
        let error_rate = if store.operation_count > 0 {
            (store.error_count as f64 / store.operation_count as f64) * 100.0
        } else {
            0.0
        };
        
        let memory_metrics = get_memory_metrics();
        let memory_pressure = calculate_memory_pressure(&memory_metrics);
        
        let status = determine_health_status(error_rate, &memory_pressure);
        
        SystemHealth {
            status,
            uptime_seconds: uptime,
            cycles_balance: get_cycles_balance(),
            memory_pressure,
            error_rate,
            last_upgrade: None, // Would need to be tracked separately
        }
    })
}

pub fn get_user_activity_metrics() -> UserActivityMetrics {
    // This would require tracking user activity over time
    // For now, return mock data based on current active users
    let active_sessions = storage::get_active_sessions_count();
    
    UserActivityMetrics {
        daily_active_users: active_sessions,
        weekly_active_users: (active_sessions as f64 * 1.5) as usize,
        monthly_active_users: (active_sessions as f64 * 3.0) as usize,
        new_users_today: active_sessions / 10,
        retention_rate: 75.0, // Mock retention rate
    }
}

pub fn get_transaction_metrics() -> TransactionMetrics {
    // Iterate user data to build metrics (lightweight estimation if large user base)
    let mut total_volume_rupees = 0.0;
    let mut total_volume_tokens = 0.0;
    let mut exchange_count = 0usize;
    let mut total_transactions = 0usize;
    let mut successful_transactions = 0usize;

    crate::storage::STATE.with(|state| {
        let state = state.borrow();
        for (_addr, user) in state.users.iter() {
            for tx in &user.transactions {
                total_transactions += 1;
                if tx.status == crate::types::TransactionStatus::Confirmed {
                    successful_transactions += 1;
                }
                match tx.transaction_type {
                    crate::types::TransactionType::Exchange => {
                        exchange_count += 1;
                        // treat amount as rupees if from is user and to None? simplified
                        total_volume_rupees += tx.amount; // approximation
                    },
                    crate::types::TransactionType::Deposit => {
                        total_volume_rupees += tx.amount;
                    },
                    crate::types::TransactionType::Withdraw => {
                        total_volume_tokens += tx.amount;
                    },
                }
            }
        }
    });

    let average_transaction_size = if total_transactions > 0 {
        (total_volume_rupees + total_volume_tokens) / total_transactions as f64
    } else { 0.0 };

    let transaction_success_rate = if total_transactions > 0 {
        (successful_transactions as f64 / total_transactions as f64) * 100.0
    } else { 100.0 };

    TransactionMetrics {
        total_volume_rupees,
        total_volume_tokens,
        exchange_count,
        average_transaction_size,
        transaction_success_rate,
    }
}

// Performance tracking functions
pub fn record_operation_start() -> u64 {
    ic_cdk::api::time()
}

pub fn record_operation_end(start_time: u64) {
    let end_time = ic_cdk::api::time();
    let duration = end_time - start_time;
    
    METRICS_STORE.with(|store| {
        let mut store = store.borrow_mut();
        store.operation_count += 1;
        store.total_response_time += duration / 1_000_000; // Convert to milliseconds
    });
}

pub fn record_error(error_type: &str, error_message: &str, user_address: Option<String>) {
    METRICS_STORE.with(|store| {
        let mut store = store.borrow_mut();
        store.error_count += 1;
        
        let error_event = ErrorEvent {
            error_type: error_type.to_string(),
            error_message: error_message.to_string(),
            timestamp: ic_cdk::api::time(),
            user_address,
        };
        
        store.error_events.push(error_event);
        
        // Keep only recent errors (last 100)
        if store.error_events.len() > 100 {
            store.error_events.remove(0);
        }
    });
}

// Helper functions
fn get_memory_metrics() -> MemoryMetrics {
    MemoryMetrics {
        heap_size: (ic_cdk::api::performance_counter(0) as u64), // Instruction counter as proxy
        stable_memory_size: (ic_cdk::api::stable::stable64_size() * 65536), // Pages to bytes
        instruction_count: ic_cdk::api::performance_counter(0) as u64,
    }
}

fn get_performance_metrics(store: &MetricsStore) -> PerformanceMetrics {
    let avg_response_time = if store.operation_count > 0 {
        store.total_response_time as f64 / store.operation_count as f64
    } else {
        0.0
    };
    
    let now = ic_cdk::api::time();
    let elapsed_seconds = (now - store.start_time) / 1_000_000_000;
    let operations_per_second = if elapsed_seconds > 0 {
        store.operation_count as f64 / elapsed_seconds as f64
    } else {
        0.0
    };
    
    PerformanceMetrics {
        avg_response_time_ms: avg_response_time,
        operations_per_second,
        cycles_per_operation: if store.operation_count > 0 {
            1000 // Estimated cycles per operation
        } else {
            0
        },
        peak_memory_usage: get_memory_metrics().heap_size,
    }
}

fn get_error_metrics(store: &MetricsStore) -> ErrorMetrics {
    let error_rate = if store.operation_count > 0 {
        (store.error_count as f64 / store.operation_count as f64) * 100.0
    } else {
        0.0
    };
    
    let mut error_breakdown = HashMap::new();
    for error in &store.error_events {
        *error_breakdown.entry(error.error_type.clone()).or_insert(0) += 1;
    }
    
    ErrorMetrics {
        total_errors: store.error_count,
        error_rate_percent: error_rate,
        error_breakdown,
        recent_errors: store.error_events.clone(),
    }
}

fn calculate_total_transactions() -> usize {
    // This would sum transactions across all users
    // For now, return estimated count
    storage::get_users_count() * 5 // Estimate 5 transactions per user
}

// staking removed

fn calculate_total_achievements() -> usize {
    // This would sum unlocked achievements across all users
    // For now, return estimated count
    storage::get_users_count() * 3 // Estimate 3 achievements per user
}

fn calculate_memory_pressure(memory_metrics: &MemoryMetrics) -> MemoryPressure {
    let stable_memory_mb = memory_metrics.stable_memory_size / (1024 * 1024);
    
    match stable_memory_mb {
        0..=100 => MemoryPressure::Low,
        101..=500 => MemoryPressure::Medium,
        501..=1000 => MemoryPressure::High,
        _ => MemoryPressure::Critical,
    }
}

fn determine_health_status(error_rate: f64, memory_pressure: &MemoryPressure) -> HealthStatus {
    if error_rate > 10.0 || *memory_pressure == MemoryPressure::Critical {
        HealthStatus::Critical
    } else if error_rate > 5.0 || *memory_pressure == MemoryPressure::High {
        HealthStatus::Warning
    } else {
        HealthStatus::Healthy
    }
}

fn get_cycles_balance() -> u64 {
    // This would get the actual cycles balance
    // For now, return a mock value
    1_000_000_000_000 // 1T cycles
}

// Optimization functions
pub fn optimize_memory() {
    // Clean up expired sessions
    storage::cleanup_expired_sessions();
    
    // Could implement other memory optimization strategies
    // such as compacting data structures, removing old data, etc.
}

pub fn get_optimization_suggestions() -> Vec<String> {
    let mut suggestions = Vec::new();
    let health = get_system_health();
    
    if health.error_rate > 5.0 {
        suggestions.push("High error rate detected. Review error logs and fix common issues.".to_string());
    }
    
    if health.memory_pressure == MemoryPressure::High {
        suggestions.push("High memory usage. Consider cleaning up old data or optimizing data structures.".to_string());
    }
    
    if health.cycles_balance < 100_000_000_000 {
        suggestions.push("Low cycles balance. Consider topping up cycles.".to_string());
    }
    
    let metrics = get_canister_metrics();
    if metrics.performance_metrics.avg_response_time_ms > 1000.0 {
        suggestions.push("High response times. Consider optimizing slow operations.".to_string());
    }
    
    if suggestions.is_empty() {
        suggestions.push("System is running optimally.".to_string());
    }
    
    suggestions
}

// Heartbeat tasks executed periodically by the canister
pub fn heartbeat_tasks() {
    // Lightweight maintenance: cleanup expired sessions and optimize memory
    crate::storage::cleanup_expired_sessions();
    crate::auth::cleanup_expired_sessions(); // Also cleanup auth-specific expired sessions
    crate::monitoring::optimize_memory();
    
    // Cleanup expired SSE connections
    crate::sse::cleanup_expired_connections();

    // Update metrics timestamp
    METRICS_STORE.with(|store| {
        store.borrow_mut().last_metrics_update = ic_cdk::api::time();
    });

    // Schedule price updates (every ~10 minutes in production)
    let now = ic_cdk::api::time();
    let last_update = METRICS_STORE.with(|store| store.borrow().last_metrics_update);
    let ten_minutes = 10 * 60 * 1_000_000_000; // 10 minutes in nanoseconds
    
    if now - last_update > ten_minutes {
        // Spawn price update task (fire and forget)
        ic_cdk::spawn(async {
            match crate::http_client::fetch_price("bitcoin,ethereum,internet-computer").await {
                Ok(prices) => {
                    // prices is a Vec<(String, f64)>; iterate by reference to avoid moving it
                    for (token_id, price) in prices.iter() {
                        let symbol = match token_id.as_str() {
                            "bitcoin" => "BTC",
                            "ethereum" => "ETH",
                            "internet-computer" => "ICP",
                            _ => token_id.as_str(),
                        };
                        crate::storage::set_price_feed(symbol, *price);
                    }
                    // Build a snapshot and push into PRICE_HISTORY
                    let mut snapshot_map: HashMap<String, f64> = HashMap::new();
                    for (token_id, price) in prices.iter() {
                        let symbol = match token_id.as_str() {
                            "bitcoin" => "BTC".to_string(),
                            "ethereum" => "ETH".to_string(),
                            "internet-computer" => "ICP".to_string(),
                            other => other.to_uppercase(),
                        };
                        snapshot_map.insert(symbol, *price);
                    }

                    let snapshot = PriceSnapshot {
                        timestamp: ic_cdk::api::time(),
                        prices: snapshot_map,
                    };

                    PRICE_HISTORY.with(|hist| {
                        let mut hist = hist.borrow_mut();
                        hist.push_back(snapshot);
                        // Enforce max capacity by popping from front
                        while hist.len() > MAX_PRICE_HISTORY_ENTRIES {
                            hist.pop_front();
                        }
                    });
                }
                Err(_) => {
                    // Silently continue on price fetch errors in heartbeat
                }
            }
        });
    }
}

/// Returns the in-memory price history (most-recent last). This clones the data to avoid holding locks.
pub fn get_price_history() -> Vec<PriceSnapshot> {
    PRICE_HISTORY.with(|hist| hist.borrow().iter().cloned().collect())
}

/// Fetch prices for token IDs (comma-separated) and append a snapshot to the in-memory history.
/// Returns the new history length on success.
pub async fn fetch_and_append_snapshot(token_ids: &str) -> Result<usize, String> {
    match crate::http_client::fetch_price(token_ids).await {
        Ok(prices) => {
            let mut snapshot_map: HashMap<String, f64> = HashMap::new();
            for (token_id, price) in prices.iter() {
                let symbol = match token_id.as_str() {
                    "bitcoin" => "BTC".to_string(),
                    "ethereum" => "ETH".to_string(),
                    "internet-computer" => "ICP".to_string(),
                    other => other.to_uppercase(),
                };
                snapshot_map.insert(symbol, *price);
            }

            let snapshot = PriceSnapshot {
                timestamp: ic_cdk::api::time(),
                prices: snapshot_map,
            };

            PRICE_HISTORY.with(|hist| {
                let mut hist = hist.borrow_mut();
                hist.push_back(snapshot);
                while hist.len() > MAX_PRICE_HISTORY_ENTRIES {
                    hist.pop_front();
                }
            });

            Ok(PRICE_HISTORY.with(|h| h.borrow().len()))
        }
        Err(e) => Err(format!("price fetch failed: {:?}", e)),
    }
}

// Macro for easy performance tracking
#[macro_export]
macro_rules! track_performance {
    ($operation:expr) => {{
        let start_time = crate::monitoring::record_operation_start();
        let result = $operation;
        crate::monitoring::record_operation_end(start_time);
        result
    }};
}

// Macro for error tracking
#[macro_export]
macro_rules! track_error {
    ($error_type:expr, $error:expr, $user:expr) => {
        crate::monitoring::record_error($error_type, &$error.to_string(), $user);
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_pressure_calculation() {
        let low_memory = MemoryMetrics {
            heap_size: 1000,
            stable_memory_size: 50 * 1024 * 1024, // 50MB
            instruction_count: 1000,
        };
        assert_eq!(calculate_memory_pressure(&low_memory), MemoryPressure::Low);
        
        let high_memory = MemoryMetrics {
            heap_size: 1000,
            stable_memory_size: 800 * 1024 * 1024, // 800MB
            instruction_count: 1000,
        };
        assert_eq!(calculate_memory_pressure(&high_memory), MemoryPressure::High);
    }

    #[test]
    fn test_health_status_determination() {
        assert_eq!(determine_health_status(2.0, &MemoryPressure::Low), HealthStatus::Healthy);
        assert_eq!(determine_health_status(7.0, &MemoryPressure::Medium), HealthStatus::Warning);
        assert_eq!(determine_health_status(15.0, &MemoryPressure::High), HealthStatus::Critical);
    }

    #[test]
    fn test_optimization_suggestions() {
        let suggestions = get_optimization_suggestions();
        assert!(!suggestions.is_empty());
    }

    #[test]
    fn test_price_history_capacity_and_append() {
        // Clear any existing history
        PRICE_HISTORY.with(|h| h.borrow_mut().clear());

        // Insert MAX_PRICE_HISTORY_ENTRIES + 5 snapshots
        for i in 0..(MAX_PRICE_HISTORY_ENTRIES + 5) {
            let mut prices = HashMap::new();
            prices.insert("BTC".to_string(), i as f64);
            let snap = PriceSnapshot { timestamp: i as u64, prices };
            PRICE_HISTORY.with(|h| h.borrow_mut().push_back(snap));
        }

        // Now history length should be MAX_PRICE_HISTORY_ENTRIES
        PRICE_HISTORY.with(|h| {
            let h = h.borrow();
            assert_eq!(h.len(), MAX_PRICE_HISTORY_ENTRIES);
            // The first element should have timestamp = 5 (popped 5)
            assert_eq!(h.front().unwrap().timestamp, 5u64);
            // Last element timestamp should be MAX_PRICE_HISTORY_ENTRIES + 4
            assert_eq!(h.back().unwrap().timestamp, (MAX_PRICE_HISTORY_ENTRIES + 4) as u64);
        });
    }
}