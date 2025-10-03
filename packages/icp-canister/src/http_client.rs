use serde_json::Value;
use num_traits::cast::ToPrimitive;
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs,
    TransformContext,
};
use std::collections::HashMap;

// ============================================================================
// CONFIGURATION
// ============================================================================

// Polygon.io API configuration
const POLYGON_API_BASE: &str = "https://api.polygon.io/v2";
const POLYGON_API_KEY: &str = "8gQaSj2WkVK0iwh2fHDJxl4DhM02QrBl";

// CoinGecko API configuration (backup for crypto)
const COINGECKO_API_BASE: &str = "https://api.coingecko.com/api/v3";

// Cache settings for cycle optimization
const CACHE_DURATION_SECONDS: u64 = 1800; // 30 minutes

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

// Transform function for HTTP responses (kept for compatibility with ic-cdk v0.13)
#[ic_cdk::query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut response = args.response;
    // Remove unnecessary headers to reduce response size
    response.headers = vec![];
    response
}

// Transform function for responses (compatible version)
#[ic_cdk::query]
fn transform_response(args: TransformArgs) -> HttpResponse {
    let mut response = args.response;
    // Remove unnecessary headers to reduce response size and avoid issues
    response.headers = vec![];
    response
}

// Fetch price from CoinGecko API with API key
pub async fn fetch_price(token_ids: &str) -> Result<Vec<(String, f64)>, String> {
    // Build URL with percent-encoding for query parameters to avoid invalid URI characters
    let base = "https://api.coingecko.com/api/v3/simple/price";
    let url = match url::Url::parse_with_params(
        base,
        &[("ids", token_ids), ("vs_currencies", "usd")],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct URL: {}", e)),
    };

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(2048),
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse-ICP-Canister/1.0".to_string(),
            },
            HttpHeader {
                name: "x-cg-demo-api-key".to_string(),
                value: "CG-tLtUCAv5EG2KQuPp4XvAWTnM".to_string(),
            },
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u16 = response.status.0.to_u64().unwrap_or(0) as u16;
            if status_code >= 200 && status_code < 300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;
                
                let json: Value = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                let mut prices = Vec::new();
                
                if let Value::Object(map) = json {
                    for (token_id, price_data) in map {
                        if let Value::Object(price_map) = price_data {
                            if let Some(Value::Number(usd_price)) = price_map.get("usd") {
                                if let Some(price) = usd_price.as_f64() {
                                    prices.push((token_id, price));
                                }
                            }
                        }
                    }
                }
                
                Ok(prices)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("http_request failed: {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}

// ============================================================================
// POLYGON.IO STOCK API INTEGRATION
// ============================================================================

/// Fetch 7-day historical OHLC data from Polygon.io
/// Endpoint: GET /v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}
pub async fn fetch_polygon_historical(
    symbol: &str,
    days: u32,
) -> Result<Vec<crate::types::StockPrice>, String> {
    use crate::types::StockPrice;
    
    if POLYGON_API_KEY.is_empty() {
        return Err("Polygon API key not configured".to_string());
    }
    
    // Calculate date range in milliseconds
    let now_ms = (ic_cdk::api::time() / 1_000_000) as i64; // Convert nanoseconds to milliseconds
    let from_ms = now_ms - (days as i64 * 24 * 60 * 60 * 1000);
    
    let url = format!(
        "{}/aggs/ticker/{}/range/1/day/{}/{}?adjusted=true&sort=asc&limit=50&apiKey={}",
        POLYGON_API_BASE,
        symbol,
        from_ms,
        now_ms,
        POLYGON_API_KEY
    );
    
    ic_cdk::println!("🔍 Fetching historical data for {} from {}", symbol, url);
    
    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(50_000), // 50KB for historical data
        transform: Some(TransformContext::from_name("transform_response".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse/1.0".to_string(),
            },
        ],
    };
    
    match http_request(request, 25_000_000_000).await { // 25B cycles
        Ok((response,)) => {
            if response.status != candid::Nat::from(200u8) {
                return Err(format!("HTTP {}: {}", response.status, String::from_utf8_lossy(&response.body)));
            }
            
            let body_str = String::from_utf8(response.body)
                .map_err(|e| format!("UTF-8 decode error: {}", e))?;
            
            let json: Value = serde_json::from_str(&body_str)
                .map_err(|e| format!("JSON parse error: {}", e))?;
            
            // Parse Polygon aggregates response
            if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                let mut price_history = Vec::new();
                
                for bar in results {
                    // Extract OHLCV data
                    let timestamp = bar.get("t").and_then(|t| t.as_u64()).unwrap_or(0);
                    let open = bar.get("o").and_then(|o| o.as_f64()).unwrap_or(0.0);
                    let high = bar.get("h").and_then(|h| h.as_f64()).unwrap_or(0.0);
                    let low = bar.get("l").and_then(|l| l.as_f64()).unwrap_or(0.0);
                    let close = bar.get("c").and_then(|c| c.as_f64()).unwrap_or(0.0);
                    let volume = bar.get("v").and_then(|v| v.as_u64()).unwrap_or(0);
                    
                    // Convert milliseconds to nanoseconds for ICP
                    let timestamp_ns = timestamp * 1_000_000;
                    
                    price_history.push(StockPrice {
                        timestamp: timestamp_ns,
                        price: close,
                        volume,
                        high,
                        low,
                        open,
                        close,
                    });
                }
                
                if price_history.is_empty() {
                    return Err(format!("No historical data available for {}", symbol));
                }
                
                ic_cdk::println!("✅ Fetched {} historical data points for {}", price_history.len(), symbol);
                return Ok(price_history);
            }
            
            Err(format!("Invalid response structure for {}", symbol))
        }
        Err((code, msg)) => {
            Err(format!("HTTP request failed for {}: {:?} - {}", symbol, code, msg))
        }
    }
}

