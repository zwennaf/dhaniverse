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
const POLYGON_API_KEY: &str = ""; // Set via environment or leave empty for demo mode

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
            if response.status != 200u8.into() {
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
