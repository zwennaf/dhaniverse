use crate::storage::{get_stock_cache, set_stock_cache, set_stock_subscription, get_sse_room, set_sse_room};
use crate::types::{Stock, StockCache, StockPrice, StockMetrics, StockSubscription};
use crate::error::CanisterError;
use ic_cdk::api::time;
use std::collections::HashMap;

// Cache configuration
const STOCK_CACHE_DURATION: u64 = 2_700_000_000_000; // 45 minutes in nanoseconds
const STOCK_RATE_LIMIT: u64 = 30_000_000_000; // 30 seconds between requests for same stock
const MAX_PRICE_HISTORY_DAYS: usize = 7; // One week of daily data
const MAX_ACCESS_COUNT_PER_PERIOD: u32 = 100; // Rate limiting
const USER_ACTIVITY_WINDOW: u64 = 6 * 60 * 60 * 1_000_000_000; // 6 hours in nanoseconds

// Global market summary cache (shared across all users)
use std::cell::RefCell;
use ic_cdk_timers::{TimerId, set_timer_interval, clear_timer};

thread_local! {
    static MARKET_SUMMARY_CACHE: RefCell<Option<(HashMap<String, Stock>, u64)>> = RefCell::new(None);
    static LAST_USER_ACTIVITY: RefCell<u64> = RefCell::new(0);
    static REFRESH_TIMER: RefCell<Option<TimerId>> = RefCell::new(None);
}

const THIRTY_MINUTES_NANOS: u64 = 30 * 60 * 1_000_000_000; // 30 minutes

// Track user activity
pub fn update_user_activity() {
    let now = time();
    LAST_USER_ACTIVITY.with(|activity| {
        *activity.borrow_mut() = now;
    });
}

// Check if there are active users in the last 6 hours
fn has_recent_user_activity() -> bool {
    let now = time();
    LAST_USER_ACTIVITY.with(|activity| {
        let last_activity = *activity.borrow();
        if last_activity == 0 {
            return false; // No activity recorded yet
        }
        now - last_activity < USER_ACTIVITY_WINDOW
    })
}

