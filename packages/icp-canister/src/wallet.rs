use crate::types::*;
use crate::error::*;
use crate::storage;
use crate::utils;

// Get available wallet types
pub fn get_available_wallets() -> Vec<WalletInfo> {
    vec![
        WalletInfo {
            name: "MetaMask".to_string(),
            wallet_type: WalletType::MetaMask,
            icon: "🦊".to_string(),
            installed: true, // We can't detect installation from backend
            download_url: Some("https://metamask.io/download/".to_string()),
        },
        WalletInfo {
            name: "Phantom".to_string(),
            wallet_type: WalletType::Phantom,
            icon: "👻".to_string(),
            installed: true,
            download_url: Some("https://phantom.app/".to_string()),
        },
        WalletInfo {
            name: "Coinbase Wallet".to_string(),
            wallet_type: WalletType::Coinbase,
            icon: "🔵".to_string(),
            installed: true,
            download_url: Some("https://www.coinbase.com/wallet".to_string()),
        },
        WalletInfo {
            name: "WalletConnect".to_string(),
            wallet_type: WalletType::WalletConnect,
            icon: "🔗".to_string(),
            installed: true,
            download_url: Some("https://walletconnect.com/".to_string()),
        },
    ]
}

// Connect wallet
pub async fn connect_wallet(
    wallet_type: WalletType,
    address: String,
    chain_id: String,
) -> CanisterResult<WalletConnection> {
    // Validate wallet address based on chain
    utils::validate_wallet_address(&address, &chain_id)?;
    
    // Check if wallet is already connected
    if let Some(existing_connection) = storage::get_wallet_connection(&address) {
        if existing_connection.wallet_type == wallet_type && existing_connection.chain_id == chain_id {
            return Err(CanisterError::WalletAlreadyConnected);
        }
    }
    
    // Create wallet connection
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: chain_id.clone(),
        wallet_type: wallet_type.clone(),
        balance: Some(simulate_wallet_balance(&wallet_type, &chain_id)),
    };
    
    // Store wallet connection
    storage::create_wallet_connection(connection.clone());
    
    // Ensure user data exists
    storage::get_or_create_user_data(&address);
    
    Ok(connection)
}

// Disconnect wallet
pub async fn disconnect_wallet(address: String) -> CanisterResult<()> {
    // Validate address format
    utils::validate_wallet_address(&address, "1")?; // Use default validation
    
    // Check if wallet is connected
    if storage::get_wallet_connection(&address).is_none() {
        return Err(CanisterError::WalletNotConnected);
    }
    
    // Remove wallet connection
    storage::remove_wallet_connection(&address);
    
    // Remove associated session
    storage::remove_session(&address);
    
    Ok(())
}

// Get wallet connection status
pub fn get_wallet_status(address: String) -> Option<WalletConnection> {
    storage::get_wallet_connection(&address)
}

// Validate wallet connection
pub fn validate_wallet_connection(address: &str) -> CanisterResult<WalletConnection> {
    match storage::get_wallet_connection(address) {
        Some(connection) => Ok(connection),
        None => Err(CanisterError::WalletNotConnected),
    }
}

// Update wallet balance (simulated)
pub async fn update_wallet_balance(address: String) -> CanisterResult<String> {
    let mut connection = validate_wallet_connection(&address)?;
    
    // Simulate balance update
    let new_balance = simulate_wallet_balance(&connection.wallet_type, &connection.chain_id);
    connection.balance = Some(new_balance.clone());
    
    // Update stored connection
    storage::create_wallet_connection(connection);
    
    Ok(new_balance)
}

// Get wallet balance
pub fn get_wallet_balance(address: &str) -> CanisterResult<Option<String>> {
    let connection = validate_wallet_connection(address)?;
    Ok(connection.balance)
}