/// Fetch stock details from Polygon.io
/// Endpoint: GET /v3/reference/tickers/{ticker}
pub async fn fetch_polygon_stock_details(symbol: &str) -> Result<StockDetails, String> {
    if POLYGON_API_KEY.is_empty() {
        return Err("Polygon API key not configured".to_string());
    }
    
    let url = format!(
        "https://api.polygon.io/v3/reference/tickers/{}?apiKey={}",
        symbol,
        POLYGON_API_KEY
    );
    
    ic_cdk::println!("🔍 Fetching stock details for {} from {}", symbol, url);
    
    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(50_000), // 50KB for ticker details
        transform: Some(TransformContext::from_name("transform_response".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse/1.0".to_string(),
            },
        ],
    };
    
    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            if response.status != candid::Nat::from(200u8) {
                return Err(format!("HTTP {}: {}", response.status, String::from_utf8_lossy(&response.body)));
            }
            
            let body_str = String::from_utf8(response.body)
                .map_err(|e| format!("UTF-8 decode error: {}", e))?;
            
            let json: Value = serde_json::from_str(&body_str)
                .map_err(|e| format!("JSON parse error: {}", e))?;
            
            // Parse ticker details response
            if let Some(results) = json.get("results") {
                let name = results.get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or(symbol)
                    .to_string();
                
                let market_cap = results.get("market_cap")
                    .and_then(|m| m.as_f64())
                    .unwrap_or(0.0);
                
                let outstanding_shares = results.get("weighted_shares_outstanding")
                    .and_then(|s| s.as_u64())
                    .or_else(|| results.get("share_class_shares_outstanding").and_then(|s| s.as_u64()))
                    .unwrap_or(0);
                
                let description = results.get("description")
                    .and_then(|d| d.as_str())
                    .unwrap_or("")
                    .to_string();
                
                ic_cdk::println!("✅ Fetched details for {}: market_cap={}, shares={}", symbol, market_cap, outstanding_shares);
                
                return Ok(StockDetails {
                    name,
                    market_cap,
                    outstanding_shares,
                    description,
                });
            }
            
            Err(format!("Invalid response structure for {}", symbol))
        }
        Err((code, msg)) => {
            Err(format!("HTTP request failed for {}: {:?} - {}", symbol, code, msg))
        }
    }
}