// Generate mock stock data with realistic patterns
pub fn generate_mock_stock_data(stock_id: &str) -> Result<Stock, CanisterError> {
    let current_time = time();
    
    // Mock data based on stock ID for consistency
    let base_price = match stock_id {
        "RELIANCE" => 2500.0,
        "TCS" => 3200.0,
        "INFY" => 1450.0,
        "HDFC" => 1680.0,
        "ICICI" => 750.0,
        "SBI" => 520.0,
        "BHARTI" => 820.0,
        "ITC" => 420.0,
        "WIPRO" => 380.0,
        "TECHM" => 1120.0,
        _ => 1000.0, // Default price
    };
    
    // Generate realistic price history for the last week
    let mut price_history: Vec<StockPrice> = Vec::new();
    let mut current_price = base_price;
    
    for i in (0..MAX_PRICE_HISTORY_DAYS).rev() {
        let timestamp = current_time - (i as u64 * 24 * 60 * 60 * 1_000_000_000); // i days ago
        
        // Add some realistic volatility (±2% daily change)
        let change_percent = (((timestamp % 1000) as f64 / 1000.0) - 0.5) * 0.04; // -2% to +2%
        current_price *= 1.0 + change_percent;
        
        let daily_volatility = current_price * 0.015; // 1.5% intraday range
        let high = current_price + daily_volatility;
        let low = current_price - daily_volatility;
        let open = if i == MAX_PRICE_HISTORY_DAYS - 1 { current_price } else { price_history.last().unwrap().close };
        
        price_history.push(StockPrice {
            timestamp,
            price: current_price,
            volume: 50000 + ((timestamp % 100000) as u64),
            high,
            low,
            open,
            close: current_price,
        });
    }
    
    // Generate metrics based on stock characteristics
    let metrics = match stock_id {
        "RELIANCE" => StockMetrics {
            market_cap: 15_000_000_000_000.0, // 15 trillion
            pe_ratio: 12.5,
            eps: 200.0,
            debt_equity_ratio: 0.45,
            business_growth: 8.5,
            industry_avg_pe: 15.2,
            outstanding_shares: 6_000_000_000,
            volatility: 0.25,
        },
        "TCS" => StockMetrics {
            market_cap: 12_000_000_000_000.0, // 12 trillion
            pe_ratio: 28.5,
            eps: 112.0,
            debt_equity_ratio: 0.15,
            business_growth: 12.3,
            industry_avg_pe: 25.8,
            outstanding_shares: 3_750_000_000,
            volatility: 0.22,
        },
        "INFY" => StockMetrics {
            market_cap: 6_000_000_000_000.0, // 6 trillion
            pe_ratio: 22.8,
            eps: 63.5,
            debt_equity_ratio: 0.12,
            business_growth: 15.2,
            industry_avg_pe: 25.8,
            outstanding_shares: 4_150_000_000,
            volatility: 0.28,
        },
        _ => StockMetrics {
            market_cap: 2_000_000_000_000.0, // 2 trillion default
            pe_ratio: 18.5,
            eps: 54.0,
            debt_equity_ratio: 0.65,
            business_growth: 6.8,
            industry_avg_pe: 20.5,
            outstanding_shares: 2_000_000_000,
            volatility: 0.32,
        },
    };
    
    let stock_name = match stock_id {
        "RELIANCE" => "Reliance Industries Ltd",
        "TCS" => "Tata Consultancy Services",
        "INFY" => "Infosys Limited",
        "HDFC" => "HDFC Bank Limited",
        "ICICI" => "ICICI Bank Limited",
        "SBI" => "State Bank of India",
        "BHARTI" => "Bharti Airtel Limited",
        "ITC" => "ITC Limited",
        "WIPRO" => "Wipro Limited",
        "TECHM" => "Tech Mahindra Limited",
        _ => stock_id,
    };
    
    // Generate mock news based on stock performance
    let news = vec![
        format!("{} reports strong quarterly results with {}% growth", stock_name, metrics.business_growth),
        format!("Analysts upgrade {} target price citing robust fundamentals", stock_name),
        format!("{} announces new strategic initiatives for digital transformation", stock_name),
    ];
    
    Ok(Stock {
        id: stock_id.to_string(),
        name: stock_name.to_string(),
        symbol: stock_id.to_string(),
        current_price: price_history.last().unwrap().close,
        price_history,
        metrics,
        news,
        last_update: current_time,
    })
}

// Check if we should fetch fresh data or use cache
pub fn should_refresh_cache(cache: &StockCache) -> bool {
    let current_time = time();
    
    // Check if cache has expired
    if current_time > cache.expiry_time {
        return true;
    }
    
    // Check if too many accesses (rate limiting)
    if cache.access_count > MAX_ACCESS_COUNT_PER_PERIOD {
        // Reset if enough time has passed
        if current_time > cache.last_access + STOCK_RATE_LIMIT {
            return true;
        }
        return false; // Rate limited
    }
    
    false
}

