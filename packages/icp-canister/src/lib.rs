use ic_cdk::export_candid;
use ic_cdk::api::management_canister::http_request::{HttpResponse, TransformArgs};
use std::collections::HashMap;

mod types;
mod auth;
mod wallet;
mod banking;
mod storage;
mod utils;
mod error;
mod monitoring;
mod http_client;
mod price_feed;
mod sse;

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
    let start_time = monitoring::record_operation_start();
    let result = banking::get_dual_balance(wallet_address.clone())
        .map_err(|e| {
            monitoring::record_error("banking", &e.to_string(), Some(wallet_address.clone()));
            e.to_string()
        });
    monitoring::record_operation_end(start_time);
    result
}

#[ic_cdk::update]
async fn exchange_currency(
    wallet_address: String,
    from_currency: String,
    to_currency: String,
    amount: f64,
) -> Result<ExchangeResult, String> {
    let start_time = monitoring::record_operation_start();
    let result = banking::exchange_currency(wallet_address.clone(), from_currency, to_currency, amount).await
        .map_err(|e| {
            monitoring::record_error("exchange", &e.to_string(), Some(wallet_address));
            e.to_string()
        });
    monitoring::record_operation_end(start_time);
    result
}

// Staking entry points removed

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
    let start_time = monitoring::record_operation_start();
    let result = banking::create_transaction(wallet_address.clone(), transaction_type, amount, to).await
        .map_err(|e| {
            monitoring::record_error("transaction", &e.to_string(), Some(wallet_address));
            e.to_string()
        });
    monitoring::record_operation_end(start_time);
    result
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

// Heartbeat entry point for periodic maintenance
#[ic_cdk::heartbeat]
fn heartbeat() {
    // Run monitoring/maintenance tasks periodically
    monitoring::heartbeat_tasks();
}

// Price feed API
#[ic_cdk::update]
async fn submit_price_feed(symbol: String, price_usd: f64) -> Result<(), String> {
    let start_time = monitoring::record_operation_start();
    let result = price_feed::submit_price(symbol, price_usd).await.map_err(|e| e.to_string());
    monitoring::record_operation_end(start_time);
    result
}

#[ic_cdk::query]
fn get_price_feed(symbol: String) -> Option<f64> {
    price_feed::get_price(symbol)
}

#[ic_cdk::query]
fn get_all_price_feeds() -> Vec<(String, f64)> {
    price_feed::get_all_prices()
}

// Administrative and utility endpoints
#[ic_cdk::update]
async fn cleanup_sessions() -> Result<usize, String> {
    let before_count = storage::get_active_sessions_count();
    auth::cleanup_expired_sessions();
    let after_count = storage::get_active_sessions_count();
    Ok(before_count - after_count)
}

#[ic_cdk::query]
fn get_auth_statistics() -> (usize, usize) {
    auth::get_auth_stats()
}

#[ic_cdk::query]
fn get_wallet_statistics() -> wallet::WalletStats {
    wallet::get_wallet_stats()
}

#[ic_cdk::query]
fn get_supported_chains(wallet_type: WalletType) -> Vec<String> {
    wallet::get_supported_chains(&wallet_type)
}

