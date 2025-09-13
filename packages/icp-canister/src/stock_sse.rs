use crate::storage::{get_stock_cache, set_stock_cache, set_stock_subscription, get_sse_room, set_sse_room};
use crate::types::{Stock, StockCache, StockPrice, StockMetrics, StockSubscription};
use crate::error::CanisterError;
use ic_cdk::api::time;
use std::collections::HashMap;

// Cache configuration
const STOCK_CACHE_DURATION: u64 = 300_000_000_000; // 5 minutes in nanoseconds
const STOCK_RATE_LIMIT: u64 = 30_000_000_000; // 30 seconds between requests for same stock
const MAX_PRICE_HISTORY_DAYS: usize = 7; // One week of daily data
const MAX_ACCESS_COUNT_PER_PERIOD: u32 = 100; // Rate limiting

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

// Get stock data with caching
pub fn get_cached_stock_data(stock_id: &str) -> Result<Stock, CanisterError> {
    let current_time = time();
    
    // Try to get from cache first
    if let Some(mut cache) = get_stock_cache(stock_id) {
        if !should_refresh_cache(&cache) {
            // Update access tracking
            cache.access_count += 1;
            cache.last_access = current_time;
            set_stock_cache(stock_id, &cache);
            
            return Ok(cache.stock_data);
        }
    }
    
    // Generate fresh data
    let stock_data = generate_mock_stock_data(stock_id)?;
    
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

// Get stock market summary for SSE streaming
pub fn get_market_summary() -> Result<HashMap<String, Stock>, CanisterError> {
    let popular_stocks = vec![
        "RELIANCE", "TCS", "INFY", "HDFC", "ICICI", 
        "SBI", "BHARTI", "ITC", "WIPRO", "TECHM"
    ];
    
    let mut market_data = HashMap::new();
    
    for stock_id in popular_stocks {
        let stock_data = get_cached_stock_data(stock_id)?;
        market_data.insert(stock_id.to_string(), stock_data);
    }
    
    Ok(market_data)
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