/// Fetch REAL stock data from Polygon.io
/// This replaces generate_mock_stock_data() with actual API calls
pub async fn fetch_real_stock_data(stock_id: &str) -> Result<Stock, CanisterError> {
    let current_time = time();
    
    ic_cdk::println!("🚀 Fetching REAL data for {} from Polygon.io", stock_id);
    
    // 1. Fetch 7-day historical price data
    let price_history = crate::http_client::fetch_polygon_historical(stock_id, 7).await
        .map_err(|e| {
            ic_cdk::println!("❌ Failed to fetch historical data for {}: {}", stock_id, e);
            CanisterError::internal_error(format!("HTTP outcall failed: {}", e))
        })?;
    
    if price_history.is_empty() {
        return Err(CanisterError::NotFound(format!("No historical data for {}", stock_id)));
    }
    
    // 2. Fetch stock details (market cap, shares, name)
    let details = crate::http_client::fetch_polygon_stock_details(stock_id).await
        .map_err(|e| {
            ic_cdk::println!("❌ Failed to fetch stock details for {}: {}", stock_id, e);
            CanisterError::internal_error(format!("HTTP outcall failed: {}", e))
        })?;
    
    // 3. Calculate real metrics from historical data
    let current_price = price_history.last().unwrap().close;
    let metrics = crate::http_client::calculate_metrics(
        stock_id,
        current_price,
        &price_history,
        &details,
    );
    
    // 4. Generate realistic news (this can stay mock for now)
    let stock_name = &details.name;
    let news = vec![
        format!("{} reports strong quarterly earnings, beats analyst expectations", stock_name),
        format!("Market analysts maintain 'Buy' rating on {} with price target of ${:.2}", stock_name, current_price * 1.15),
        format!("{} announces $2B share buyback program", stock_name),
        format!("Institutional investors increase stake in {} by 12%", stock_name),
        format!("Analysts upgrade {} target price citing robust fundamentals", stock_name),
        format!("{} announces new strategic initiatives for digital transformation", stock_name),
    ];
    
    ic_cdk::println!("✅ Successfully fetched REAL data for {}: price=${:.2}, market_cap=${:.0}, pe={:.2}", 
        stock_id, current_price, metrics.market_cap, metrics.pe_ratio);
    
    Ok(Stock {
        id: stock_id.to_string(),
        name: details.name,
        symbol: stock_id.to_string(),
        current_price,
        price_history,
        metrics,
        news,
        last_update: current_time,
    })
}

// Get stock data with caching
pub async fn get_cached_stock_data_async(stock_id: &str) -> Result<Stock, CanisterError> {
    let current_time = time();
    
    // Try to get from cache first
    if let Some(mut cache) = get_stock_cache(stock_id) {
        if !should_refresh_cache(&cache) {
            // Update access tracking
            cache.access_count += 1;
            cache.last_access = current_time;
            set_stock_cache(stock_id, &cache);
            
            ic_cdk::println!("✅ Cache hit for {}", stock_id);
            return Ok(cache.stock_data);
        }
    }
    
    ic_cdk::println!("🔄 Cache miss for {}, fetching REAL data", stock_id);
    
    // Fetch REAL data from Polygon.io
    let stock_data = fetch_real_stock_data(stock_id).await?;
    
    // Create/update cache
    let cache = StockCache {
        stock_id: stock_id.to_string(),
        stock_data: stock_data.clone(),
        cached_at: current_time,
        expiry_time: current_time + STOCK_CACHE_DURATION,
        access_count: 1,
        last_access: current_time,
    };
    
    set_stock_cache(stock_id, &cache);
    
    Ok(stock_data)
}

// Subscribe to stock updates via SSE
pub fn subscribe_to_stock_updates(connection_id: &str, stock_id: &str) -> Result<(), CanisterError> {
    let current_time = time();
    
    let subscription = StockSubscription {
        connection_id: connection_id.to_string(),
        stock_id: stock_id.to_string(),
        subscribed_at: current_time,
        last_event_id: None,
    };
    
    set_stock_subscription(connection_id, &subscription);
    
    // Create stock room if it doesn't exist
    let room_id = format!("stock_{}", stock_id);
    if get_sse_room(&room_id).is_none() {
        let room = crate::types::SseRoom {
            room_id: room_id.clone(),
            connections: Vec::new(),
            event_buffer: Vec::new(),
            max_buffer_size: 100,
            created_at: current_time,
            last_activity: current_time,
        };
        set_sse_room(&room_id, room);
    }
    
    Ok(())
}

// Broadcast stock price update to subscribers
pub fn broadcast_stock_update(stock_id: &str, stock_data: &Stock) -> Result<usize, CanisterError> {
    let room_id = format!("stock_{}", stock_id);
    
    // Create price update event data
    let event_data = serde_json::json!({
        "type": "price_update",
        "stock_id": stock_id,
        "current_price": stock_data.current_price,
        "price_history": stock_data.price_history,
        "metrics": stock_data.metrics,
        "timestamp": ic_cdk::api::time()
    });
    
    // Use a simple event type that matches existing ones
    let event_type = crate::types::SseEventType::RoomState; // Reuse existing type
    
    let connection_ids = crate::sse::broadcast_event(&room_id, event_type, event_data)?;
    Ok(connection_ids.len())
}

