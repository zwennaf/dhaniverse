use crate::types::*;
use crate::storage;
use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CanisterMetrics {
    pub total_users: usize,
    pub active_sessions: usize,
    pub total_transactions: usize,
    pub total_staking_pools: usize,
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
    pub staking_count: usize,
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
            total_staking_pools: calculate_total_staking_pools(),
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
    // Calculate from all user transactions
    let mut total_volume_rupees = 0.0;
    let mut total_volume_tokens = 0.0;
    let mut exchange_count = 0;
    let mut staking_count = 0;
    let mut total_transactions = 0;
    let mut successful_transactions = 0;
    
    // This would iterate through all users in a real implementation
    // For now, return estimated metrics
    
    TransactionMetrics {
        total_volume_rupees,
        total_volume_tokens,
        exchange_count,
        staking_count,
        average_transaction_size: if total_transactions > 0 {
            (total_volume_rupees + total_volume_tokens) / total_transactions as f64
        } else {
            0.0
        },
        transaction_success_rate: if total_transactions > 0 {
            (successful_transactions as f64 / total_transactions as f64) * 100.0
        } else {
            100.0
        },
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

fn calculate_total_staking_pools() -> usize {
    // This would sum staking pools across all users
    // For now, return estimated count
    storage::get_users_count() * 2 // Estimate 2 staking pools per user
}

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
}