/// Stock details from Polygon.io ticker endpoint
#[derive(Debug, Clone)]
pub struct StockDetails {
    pub name: String,
    pub market_cap: f64,
    pub outstanding_shares: u64,
    pub description: String,
}

/// Fetch real stock prices from Polygon.io API
/// Uses previous close endpoint which is free tier compatible
/// Optimized for ICP cycles with 30-minute caching
pub async fn fetch_stock_prices(symbols: &str) -> Result<Vec<(String, f64)>, String> {
    ic_cdk::println!("🔍 Fetching stock prices from Polygon.io for: {}", symbols);
    
    let symbol_list: Vec<&str> = symbols.split(',').map(|s| s.trim()).collect();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    
    // Check if API key is configured
    if POLYGON_API_KEY.is_empty() {
        ic_cdk::println!("⚠️  Polygon API key not configured, using fallback prices");
        return fetch_fallback_stock_prices(&symbol_list);
    }
    
    // Process symbols in batches to optimize cycles
    for symbol in symbol_list.iter() {
        let symbol_upper = symbol.to_uppercase();
        
        // Check cache first (30-minute TTL)
        if let Some(cached_price) = check_price_cache(&symbol_upper) {
            ic_cdk::println!("✅ Cache hit for {}: ${}", symbol_upper, cached_price);
            results.push((symbol_upper, cached_price));
            continue;
        }
        
        // Fetch from Polygon API: /v2/aggs/ticker/{ticker}/prev
        match fetch_polygon_prev_close(&symbol_upper).await {
            Ok(price) => {
                ic_cdk::println!("✅ Fetched {} from Polygon: ${}", symbol_upper, price);
                cache_price(&symbol_upper, price);
                results.push((symbol_upper.clone(), price));
            }
            Err(e) => {
                ic_cdk::println!("❌ Failed to fetch {}: {}", symbol_upper, e);
                errors.push(format!("{}: {}", symbol_upper, e));
                
                // Use fallback for failed symbols
                if let Ok(fallback) = fetch_fallback_stock_prices(&[symbol]) {
                    if let Some((sym, price)) = fallback.first() {
                        results.push((sym.clone(), *price));
                    }
                }
            }
        }
    }
    
    if results.is_empty() {
        return Err(format!("Failed to fetch any stock prices. Errors: {}", errors.join(", ")));
    }
    
    Ok(results)
}

/// Fetch previous close price for a single stock from Polygon.io
/// Endpoint: GET /v2/aggs/ticker/{ticker}/prev
async fn fetch_polygon_prev_close(symbol: &str) -> Result<f64, String> {
    let url = format!(
        "{}/aggs/ticker/{}/prev?adjusted=true&apiKey={}",
        POLYGON_API_BASE, symbol, POLYGON_API_KEY
    );
    
    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(10_000), // 10KB should be enough for price data
        transform: Some(TransformContext::from_name("transform_response".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse/1.0".to_string(),
            },
        ],
    };
    
    match http_request(request, 25_000_000_000).await { // 25B cycles ~= $0.000033 per call
        Ok((response,)) => {
            if response.status != candid::Nat::from(200u8) {
                return Err(format!("HTTP {}: {}", response.status, String::from_utf8_lossy(&response.body)));
            }
            
            // Parse Polygon.io response
            let body_str = String::from_utf8(response.body)
                .map_err(|e| format!("UTF-8 decode error: {}", e))?;
            
            let json: Value = serde_json::from_str(&body_str)
                .map_err(|e| format!("JSON parse error: {}", e))?;
            
            // Polygon response structure: { "results": [{ "c": close_price, ... }] }
            if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                if let Some(first_result) = results.first() {
                    if let Some(close_price) = first_result.get("c").and_then(|c| c.as_f64()) {
                        return Ok(close_price);
                    }
                }
            }
            
            Err("No price data in Polygon response".to_string())
        }
        Err((code, msg)) => {
            Err(format!("HTTP request failed: {:?} - {}", code, msg))
        }
    }
}