// Switch wallet network/chain
pub async fn switch_wallet_chain(address: String, new_chain_id: String) -> CanisterResult<WalletConnection> {
    let mut connection = validate_wallet_connection(&address)?;
    
    // Validate the new chain ID
    if !is_supported_chain(&new_chain_id) {
        return Err(CanisterError::InvalidInput("Unsupported chain ID".to_string()));
    }
    
    // Update chain ID
    connection.chain_id = new_chain_id.clone();
    
    // Update balance for new chain
    connection.balance = Some(simulate_wallet_balance(&connection.wallet_type, &new_chain_id));
    
    // Store updated connection
    storage::create_wallet_connection(connection.clone());
    
    Ok(connection)
}

// Get supported chains for a wallet type
pub fn get_supported_chains(wallet_type: &WalletType) -> Vec<String> {
    match wallet_type {
        WalletType::MetaMask | WalletType::Coinbase | WalletType::WalletConnect => {
            vec![
                "1".to_string(),      // Ethereum Mainnet
                "5".to_string(),      // Goerli Testnet
                "137".to_string(),    // Polygon Mainnet
                "80001".to_string(),  // Polygon Mumbai Testnet
            ]
        }
        WalletType::Phantom => {
            vec![
                "solana-mainnet".to_string(),
                "solana-devnet".to_string(),
                "solana-testnet".to_string(),
            ]
        }
        WalletType::Injected => {
            vec![
                "1".to_string(),
                "137".to_string(),
                "solana-mainnet".to_string(),
            ]
        }
    }
}

// Check if chain is supported
fn is_supported_chain(chain_id: &str) -> bool {
    let all_supported_chains = vec![
        "1", "5", "137", "80001",  // Ethereum chains
        "solana-mainnet", "solana-devnet", "solana-testnet",  // Solana chains
    ];
    
    all_supported_chains.contains(&chain_id)
}

// Simulate wallet balance (since we can't actually query blockchain)
fn simulate_wallet_balance(wallet_type: &WalletType, chain_id: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    // Create a deterministic but pseudo-random balance based on wallet type and chain
    let mut hasher = DefaultHasher::new();
    wallet_type.hash(&mut hasher);
    chain_id.hash(&mut hasher);
    let hash = hasher.finish();
    
    // Generate balance between 0.1 and 10.0
    let balance = 0.1 + (hash % 100) as f64 / 10.0;
    
    match chain_id {
        "solana-mainnet" | "solana-devnet" | "solana-testnet" => {
            format!("{:.4} SOL", balance)
        }
        "137" | "80001" => {
            format!("{:.4} MATIC", balance)
        }
        _ => {
            format!("{:.4} ETH", balance)
        }
    }
}

// Get wallet connection statistics
pub fn get_wallet_stats() -> WalletStats {
    // This would require iterating through all connections in a real implementation
    // For now, return mock data
    WalletStats {
        total_connections: storage::get_users_count(),
        active_connections: storage::get_active_sessions_count(),
        wallet_type_distribution: get_wallet_type_distribution(),
        chain_distribution: get_chain_distribution(),
    }
}

// Get wallet type distribution
fn get_wallet_type_distribution() -> std::collections::HashMap<WalletType, usize> {
    // Mock implementation - in reality, you'd query the storage
    let mut distribution = std::collections::HashMap::new();
    distribution.insert(WalletType::MetaMask, 45);
    distribution.insert(WalletType::Phantom, 25);
    distribution.insert(WalletType::Coinbase, 20);
    distribution.insert(WalletType::WalletConnect, 10);
    distribution
}

// Get chain distribution
fn get_chain_distribution() -> std::collections::HashMap<String, usize> {
    let mut distribution = std::collections::HashMap::new();
    distribution.insert("1".to_string(), 60);      // Ethereum Mainnet
    distribution.insert("137".to_string(), 25);    // Polygon
    distribution.insert("solana-mainnet".to_string(), 15);
    distribution
}

