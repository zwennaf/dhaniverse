use crate::error::*;
use sha2::{Digest, Sha256};
use hex;

// Wallet address validation
pub fn validate_ethereum_address(address: &str) -> CanisterResult<()> {
    if !address.starts_with("0x") {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    if address.len() != 42 {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    // Check if all characters after 0x are valid hex
    let hex_part = &address[2..];
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    Ok(())
}

// Solana address validation (basic)
pub fn validate_solana_address(address: &str) -> CanisterResult<()> {
    // Solana addresses are base58 encoded and typically 32-44 characters
    if address.len() < 32 || address.len() > 44 {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    // Basic base58 character check
    let base58_chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    if !address.chars().all(|c| base58_chars.contains(c)) {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    Ok(())
}

// Generic wallet address validation
pub fn validate_wallet_address(address: &str, chain_id: &str) -> CanisterResult<()> {
    if address.is_empty() {
        return Err(CanisterError::InvalidWalletAddress);
    }
    
    match chain_id {
        "1" | "5" | "137" | "80001" => validate_ethereum_address(address), // Ethereum chains
        "solana-mainnet" | "solana-devnet" => validate_solana_address(address),
        _ => {
            // For unknown chains, do basic validation
            if address.len() < 10 || address.len() > 100 {
                Err(CanisterError::InvalidWalletAddress)
            } else {
                Ok(())
            }
        }
    }
}

// Amount validation
pub fn validate_amount(amount: f64) -> CanisterResult<()> {
    if amount < 0.0 {
        return Err(CanisterError::NegativeAmount);
    }
    
    if amount == 0.0 {
        return Err(CanisterError::InvalidAmount);
    }
    
    if !amount.is_finite() {
        return Err(CanisterError::InvalidAmount);
    }
    
    // Check for reasonable maximum (prevent overflow)
    if amount > 1e15 {
        return Err(CanisterError::InvalidAmount);
    }
    
    Ok(())
}

// Currency validation
pub fn validate_currency(currency: &str) -> CanisterResult<()> {
    match currency.to_lowercase().as_str() {
        "rupees" | "tokens" => Ok(()),
        _ => Err(CanisterError::InvalidCurrency),
    }
}

// Generate unique transaction ID
pub fn generate_transaction_id() -> String {
    let timestamp = ic_cdk::api::time();
    let random_bytes = get_random_bytes(8);
    let random_hex = hex::encode(random_bytes);
    format!("tx_{}_{}", timestamp, random_hex)
}

// Generate unique staking pool ID
// Staking ID generation removed

// Generate transaction hash (simulated)
pub fn generate_transaction_hash() -> String {
    let random_bytes = get_random_bytes(32);
    format!("0x{}", hex::encode(random_bytes))
}

// Get random bytes using IC's randomness
fn get_random_bytes(len: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; len];
    // Use timestamp-based randomness since raw_rand is async
    let timestamp = ic_cdk::api::time();
    let random_seed = timestamp.to_be_bytes().to_vec();
    
    // Use SHA256 to generate more random bytes if needed
    let mut hasher = Sha256::new();
    hasher.update(&random_seed);
    hasher.update(&ic_cdk::api::time().to_be_bytes());
    let hash = hasher.finalize();
    
    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = hash[i % hash.len()];
    }
    
    bytes
}

// Calculate exchange rate conversion
pub fn calculate_exchange(from_amount: f64, rate: f64) -> CanisterResult<f64> {
    validate_amount(from_amount)?;
    
    if rate <= 0.0 || !rate.is_finite() {
        return Err(CanisterError::ExchangeRateFailed);
    }
    
    let result = from_amount * rate;
    
    if !result.is_finite() {
        return Err(CanisterError::ExchangeRateFailed);
    }
    
    Ok(result)
}

// Calculate staking rewards
// Staking rewards calculation removed

// Format balance for display
pub fn format_balance(balance: f64) -> String {
    if balance >= 1_000_000.0 {
        format!("{:.2}M", balance / 1_000_000.0)
    } else if balance >= 1_000.0 {
        format!("{:.2}K", balance / 1_000.0)
    } else {
        format!("{:.4}", balance)
    }
}

// Sanitize string input
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || " -_.,!?".contains(*c))
        .take(1000) // Limit length
        .collect()
}