/// Fallback function for when Polygon API fails
/// Returns reasonable prices based on known stock data
fn fetch_fallback_stock_prices(symbols: &[&str]) -> Result<Vec<(String, f64)>, String> {
    ic_cdk::println!("⚠️  Using fallback prices");
    
    let fallback_prices: HashMap<&str, f64> = [
        // Indian stocks (approximate prices in INR)
        ("RELIANCE", 2500.0),
        ("TCS", 3500.0),
        ("HDFCBANK", 1650.0),
        ("INFY", 1450.0),
        ("ICICIBANK", 950.0),
        ("HINDUNILVR", 2600.0),
        ("ITC", 425.0),
        ("SBIN", 575.0),
        ("BHARTIARTL", 1500.0),
        ("BAJFINANCE", 6800.0),
        
        // US stocks (in USD)
        ("AAPL", 175.0),
        ("GOOGL", 140.0),
        ("MSFT", 370.0),
        ("AMZN", 145.0),
        ("TSLA", 250.0),
        ("NVDA", 480.0),
        ("META", 320.0),
    ].iter().cloned().collect();
    
    let mut results = Vec::new();
    for symbol in symbols {
        let symbol_upper = symbol.to_uppercase();
        let price = fallback_prices.get(symbol_upper.as_str()).copied().unwrap_or(100.0);
        results.push((symbol_upper, price));
    }
    
    Ok(results)
}

// ============================================================================
// CACHING FOR CYCLE OPTIMIZATION
// ============================================================================

use std::cell::RefCell;

thread_local! {
    static PRICE_CACHE: RefCell<HashMap<String, (f64, u64)>> = RefCell::new(HashMap::new());
}

fn check_price_cache(symbol: &str) -> Option<f64> {
    PRICE_CACHE.with(|cache| {
        let cache = cache.borrow();
        if let Some((price, cached_at)) = cache.get(symbol) {
            let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds
            if now - cached_at < CACHE_DURATION_SECONDS {
                return Some(*price);
            }
        }
        None
    })
}

fn cache_price(symbol: &str, price: f64) {
    PRICE_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let now = ic_cdk::api::time() / 1_000_000_000;
        cache.insert(symbol.to_string(), (price, now));
        
        // Limit cache size to prevent memory issues
        if cache.len() > 100 {
            // Remove oldest entries
            let mut entries: Vec<_> = cache.iter()
                .map(|(k, v)| (k.clone(), *v))
                .collect();
            entries.sort_by_key(|(_, (_, time))| *time);
            
            // Keep only most recent 80 entries
            // Bug fix: Ensure we skip the correct number of oldest entries
            let entries_len = entries.len();
            let skip_count = if entries_len > 80 { entries_len - 80 } else { 0 };
            
            cache.clear();
            for (k, v) in entries.into_iter().skip(skip_count) {
                cache.insert(k, v);
            }
        }
    });
}

pub fn clear_price_cache() {
    PRICE_CACHE.with(|cache| {
        cache.borrow_mut().clear();
    });
}

pub fn get_cache_stats() -> (usize, usize) {
    PRICE_CACHE.with(|cache| {
        let cache = cache.borrow();
        let total = cache.len();
        let now = ic_cdk::api::time() / 1_000_000_000;
        let valid = cache.values()
            .filter(|(_, cached_at)| now - cached_at < CACHE_DURATION_SECONDS)
            .count();
        (total, valid)
    })
}

