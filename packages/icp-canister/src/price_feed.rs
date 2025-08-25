use crate::storage;
use crate::error::*;

// Authorized oracle principal (example, replace with your oracle principal)
const ORACLE_PRINCIPAL: &str = "aaaaa-aa"; // replace with real principal

// Submit a price update for a symbol (USD). Only callable by authorized oracle.
pub async fn submit_price(symbol: String, price_usd: f64) -> CanisterResult<()> {
    // Validate
    if symbol.trim().is_empty() {
        return Err(CanisterError::InvalidInput("Empty symbol".to_string()));
    }
    if price_usd < 0.0 {
        return Err(CanisterError::InvalidInput("Negative price".to_string()));
    }

    // Authorization check (in a real deployment compare caller principal)
    let caller = ic_cdk::caller().to_string();
    if caller != ORACLE_PRINCIPAL {
        return Err(CanisterError::UnauthorizedAccess);
    }

    storage::set_price_feed(&symbol, price_usd);
    Ok(())
}

pub fn get_price(symbol: String) -> Option<f64> {
    storage::get_price_feed(&symbol)
}

pub fn get_all_prices() -> Vec<(String, f64)> {
    storage::get_all_price_feeds()
}