#[ic_cdk::query]
fn validate_wallet_connection(address: String) -> Result<WalletConnection, String> {
    wallet::validate_wallet_connection(&address).map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn update_wallet_balance(address: String) -> Result<String, String> {
    wallet::update_wallet_balance(address).await.map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_wallet_balance(address: String) -> Result<Option<String>, String> {
    wallet::get_wallet_balance(&address).map_err(|e| e.to_string())
}

#[ic_cdk::update]
async fn switch_wallet_chain(address: String, new_chain_id: String) -> Result<WalletConnection, String> {
    wallet::switch_wallet_chain(address, new_chain_id).await.map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn get_network_info(chain_id: String) -> Option<wallet::NetworkInfo> {
    wallet::get_network_info(&chain_id)
}

#[ic_cdk::query]
fn verify_session_token(wallet_address: String, token: String) -> Result<bool, String> {
    auth::verify_session_token(&wallet_address, &token).map(|_| true).map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn format_currency_balance(balance: f64) -> String {
    utils::format_balance(balance)
}

#[ic_cdk::query]
fn get_global_settings() -> GlobalSettings {
    storage::get_global_settings()
}

#[ic_cdk::query]
fn get_formatted_balance(wallet_address: String) -> Result<String, String> {
    let balance = banking::get_dual_balance(wallet_address).map_err(|e| e.to_string())?;
    let formatted = format!(
        "Rupees: {} | Tokens: {}", 
        utils::format_balance(balance.rupees_balance),
        utils::format_balance(balance.token_balance)
    );
    Ok(formatted)
}

#[ic_cdk::update]
async fn validate_transaction_signature(
    address: String,
    transaction_data: String,
    signature: String,
) -> Result<bool, String> {
    wallet::validate_transaction_signature(&address, &transaction_data, &signature)
        .map(|_| true)
        .map_err(|e| e.to_string())
}

// Utility endpoints for time conversion
#[ic_cdk::query]
fn convert_nanos_to_millis(nanos: u64) -> u64 {
    utils::nanos_to_millis(nanos)
}

#[ic_cdk::query]
fn convert_millis_to_nanos(millis: u64) -> u64 {
    utils::millis_to_nanos(millis)
}

#[ic_cdk::query]
fn get_current_time_formatted() -> String {
    let now_nanos = ic_cdk::api::time();
    let now_millis = utils::nanos_to_millis(now_nanos);
    format!("Current time: {} ns ({} ms)", now_nanos, now_millis)
}

// Future HTTP price fetching (now with real implementation)
#[ic_cdk::update]
async fn fetch_external_price(symbol: String) -> Result<Option<f64>, String> {
    let prices = http_client::fetch_price(&symbol).await?;
    Ok(prices.into_iter().find(|(s, _)| s == &symbol).map(|(_, p)| p))
}

#[ic_cdk::update]
async fn fetch_multiple_crypto_prices(token_ids: String) -> Result<Vec<(String, f64)>, String> {
    http_client::fetch_price(&token_ids).await
}

#[ic_cdk::update]
async fn fetch_stock_price(symbol: String) -> Result<Option<f64>, String> {
    let prices = http_client::fetch_stock_prices(&symbol).await?;
    Ok(prices.into_iter().find(|(s, _)| s == &symbol).map(|(_, p)| p))
}

#[ic_cdk::update]
async fn update_prices_from_external() -> Result<usize, String> {
    // Fetch major crypto prices
    let crypto_ids = "bitcoin,ethereum,internet-computer,chainlink,uniswap";
    let crypto_prices = http_client::fetch_price(crypto_ids).await?;
    
    let mut updated_count = 0;
    for (token_id, price) in crypto_prices {
        // Map CoinGecko IDs to our token symbols
        let symbol = match token_id.as_str() {
            "bitcoin" => "BTC",
            "ethereum" => "ETH", 
            "internet-computer" => "ICP",
            "chainlink" => "LINK",
            "uniswap" => "UNI",
            _ => &token_id,
        };
        
        storage::set_price_feed(symbol, price);
        updated_count += 1;
    }
    
    Ok(updated_count)
}

// Test endpoint - bypasses session validation
#[ic_cdk::query]
fn get_balance_no_auth(wallet_address: String) -> Result<DualBalance, String> {
    let user_data = storage::get_or_create_user_data(&wallet_address);
    Ok(user_data.dual_balance)
}

// SSE HTTP endpoint handler
#[ic_cdk::query]
fn http_request(req: ic_http_certification::HttpRequest) -> HttpResponse {
    use ic_cdk::api::management_canister::http_request::HttpHeader;
    use url::Url;
    
    // Parse the request URL
    let url_str = &req.url;
    let parsed_url = match Url::parse(&format!("http://dummy.com{}", url_str)) {
        Ok(url) => url,
        Err(_) => {
            return HttpResponse {
                status: 400u16.into(),
                headers: vec![],
                body: b"Invalid URL".to_vec(),
            };
        }
    };
    
    let path = parsed_url.path();
    
    // Parse query parameters
    let query_params: HashMap<String, String> = parsed_url
        .query_pairs()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    
    // Check if this is an SSE endpoint
    if path.starts_with("/sse/rooms/") && path.ends_with("/subscribe") {
        // Extract room ID from path
        let parts: Vec<&str> = path.split('/').collect();
        if parts.len() != 5 {
            return HttpResponse {
                status: 400u16.into(),
                headers: vec![],
                body: b"Invalid SSE endpoint path".to_vec(),
            };
        }
        
        let room_id = parts[3];
        
        // Handle SSE subscription
        return handle_sse_subscription(req, room_id, query_params);
    }
    
    // Default 404 response
    HttpResponse {
        status: 404u16.into(),
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "text/plain".to_string(),
            }
        ],
        body: b"Not Found".to_vec(),
    }
}

fn handle_sse_subscription(
    req: ic_http_certification::HttpRequest,
    room_id: &str,
    query_params: HashMap<String, String>
) -> HttpResponse {
    use ic_cdk::api::management_canister::http_request::HttpHeader;
    
    // Extract authentication token from headers or query params
    let auth_token = extract_auth_token(&req, &query_params);
    
    // Extract Last-Event-ID from headers
    let last_event_id = extract_last_event_id(&req);
    
    // Authenticate the request
    let peer_id = match authenticate_sse_request(&auth_token, room_id) {
        Ok(id) => id,
        Err(err) => {
            return HttpResponse {
                status: 401u16.into(),
                headers: vec![
                    HttpHeader {
                        name: "Content-Type".to_string(),
                        value: "text/plain".to_string(),
                    }
                ],
                body: format!("Unauthorized: {}", err).as_bytes().to_vec(),
            };
        }
    };
    
    // Generate a unique connection ID
    let connection_id = format!("sse-{}-{}", ic_cdk::api::time(), room_id);
    
    // Add connection to room
    if let Err(err) = sse::add_connection_to_room(room_id, &connection_id, &peer_id, last_event_id) {
        return HttpResponse {
            status: 500u16.into(),
            headers: vec![
                HttpHeader {
                    name: "Content-Type".to_string(),
                    value: "text/plain".to_string(),
                }
            ],
            body: format!("Failed to create SSE connection: {}", err).as_bytes().to_vec(),
        };
    }
    
    // Get events since last_event_id
    let events = match sse::get_events_since(room_id, last_event_id) {
        Ok(events) => events,
        Err(_) => Vec::new(),
    };
    
    // Format events for SSE
    let mut response_body = String::new();
    
    // Send initial connection event
    response_body.push_str(&format!(
        "id: {}\nevent: connected\ndata: {{\"connectionId\": \"{}\", \"roomId\": \"{}\"}}\n\n",
        ic_cdk::api::time() / 1_000_000, // Convert to milliseconds
        connection_id,
        room_id
    ));
    
    // Send buffered events
    for event in events {
        response_body.push_str(&sse::format_sse_event(&event));
    }
    
    // Send current room state
    if let Ok((connection_count, _)) = sse::get_room_stats(room_id) {
        let room_state_data = sse::create_room_state_event(
            vec![], // We'd need to implement peer listing
            [("connectionCount".to_string(), connection_count.to_string())].iter().cloned().collect()
        );
        
        response_body.push_str(&format!(
            "id: {}\nevent: room-state\ndata: {}\n\n",
            ic_cdk::api::time() / 1_000_000,
            room_state_data
        ));
    }
    
    HttpResponse {
        status: 200u16.into(),
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "text/event-stream".to_string(),
            },
            HttpHeader {
                name: "Cache-Control".to_string(),
                value: "no-cache".to_string(),
            },
            HttpHeader {
                name: "Connection".to_string(),
                value: "keep-alive".to_string(),
            },
            HttpHeader {
                name: "Access-Control-Allow-Origin".to_string(),
                value: "*".to_string(),
            },
        ],
        body: response_body.as_bytes().to_vec(),
    }
}

