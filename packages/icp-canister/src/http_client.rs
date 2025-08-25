use serde_json::Value;
use num_traits::cast::ToPrimitive;
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs,
    TransformContext,
};

// Transform function for HTTP responses
#[ic_cdk::query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut response = args.response;
    // Remove unnecessary headers to reduce response size
    response.headers = vec![];
    response
}

// Fetch price from CoinGecko API with API key
pub async fn fetch_price(token_ids: &str) -> Result<Vec<(String, f64)>, String> {
    let url = format!(
        "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd",
        token_ids
    );
    
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
        Err((code, msg)) => Err(format!("HTTP request error: {:?} - {}", code, msg)),
    }
}

// Fetch stock prices (placeholder for stock API)
pub async fn fetch_stock_prices(symbols: &str) -> Result<Vec<(String, f64)>, String> {
    // Using a free stock API like Alpha Vantage or similar
    let url = format!(
        "https://api.twelvedata.com/price?symbol={}&apikey=demo",
        symbols
    );
    
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
        Err((code, msg)) => Err(format!("HTTP request error: {:?} - {}", code, msg)),
    }
}