// Check if duration is valid for staking
// Staking duration validation removed

// Generate authentication message for signing
pub fn generate_auth_message(wallet_address: &str, timestamp: u64) -> String {
    format!(
        "Sign this message to authenticate with Dhaniverse:\n\nWallet: {}\nTimestamp: {}\nNonce: {}",
        wallet_address,
        timestamp,
        generate_nonce()
    )
}

// Generate a random nonce
fn generate_nonce() -> String {
    let random_bytes = get_random_bytes(16);
    hex::encode(random_bytes)
}

// Verify message timestamp is recent (within 5 minutes)
pub fn verify_message_timestamp(timestamp: u64) -> CanisterResult<()> {
    let now = ic_cdk::api::time();
    let five_minutes_nanos = 5 * 60 * 1_000_000_000u64;
    
    if now > timestamp && (now - timestamp) > five_minutes_nanos {
        return Err(CanisterError::InvalidAuthMessage);
    }
    
    if timestamp > now && (timestamp - now) > five_minutes_nanos {
        return Err(CanisterError::InvalidAuthMessage);
    }
    
    Ok(())
}

// Safe arithmetic operations to prevent overflow
pub fn safe_add(a: f64, b: f64) -> CanisterResult<f64> {
    let result = a + b;
    if !result.is_finite() {
        return Err(CanisterError::InvalidAmount);
    }
    Ok(result)
}

pub fn safe_subtract(a: f64, b: f64) -> CanisterResult<f64> {
    let result = a - b;
    if !result.is_finite() || result < 0.0 {
        return Err(CanisterError::InsufficientBalance);
    }
    Ok(result)
}

pub fn safe_multiply(a: f64, b: f64) -> CanisterResult<f64> {
    let result = a * b;
    if !result.is_finite() {
        return Err(CanisterError::InvalidAmount);
    }
    Ok(result)
}

// Convert nanoseconds to milliseconds for JavaScript compatibility
pub fn nanos_to_millis(nanos: u64) -> u64 {
    nanos / 1_000_000
}

// Convert milliseconds to nanoseconds
pub fn millis_to_nanos(millis: u64) -> u64 {
    millis * 1_000_000
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_ethereum_address() {
        assert!(validate_ethereum_address("0x1234567890123456789012345678901234567890").is_ok());
        assert!(validate_ethereum_address("0x123").is_err());
        assert!(validate_ethereum_address("1234567890123456789012345678901234567890").is_err());
        assert!(validate_ethereum_address("0x123456789012345678901234567890123456789g").is_err());
    }

    #[test]
    fn test_validate_amount() {
        assert!(validate_amount(100.0).is_ok());
        assert!(validate_amount(0.1).is_ok());
        assert!(validate_amount(-1.0).is_err());
        assert!(validate_amount(0.0).is_err());
        assert!(validate_amount(f64::INFINITY).is_err());
        assert!(validate_amount(f64::NAN).is_err());
    }

    #[test]
    fn test_calculate_exchange() {
        assert_eq!(calculate_exchange(100.0, 0.1).unwrap(), 10.0);
        assert_eq!(calculate_exchange(50.0, 2.0).unwrap(), 100.0);
        assert!(calculate_exchange(100.0, 0.0).is_err());
        assert!(calculate_exchange(-100.0, 0.1).is_err());
    }

    #[test]
    fn test_validate_currency() {
        assert!(validate_currency("rupees").is_ok());
        assert!(validate_currency("tokens").is_ok());
        assert!(validate_currency("RUPEES").is_ok());
        assert!(validate_currency("bitcoin").is_err());
    }

    // Staking-related tests removed
}