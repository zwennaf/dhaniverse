use serde_json::Value;
use num_traits::cast::ToPrimitive;
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs,
    TransformContext,
};
use std::collections::HashMap;

// Transform function for HTTP responses (kept for compatibility with ic-cdk v0.13)
#[ic_cdk::query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut response = args.response;
    // Remove unnecessary headers to reduce response size
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

// Fetch stock prices (placeholder for stock API)
pub async fn fetch_stock_prices(symbols: &str) -> Result<Vec<(String, f64)>, String> {
    // Using a free stock API like Alpha Vantage or similar
    let base = "https://api.twelvedata.com/price";
    let url = match url::Url::parse_with_params(base, &[("symbol", symbols), ("apikey", "demo")]) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct stock URL: {}", e)),
    };

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(4096),
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
        headers: vec![
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
                
                // Handle single symbol response
                if let Some(Value::String(price_str)) = json.get("price") {
                    if let Ok(price) = price_str.parse::<f64>() {
                        prices.push((symbols.to_string(), price));
                    }
                }
                
                Ok(prices)
            } else {
                Err(format!("HTTP request failed with status: {}", status_code))
            }
        }
        Err((code, msg)) => {
            ic_cdk::println!("http_request failed (stock): {:?} - {}", code, msg);
            Err(format!("HTTP request error: {:?} - {}", code, msg))
        },
    }
}

// Fetch historical chart data for a coin within a time range
pub async fn fetch_coin_market_chart_range(coin_id: &str, vs_currency: &str, from: u64, to: u64) -> Result<HashMap<String, Vec<(u64, f64)>>, String> {
    let base = &format!("https://api.coingecko.com/api/v3/coins/{}/market_chart/range", coin_id);
    let url = match url::Url::parse_with_params(
        base,
        &[
            ("vs_currency", vs_currency),
            ("from", &from.to_string()),
            ("to", &to.to_string()),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct market chart range URL: {}", e)),
    };

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(16384), // Increased for chart data
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
    let base = &format!("https://api.coingecko.com/api/v3/coins/{}/market_chart", coin_id);
    let url = match url::Url::parse_with_params(
        base,
        &[
            ("vs_currency", vs_currency),
            ("days", &days.to_string()),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct market chart URL: {}", e)),
    };

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
    let base = &format!("https://api.coingecko.com/api/v3/coins/{}/ohlc", coin_id);
    let url = match url::Url::parse_with_params(
        base,
        &[
            ("vs_currency", vs_currency),
            ("days", &days.to_string()),
        ],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct OHLC URL: {}", e)),
    };

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
    let base = &format!("https://api.coingecko.com/api/v3/coins/{}/history", coin_id);
    let url = match url::Url::parse_with_params(
        base,
        &[("date", date)],
    ) {
        Ok(u) => u.to_string(),
        Err(e) => return Err(format!("Failed to construct history URL: {}", e)),
    };

    let request = CanisterHttpRequestArgument {
        url: url.clone(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(4096),
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