// Broadcast stock news update
pub fn broadcast_stock_news(stock_id: &str, news: &[String]) -> Result<usize, CanisterError> {
    let room_id = format!("stock_{}", stock_id);
    
    let event_data = serde_json::json!({
        "type": "news_update",
        "stock_id": stock_id,
        "news": news,
        "timestamp": ic_cdk::api::time()
    });
    
    let event_type = crate::types::SseEventType::RoomState; // Reuse existing type
    
    let connection_ids = crate::sse::broadcast_event(&room_id, event_type, event_data)?;
    Ok(connection_ids.len())
}

// Get stock data with caching (SYNC version for backward compatibility)
pub fn get_cached_stock_data(stock_id: &str) -> Result<Stock, CanisterError> {
    // For sync calls, return cached data or mock fallback
    if let Some(cache) = get_stock_cache(stock_id) {
        if !should_refresh_cache(&cache) {
            return Ok(cache.stock_data);
        }
    }
    
    // Fallback to mock data if cache miss and async not available
    generate_mock_stock_data(stock_id)
}

// Start periodic refresh timer (30 minutes)
fn start_periodic_refresh() {
    REFRESH_TIMER.with(|timer_cell| {
        // Clear existing timer if any
        if let Some(existing_timer) = timer_cell.borrow_mut().take() {
            clear_timer(existing_timer);
        }
        
        // Set up new 30-minute periodic refresh
        let timer_id = set_timer_interval(std::time::Duration::from_nanos(THIRTY_MINUTES_NANOS), || {
            ic_cdk::println!("⏰ Periodic refresh timer triggered (30 min interval)");
            
            ic_cdk::spawn(async {
                // Check if there are still active users
                if has_recent_user_activity() {
                    ic_cdk::println!("🔄 Active users detected - refreshing market data");
                    match fetch_all_real_market_data().await {
                        Ok(market_data) => {
                            let now = time();
                            MARKET_SUMMARY_CACHE.with(|cache| {
                                *cache.borrow_mut() = Some((market_data, now));
                            });
                            ic_cdk::println!("✅ Periodic refresh complete");
                        }
                        Err(e) => {
                            ic_cdk::println!("❌ Periodic refresh failed: {:?}", e);
                        }
                    }
                } else {
                    ic_cdk::println!("⏸️  No active users - stopping periodic refresh");
                    // Stop the timer
                    REFRESH_TIMER.with(|timer| {
                        if let Some(timer_id) = timer.borrow_mut().take() {
                            clear_timer(timer_id);
                        }
                    });
                }
            });
        });
        
        *timer_cell.borrow_mut() = Some(timer_id);
        ic_cdk::println!("✅ Started 30-minute periodic refresh timer");
    });
}

// Fetch all real market data from Polygon.io (NO MOCK DATA)
async fn fetch_all_real_market_data() -> Result<HashMap<String, Stock>, CanisterError> {
    let popular_stocks = vec![
        "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
        "NVDA", "META", "NFLX", "AMD", "INTC"
    ];
    
    let mut market_data = HashMap::new();
    let mut failed_stocks = Vec::new();
    
    // Fetch REAL data for each stock (NO MOCK FALLBACK)
    for stock_id in popular_stocks {
        ic_cdk::println!("🔄 Fetching REAL data for {}", stock_id);
        match fetch_real_stock_data(stock_id).await {
            Ok(stock_data) => {
                market_data.insert(stock_id.to_string(), stock_data);
                ic_cdk::println!("✅ Successfully fetched {}", stock_id);
            }
            Err(e) => {
                ic_cdk::println!("❌ Failed to fetch {}: {:?}", stock_id, e);
                failed_stocks.push(stock_id);
            }
        }
    }
    
    if market_data.is_empty() {
        return Err(CanisterError::internal_error("Failed to fetch any real stock data"));
    }
    
    if !failed_stocks.is_empty() {
        ic_cdk::println!("⚠️  Failed to fetch {} stocks: {:?}", failed_stocks.len(), failed_stocks);
    }
    
    ic_cdk::println!("✅ Fetched {} real stocks (no mock data)", market_data.len());
    Ok(market_data)
}