// Wallet statistics structure
#[derive(candid::CandidType, serde::Deserialize, Clone, Debug)]
pub struct WalletStats {
    pub total_connections: usize,
    pub active_connections: usize,
    pub wallet_type_distribution: std::collections::HashMap<WalletType, usize>,
    pub chain_distribution: std::collections::HashMap<String, usize>,
}

// Validate wallet signature for transactions (placeholder)
pub fn validate_transaction_signature(
    address: &str,
    _transaction_data: &str,
    signature: &str,
) -> CanisterResult<()> {
    // Validate wallet is connected
    validate_wallet_connection(address)?;
    
    // In a real implementation, you would verify the transaction signature
    // For now, just validate the signature format
    if signature.len() < 10 {
        return Err(CanisterError::InvalidSignature);
    }
    
    Ok(())
}

// Get wallet network information
pub fn get_network_info(chain_id: &str) -> Option<NetworkInfo> {
    match chain_id {
        "1" => Some(NetworkInfo {
            chain_id: "1".to_string(),
            name: "Ethereum Mainnet".to_string(),
            currency: "ETH".to_string(),
            explorer_url: "https://etherscan.io".to_string(),
            rpc_url: "https://mainnet.infura.io/v3/".to_string(),
        }),
        "137" => Some(NetworkInfo {
            chain_id: "137".to_string(),
            name: "Polygon Mainnet".to_string(),
            currency: "MATIC".to_string(),
            explorer_url: "https://polygonscan.com".to_string(),
            rpc_url: "https://polygon-rpc.com".to_string(),
        }),
        "solana-mainnet" => Some(NetworkInfo {
            chain_id: "solana-mainnet".to_string(),
            name: "Solana Mainnet".to_string(),
            currency: "SOL".to_string(),
            explorer_url: "https://explorer.solana.com".to_string(),
            rpc_url: "https://api.mainnet-beta.solana.com".to_string(),
        }),
        _ => None,
    }
}

// Network information structure
#[derive(candid::CandidType, serde::Deserialize, Clone, Debug)]
pub struct NetworkInfo {
    pub chain_id: String,
    pub name: String,
    pub currency: String,
    pub explorer_url: String,
    pub rpc_url: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_available_wallets() {
        let wallets = get_available_wallets();
        assert_eq!(wallets.len(), 4);
        assert!(wallets.iter().any(|w| w.wallet_type == WalletType::MetaMask));
        assert!(wallets.iter().any(|w| w.wallet_type == WalletType::Phantom));
    }

    #[test]
    fn test_get_supported_chains() {
        let metamask_chains = get_supported_chains(&WalletType::MetaMask);
        assert!(metamask_chains.contains(&"1".to_string()));
        assert!(metamask_chains.contains(&"137".to_string()));
        
        let phantom_chains = get_supported_chains(&WalletType::Phantom);
        assert!(phantom_chains.contains(&"solana-mainnet".to_string()));
    }

    #[test]
    fn test_is_supported_chain() {
        assert!(is_supported_chain("1"));
        assert!(is_supported_chain("137"));
        assert!(is_supported_chain("solana-mainnet"));
        assert!(!is_supported_chain("999"));
    }

    #[test]
    fn test_simulate_wallet_balance() {
        let balance1 = simulate_wallet_balance(&WalletType::MetaMask, "1");
        let balance2 = simulate_wallet_balance(&WalletType::MetaMask, "1");
        
        // Should be deterministic
        assert_eq!(balance1, balance2);
        assert!(balance1.contains("ETH"));
        
        let sol_balance = simulate_wallet_balance(&WalletType::Phantom, "solana-mainnet");
        assert!(sol_balance.contains("SOL"));
    }

    #[test]
    fn test_get_network_info() {
        let eth_info = get_network_info("1").unwrap();
        assert_eq!(eth_info.name, "Ethereum Mainnet");
        assert_eq!(eth_info.currency, "ETH");
        
        let polygon_info = get_network_info("137").unwrap();
        assert_eq!(polygon_info.currency, "MATIC");
        
        assert!(get_network_info("999").is_none());
    }
}