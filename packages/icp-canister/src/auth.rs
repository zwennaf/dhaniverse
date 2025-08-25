use crate::types::*;
use crate::error::*;
use crate::storage;
use crate::utils;
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
// Removed unused import
use sha2::{Digest, Sha256};

// Authenticate user with wallet signature
pub async fn authenticate_with_signature(address: String, signature: String) -> CanisterResult<AuthResult> {
    // Validate wallet address
    utils::validate_wallet_address(&address, "1")?; // Default to Ethereum mainnet for validation
    
    // Sanitize the address input
    let clean_address = utils::sanitize_string(&address);
    
    // Generate authentication message
    let timestamp = ic_cdk::api::time();
    
    // Verify timestamp is reasonable
    utils::verify_message_timestamp(timestamp)?;
    
    let message = utils::generate_auth_message(&clean_address, timestamp);
    
    // Verify signature
    verify_ethereum_signature(&clean_address, &message, &signature)?;
    
    // Get or create user data
    let user_data = storage::get_or_create_user_data(&clean_address);
    let is_new_user = user_data.created_at == user_data.last_activity;
    
    // Create user object
    let user = User {
        id: clean_address.clone(),
        email: None,
        game_username: format!("Player_{}", &clean_address[2..8]), // Use first 6 chars of address
        wallet_address: Some(clean_address.clone()),
        auth_method: "web3".to_string(),
        created_at: user_data.created_at,
        updated_at: ic_cdk::api::time(),
    };
    
    // Generate session token (simplified)
    let token = generate_session_token(&clean_address);
    
    // Update user activity
    let mut updated_user_data = user_data;
    updated_user_data.last_activity = ic_cdk::api::time();
    storage::update_user_data(&clean_address, updated_user_data)?;
    
    Ok(AuthResult {
        success: true,
        user: Some(user),
        token: Some(token),
        is_new_user: Some(is_new_user),
        error: None,
    })
}

// Create a new session
pub async fn create_session(wallet_connection: WalletConnection) -> CanisterResult<Web3Session> {
    // Validate wallet connection
    utils::validate_wallet_address(&wallet_connection.address, &wallet_connection.chain_id)?;
    
    // Check if user exists
    storage::get_or_create_user_data(&wallet_connection.address);
    
    let now = ic_cdk::api::time();
    let session = Web3Session {
        wallet_address: wallet_connection.address.clone(),
        wallet_type: wallet_connection.wallet_type.clone(),
        chain_id: wallet_connection.chain_id.clone(),
        connected_at: now,
        last_activity: now,
    };
    
    // Store session
    storage::create_session(session.clone());
    
    // Store wallet connection
    storage::create_wallet_connection(wallet_connection);
    
    Ok(session)
}

// Clear user session
pub async fn clear_session(wallet_address: String) -> CanisterResult<()> {
    utils::validate_wallet_address(&wallet_address, "1")?;
    
    // Remove session
    storage::remove_session(&wallet_address);
    
    // Remove wallet connection
    storage::remove_wallet_connection(&wallet_address);
    
    Ok(())
}

// Get user session
pub fn get_session(wallet_address: String) -> Option<Web3Session> {
    if !storage::is_session_valid(&wallet_address) {
        // Clean up expired session
        storage::remove_session(&wallet_address);
        return None;
    }
    
    storage::get_session(&wallet_address)
}

// Verify user has valid session
pub fn verify_session(wallet_address: &str) -> CanisterResult<()> {
    if !storage::is_session_valid(wallet_address) {
        return Err(CanisterError::SessionExpired);
    }
    
    // Update session activity
    storage::update_session_activity(wallet_address)?;
    
    Ok(())
}