fn extract_auth_token(
    req: &ic_http_certification::HttpRequest,
    query_params: &HashMap<String, String>
) -> Option<String> {
    // First check Authorization header
    for (name, value) in &req.headers {
        if name.to_lowercase() == "authorization" {
            if value.starts_with("Bearer ") {
                return Some(value[7..].to_string());
            }
        }
    }
    
    // Then check query parameter
    query_params.get("token").cloned()
}

fn extract_last_event_id(
    req: &ic_http_certification::HttpRequest
) -> Option<u64> {
    for (name, value) in &req.headers {
        if name.to_lowercase() == "last-event-id" {
            return value.parse().ok();
        }
    }
    None
}

fn authenticate_sse_request(auth_token: &Option<String>, _room_id: &str) -> Result<String, String> {
    let token = auth_token.as_ref().ok_or("Missing authentication token")?;
    
    if token.is_empty() {
        return Err("Empty authentication token".to_string());
    }
    
    // Try to decode a simple token format: wallet_address:session_token
    let parts: Vec<&str> = token.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid token format. Expected 'wallet_address:session_token'".to_string());
    }
    
    let wallet_address = parts[0];
    let session_token = parts[1];
    
    // Validate the session using existing auth system
    if let Err(e) = auth::verify_session_token(wallet_address, session_token) {
        return Err(format!("Session validation failed: {}", e));
    }
    
    // Check if the user has access to this room
    // For now, we'll allow any authenticated user to access any room
    // In a real implementation, you'd check room permissions here
    
    // Generate peer ID from wallet address
    let peer_id = format!("peer-{}", &wallet_address[2..10]); // Use part of wallet address
    
    Ok(peer_id)
}