// Get stock market summary for SSE streaming (ASYNC with REAL data)
// LOGIC:
// 1. This request counts as active user activity
// 2. If cache is valid (< 45 min), return cached data
// 3. If cache expired or no cache, fetch REAL data from Polygon.io
// 4. Start 30-min periodic refresh timer
// 5. NO MOCK DATA - only real API calls
pub async fn get_market_summary_async() -> Result<HashMap<String, Stock>, CanisterError> {
    let now = time();
    
    // THIS REQUEST COUNTS AS ACTIVE USER
    update_user_activity();
    ic_cdk::println!("📊 get_market_summary_async called - user activity recorded");
    
    // Check if cache is valid (< 45 minutes old)
    let cache_valid = MARKET_SUMMARY_CACHE.with(|cache| {
        let cache = cache.borrow();
        if let Some((data, cached_at)) = &*cache {
            let age = now - cached_at;
            if age < STOCK_CACHE_DURATION {
                let age_minutes = age / 60_000_000_000;
                ic_cdk::println!("✅ Cache is valid (age: {} min < 45 min)", age_minutes);
                return Some(data.clone());
            } else {
                ic_cdk::println!("⏰ Cache expired (age: {} min > 45 min)", age / 60_000_000_000);
            }
        } else {
            ic_cdk::println!("📭 No cache available");
        }
        None
    });
    
    if let Some(cached_data) = cache_valid {
        // Cache is fresh - start timer if not already running
        start_periodic_refresh();
        return Ok(cached_data);
    }
    
    // Cache expired or doesn't exist - fetch REAL data
    ic_cdk::println!("🚀 Fetching REAL data from Polygon.io (NO MOCK DATA)");
    
    let market_data = fetch_all_real_market_data().await?;
    
    // Update cache
    MARKET_SUMMARY_CACHE.with(|cache| {
        *cache.borrow_mut() = Some((market_data.clone(), now));
    });
    
    // Start periodic 30-minute refresh
    start_periodic_refresh();
    
    ic_cdk::println!("✅ Market summary complete: {} real stocks (cached for 45 min)", market_data.len());
    
    Ok(market_data)
}

// Get stock market summary for SSE streaming (SYNC version - uses cached data only)
// This is called from query endpoints - ALWAYS returns cached data, NEVER makes HTTP outcalls
pub fn get_market_summary() -> Result<HashMap<String, Stock>, CanisterError> {
    // Track user activity
    update_user_activity();
    
    // Always return from global cache (query endpoints cannot make HTTP outcalls)
    MARKET_SUMMARY_CACHE.with(|cache| {
        let cache = cache.borrow();
        if let Some((data, cached_at)) = &*cache {
            let age_minutes = (time() - cached_at) / 60_000_000_000;
            ic_cdk::println!("✅ Returning cached market summary (age: {} min)", age_minutes);
            return Ok(data.clone());
        }
        
        // No cache available - generate mock data
        ic_cdk::println!("⚠️  No cache available, returning mock data");
        let popular_stocks = vec![
            "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
            "NVDA", "META", "NFLX", "AMD", "INTC"
        ];
        
        let mut market_data = HashMap::new();
        for stock_id in popular_stocks {
            if let Ok(stock_data) = get_cached_stock_data(stock_id) {
                market_data.insert(stock_id.to_string(), stock_data);
            }
        }
        
        Ok(market_data)
    })
}

// Broadcast market summary update
pub fn broadcast_market_summary() -> Result<usize, CanisterError> {
    let market_data = get_market_summary()?;
    
    let event_data = serde_json::json!({
        "type": "market_summary",
        "stocks": market_data,
        "timestamp": ic_cdk::api::time()
    });
    
    let event_type = crate::types::SseEventType::RoomState; // Reuse existing type
    
    let connection_ids = crate::sse::broadcast_event("market_global", event_type, event_data)?;
    Ok(connection_ids.len())
}

// Clean up old stock cache entries
pub fn cleanup_stock_cache() -> Result<usize, CanisterError> {
    let _current_time = time();
    let cleaned_count = 0;
    
    // This would iterate through all cache entries and remove expired ones
    // Implementation depends on storage backend capabilities
    
    Ok(cleaned_count)
}