// Verify Ethereum signature
fn verify_ethereum_signature(address: &str, message: &str, signature: &str) -> CanisterResult<()> {
    // Remove 0x prefix if present
    let signature = if signature.starts_with("0x") {
        &signature[2..]
    } else {
        signature
    };
    
    // Signature should be 130 characters (65 bytes in hex)
    if signature.len() != 130 {
        return Err(CanisterError::InvalidSignature);
    }
    
    // Parse signature components
    let signature_bytes = hex::decode(signature)
        .map_err(|_| CanisterError::InvalidSignature)?;
    
    if signature_bytes.len() != 65 {
        return Err(CanisterError::InvalidSignature);
    }
    
    // Split signature into r, s, and v components
    let r = &signature_bytes[0..32];
    let s = &signature_bytes[32..64];
    let v = signature_bytes[64];
    
    // Create signature object
    let mut sig_bytes = [0u8; 64];
    sig_bytes[0..32].copy_from_slice(r);
    sig_bytes[32..64].copy_from_slice(s);
    
    let signature = Signature::from_bytes(&sig_bytes.into())
        .map_err(|_| CanisterError::SignatureVerificationFailed)?;
    
    // Calculate recovery ID
    let recovery_id = if v >= 27 {
        RecoveryId::try_from(v - 27)
    } else {
        RecoveryId::try_from(v)
    }.map_err(|_| CanisterError::SignatureVerificationFailed)?;
    
    // Create message hash (Ethereum signed message format)
    let message_hash = create_ethereum_message_hash(message);
    
    // Recover public key
    let recovered_key = VerifyingKey::recover_from_prehash(&message_hash, &signature, recovery_id)
        .map_err(|_| CanisterError::SignatureVerificationFailed)?;
    
    // Derive address from public key
    let recovered_address = public_key_to_address(&recovered_key);
    
    // Compare addresses (case-insensitive)
    if recovered_address.to_lowercase() != address.to_lowercase() {
        return Err(CanisterError::SignatureVerificationFailed);
    }
    
    Ok(())
}

// Create Ethereum message hash with prefix
fn create_ethereum_message_hash(message: &str) -> [u8; 32] {
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    hasher.update(message.as_bytes());
    hasher.finalize().into()
}

// Convert public key to Ethereum address
fn public_key_to_address(public_key: &VerifyingKey) -> String {
    let public_key_bytes = public_key.to_encoded_point(false);
    let public_key_bytes = &public_key_bytes.as_bytes()[1..]; // Remove 0x04 prefix
    
    let mut hasher = Sha256::new();
    hasher.update(public_key_bytes);
    let hash = hasher.finalize();
    
    // Take last 20 bytes and format as hex address
    let address_bytes = &hash[hash.len() - 20..];
    format!("0x{}", hex::encode(address_bytes))
}

// Generate session token (simplified implementation)
fn generate_session_token(wallet_address: &str) -> String {
    let timestamp = ic_cdk::api::time();
    let mut hasher = Sha256::new();
    hasher.update(wallet_address.as_bytes());
    hasher.update(&timestamp.to_be_bytes());
    hasher.update(b"dhaniverse_session");
    
    let hash = hasher.finalize();
    hex::encode(hash)
}

// Verify session token (simplified implementation)
pub fn verify_session_token(wallet_address: &str, _token: &str) -> CanisterResult<()> {
    // In a real implementation, you would store and validate tokens properly
    // For now, we just check if the session exists and is valid
    if !storage::is_session_valid(wallet_address) {
        return Err(CanisterError::SessionExpired);
    }
    
    Ok(())
}

// Clean up expired sessions (called periodically)
pub fn cleanup_expired_sessions() {
    storage::cleanup_expired_sessions();
}

// Get authentication statistics
pub fn get_auth_stats() -> (usize, usize) {
    let total_users = storage::get_users_count();
    let active_sessions = storage::get_active_sessions_count();
    (total_users, active_sessions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_ethereum_message_hash() {
        let message = "Hello, World!";
        let hash = create_ethereum_message_hash(message);
        assert_eq!(hash.len(), 32);
    }

    #[test]
    fn test_generate_session_token() {
        let address = "0x1234567890123456789012345678901234567890";
        let token1 = generate_session_token(address);
        let token2 = generate_session_token(address);
        
        // Tokens should be different due to timestamp
        assert_ne!(token1, token2);
        assert_eq!(token1.len(), 64); // SHA256 hex string
    }

    #[test]
    fn test_signature_validation() {
        // Test invalid signature formats
        assert!(verify_ethereum_signature(
            "0x1234567890123456789012345678901234567890",
            "test message",
            "invalid_signature"
        ).is_err());
        
        assert!(verify_ethereum_signature(
            "0x1234567890123456789012345678901234567890",
            "test message",
            "0x123" // Too short
        ).is_err());
    }
}