// ============================================================================
// METRICS CALCULATION FROM REAL DATA
// ============================================================================

/// Calculate financial metrics from real Polygon.io data
pub fn calculate_metrics(
    symbol: &str,
    _current_price: f64,
    price_history: &[crate::types::StockPrice],
    details: &StockDetails,
) -> crate::types::StockMetrics {
    use crate::types::StockMetrics;
    
    // P/E Ratio: Estimate based on sector averages (or use real if available)
    let pe_ratio = estimate_pe_from_sector(symbol);
    
    // EPS: Calculate from market cap and P/E ratio
    // EPS = (Market Cap / Outstanding Shares) / P/E Ratio
    let eps = if details.outstanding_shares > 0 && pe_ratio > 0.0 {
        (details.market_cap / details.outstanding_shares as f64) / pe_ratio
    } else {
        0.0
    };
    
    // Volatility: Calculate standard deviation from price history
    let volatility = calculate_volatility(price_history);
    
    // Business Growth: Calculate from 7-day price change
    let business_growth = if price_history.len() >= 2 {
        let first = price_history.first().unwrap().close;
        let last = price_history.last().unwrap().close;
        if first > 0.0 {
            ((last - first) / first) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };
    
    // Debt/Equity: Use industry average estimates
    let debt_equity_ratio = estimate_debt_equity(symbol);
    
    // Industry Average P/E
    let industry_avg_pe = get_industry_avg_pe(symbol);
    
    StockMetrics {
        market_cap: details.market_cap,
        pe_ratio,
        eps,
        debt_equity_ratio,
        business_growth,
        industry_avg_pe,
        outstanding_shares: details.outstanding_shares,
        volatility,
    }
}

/// Calculate volatility (standard deviation) from price history
fn calculate_volatility(price_history: &[crate::types::StockPrice]) -> f64 {
    if price_history.len() < 2 {
        return 0.0;
    }
    
    // Calculate daily returns
    let mut returns: Vec<f64> = Vec::new();
    for i in 1..price_history.len() {
        let prev_price = price_history[i - 1].close;
        let curr_price = price_history[i].close;
        if prev_price > 0.0 {
            let daily_return = (curr_price - prev_price) / prev_price;
            returns.push(daily_return);
        }
    }
    
    if returns.is_empty() {
        return 0.0;
    }
    
    // Calculate mean
    let mean: f64 = returns.iter().sum::<f64>() / returns.len() as f64;
    
    // Calculate variance
    let variance: f64 = returns.iter()
        .map(|r| {
            let diff = r - mean;
            diff * diff
        })
        .sum::<f64>() / returns.len() as f64;
    
    // Return standard deviation (annualized)
    variance.sqrt() * (252.0_f64).sqrt() // 252 trading days per year
}

/// Estimate P/E ratio based on sector
fn estimate_pe_from_sector(symbol: &str) -> f64 {
    match symbol {
        // Tech stocks (high P/E)
        "AAPL" | "GOOGL" | "MSFT" | "AMZN" | "META" | "NVDA" => 28.5,
        "NFLX" | "AMD" | "INTC" | "CSCO" => 22.0,
        
        // Auto (moderate P/E)
        "TSLA" | "F" | "GM" => 18.0,
        
        // Finance (low P/E)
        "JPM" | "BAC" | "WFC" | "GS" => 12.5,
        
        // Energy (low P/E)
        "XOM" | "CVX" => 10.5,
        
        // Healthcare (moderate-high P/E)
        "JNJ" | "UNH" | "PFE" => 20.0,
        
        // Default
        _ => 18.5,
    }
}

/// Estimate debt/equity ratio based on sector
fn estimate_debt_equity(symbol: &str) -> f64 {
    match symbol {
        // Tech (low debt)
        "AAPL" | "GOOGL" | "MSFT" | "META" | "NVDA" => 0.15,
        "AMZN" | "NFLX" => 0.25,
        
        // Auto (moderate debt)
        "TSLA" | "F" | "GM" => 0.55,
        
        // Finance (high leverage)
        "JPM" | "BAC" | "WFC" | "GS" => 0.85,
        
        // Energy (moderate debt)
        "XOM" | "CVX" => 0.45,
        
        // Healthcare (low-moderate debt)
        "JNJ" | "UNH" | "PFE" => 0.35,
        
        // Default
        _ => 0.50,
    }
}

/// Get industry average P/E ratio
fn get_industry_avg_pe(symbol: &str) -> f64 {
    match symbol {
        "AAPL" | "GOOGL" | "MSFT" | "AMZN" | "META" | "NVDA" | "NFLX" | "AMD" | "INTC" | "CSCO" => 25.8,
        "TSLA" | "F" | "GM" => 16.5,
        "JPM" | "BAC" | "WFC" | "GS" => 11.2,
        "XOM" | "CVX" => 9.8,
        "JNJ" | "UNH" | "PFE" => 18.5,
        _ => 20.5,
    }
}

// Fetch historical chart data for a coin within a time range
pub async fn fetch_coin_market_chart_range(coin_id: &str, vs_currency: &str, from: u64, to: u64) -> Result<HashMap<String, Vec<(u64, f64)>>, String> {
    // Construct the URL path with coin_id embedded
    let url_path = format!("https://api.coingecko.com/api/v3/coins/{}/market_chart/range", coin_id);
    
    let url = match url::Url::parse_with_params(
        &url_path,
        &[
            ("vs_currency", vs_currency),
            ("from", &from.to_string()),
            ("to", &to.to_string()),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct market chart range URL: {}", e)),
    };

    ic_cdk::println!("Fetching market chart range from URL: {}", url);

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(32768), // Increased for range data
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse-ICP-Canister/1.0".to_string(),
            },
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u16 = response.status.0.to_u64().unwrap_or(0) as u16;
            if status_code >= 200 && status_code < 300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;
                
                let json: Value = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                let mut result = HashMap::new();
                
                if let Value::Object(map) = json {
                    // Extract prices, market_caps, total_volumes
                    for (key, value) in map {
                        if let Value::Array(array) = value {
                            let mut data_points = Vec::new();
                            for item in array {
                                if let Value::Array(point) = item {
                                    if point.len() >= 2 {
                                        if let (Some(Value::Number(timestamp)), Some(Value::Number(value))) = 
                                            (point.get(0), point.get(1)) {
                                            if let (Some(ts), Some(val)) = (timestamp.as_u64(), value.as_f64()) {
                                                data_points.push((ts, val));
                                            }
                                        }
                                    }
                                }
                            }
                            result.insert(key, data_points);
                        }
                    }
                }
                
                Ok(result)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("market_chart_range failed: {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}

// Fetch historical chart data for a coin for a defined duration
pub async fn fetch_coin_market_chart(coin_id: &str, vs_currency: &str, days: u32) -> Result<HashMap<String, Vec<(u64, f64)>>, String> {
    // Construct the URL path with coin_id embedded
    let url_path = format!("https://api.coingecko.com/api/v3/coins/{}/market_chart", coin_id);
    
    let url = match url::Url::parse_with_params(
        &url_path,
        &[
            ("vs_currency", vs_currency),
            ("days", &days.to_string()),
            ("interval", if days <= 1 { "hourly" } else if days <= 90 { "daily" } else { "daily" }),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct market chart URL: {}", e)),
    };

    ic_cdk::println!("Fetching market chart from URL: {}", url);

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(32768), // Increased for historical data
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse-ICP-Canister/1.0".to_string(),
            },
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u16 = response.status.0.to_u64().unwrap_or(0) as u16;
            if status_code >= 200 && status_code < 300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;
                
                let json: Value = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                let mut result = HashMap::new();
                
                if let Value::Object(map) = json {
                    for (key, value) in map {
                        if let Value::Array(array) = value {
                            let mut data_points = Vec::new();
                            for item in array {
                                if let Value::Array(point) = item {
                                    if point.len() >= 2 {
                                        if let (Some(Value::Number(timestamp)), Some(Value::Number(value))) = 
                                            (point.get(0), point.get(1)) {
                                            if let (Some(ts), Some(val)) = (timestamp.as_u64(), value.as_f64()) {
                                                data_points.push((ts, val));
                                            }
                                        }
                                    }
                                }
                            }
                            result.insert(key, data_points);
                        }
                    }
                }
                
                Ok(result)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("market_chart failed: {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}

// Fetch OHLC chart data for a coin
pub async fn fetch_coin_ohlc(coin_id: &str, vs_currency: &str, days: u32) -> Result<Vec<(u64, f64, f64, f64, f64)>, String> {
    // Construct the URL path with coin_id embedded
    let url_path = format!("https://api.coingecko.com/api/v3/coins/{}/ohlc", coin_id);
    
    let url = match url::Url::parse_with_params(
        &url_path,
        &[
            ("vs_currency", vs_currency),
            ("days", &days.to_string()),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct OHLC URL: {}", e)),
    };

    ic_cdk::println!("Fetching OHLC from URL: {}", url);

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(16384),
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse-ICP-Canister/1.0".to_string(),
            },
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u16 = response.status.0.to_u64().unwrap_or(0) as u16;
            if status_code >= 200 && status_code < 300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;
                
                let json: Value = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                let mut result = Vec::new();
                
                if let Value::Array(array) = json {
                    for item in array {
                        if let Value::Array(ohlc) = item {
                            if ohlc.len() >= 5 {
                                if let (
                                    Some(Value::Number(timestamp)),
                                    Some(Value::Number(open)),
                                    Some(Value::Number(high)),
                                    Some(Value::Number(low)),
                                    Some(Value::Number(close))
                                ) = (ohlc.get(0), ohlc.get(1), ohlc.get(2), ohlc.get(3), ohlc.get(4)) {
                                    if let (Some(ts), Some(o), Some(h), Some(l), Some(c)) = (
                                        timestamp.as_u64(),
                                        open.as_f64(),
                                        high.as_f64(),
                                        low.as_f64(),
                                        close.as_f64()
                                    ) {
                                        result.push((ts, o, h, l, c));
                                    }
                                }
                            }
                        }
                    }
                }
                
                Ok(result)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("ohlc failed: {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}

// Fetch historical data for a coin at a given date
pub async fn fetch_coin_history(coin_id: &str, date: &str) -> Result<HashMap<String, f64>, String> {
    // Construct the URL path with coin_id embedded
    let url_path = format!("https://api.coingecko.com/api/v3/coins/{}/history", coin_id);
    
    let url = match url::Url::parse_with_params(
        &url_path,
        &[("date", date), ("localization", "false")],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct history URL: {}", e)),
    };

    ic_cdk::println!("Fetching coin history from URL: {}", url);

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(8192),
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
            HttpHeader {
                name: "User-Agent".to_string(),
                value: "Dhaniverse-ICP-Canister/1.0".to_string(),
            },
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request, 25_000_000_000).await {
        Ok((response,)) => {
            let status_code: u16 = response.status.0.to_u64().unwrap_or(0) as u16;
            if status_code >= 200 && status_code < 300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;
                
                let json: Value = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                let mut result = HashMap::new();
                
                if let Some(Value::Object(market_data)) = json.get("market_data") {
                    if let Some(Value::Object(current_price)) = market_data.get("current_price") {
                        for (currency, price) in current_price {
                            if let Value::Number(price_num) = price {
                                if let Some(price_val) = price_num.as_f64() {
                                    result.insert(currency.clone(), price_val);
                                }
                            }
                        }
                    }
                }
                
                Ok(result)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("history failed: {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}