// SSE management endpoints
#[ic_cdk::update]
async fn sse_broadcast_peer_joined(room_id: String, peer_id: String, meta: std::collections::HashMap<String, String>) -> Result<usize, String> {
    let data = sse::create_peer_joined_event(&peer_id, meta);
    let connections = sse::broadcast_event(&room_id, SseEventType::PeerJoined, data)
        .map_err(|e| e.to_string())?;
    Ok(connections.len())
}

#[ic_cdk::update]
async fn sse_broadcast_peer_left(room_id: String, peer_id: String) -> Result<usize, String> {
    let data = sse::create_peer_left_event(&peer_id);
    let connections = sse::broadcast_event(&room_id, SseEventType::PeerLeft, data)
        .map_err(|e| e.to_string())?;
    Ok(connections.len())
}

#[ic_cdk::update]
async fn sse_broadcast_offer(room_id: String, from: String, to: String, sdp: String) -> Result<usize, String> {
    let data = sse::create_offer_event(&from, &to, &sdp);
    let connections = sse::broadcast_event(&room_id, SseEventType::Offer, data)
        .map_err(|e| e.to_string())?;
    Ok(connections.len())
}

#[ic_cdk::update]
async fn sse_broadcast_answer(room_id: String, from: String, to: String, sdp: String) -> Result<usize, String> {
    let data = sse::create_answer_event(&from, &to, &sdp);
    let connections = sse::broadcast_event(&room_id, SseEventType::Answer, data)
        .map_err(|e| e.to_string())?;
    Ok(connections.len())
}

#[ic_cdk::update]
async fn sse_broadcast_ice_candidate(room_id: String, from: String, to: String, candidate: std::collections::HashMap<String, String>) -> Result<usize, String> {
    let data = sse::create_ice_candidate_event(&from, &to, candidate);
    let connections = sse::broadcast_event(&room_id, SseEventType::IceCandidate, data)
        .map_err(|e| e.to_string())?;
    Ok(connections.len())
}

#[ic_cdk::query]
fn sse_get_room_stats(room_id: String) -> Result<(usize, usize), String> {
    sse::get_room_stats(&room_id).map_err(|e| e.to_string())
}

#[ic_cdk::query]
fn sse_get_global_stats() -> (usize, usize, usize) {
    sse::get_global_stats()
}

#[ic_cdk::update]
async fn sse_cleanup_connections() -> Result<usize, String> {
    Ok(sse::cleanup_expired_connections())
}

// Export Candid interface (placed at end so all above methods are included)
export_candid!();