use pocket_ic::PocketIc;
use candid::{Encode, Decode, Principal};
use rust_icp_canister::*;

const WASM_PATH: &str = "target/wasm32-unknown-unknown/release/rust_icp_canister.wasm";

fn setup_canister() -> (PocketIc, Principal) {
    let pic = PocketIc::new();
    let canister_id = pic.create_canister();
    pic.add_cycles(canister_id, 2_000_000_000_000);
    
    let wasm_bytes = std::fs::read(WASM_PATH)
        .expect("Could not read canister wasm file. Make sure to build the canister first with 'cargo build --target wasm32-unknown-unknown --release'");
    
    pic.install_canister(canister_id, wasm_bytes, vec![], None);
    
    (pic, canister_id)
}

#[test]
fn test_canister_installation() {
    let (pic, canister_id) = setup_canister();
    
    // Test health check
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "health_check",
        Encode!().unwrap(),
    );
    
    assert!(result.is_ok());
    let response: String = Decode!(result.unwrap().bytes(), String).unwrap();
    assert!(response.contains("Dhaniverse Rust ICP Canister is running"));
}

#[test]
fn test_wallet_connection_flow() {
    let (pic, canister_id) = setup_canister();
    
    // Test get available wallets
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_available_wallets",
        Encode!().unwrap(),
    );
    
    assert!(result.is_ok());
    let wallets: Vec<WalletInfo> = Decode!(result.unwrap().bytes(), Vec<WalletInfo>).unwrap();
    assert!(!wallets.is_empty());
    assert!(wallets.iter().any(|w| matches!(w.wallet_type, WalletType::MetaMask)));
    
    // Test wallet connection
    let wallet_type = WalletType::MetaMask;
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let chain_id = "1".to_string();
    
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "connect_wallet",
        Encode!(&wallet_type, &address, &chain_id).unwrap(),
    );
    
    assert!(result.is_ok());
    let connection_result: Result<WalletConnection, String> = 
        Decode!(result.unwrap().bytes(), Result<WalletConnection, String>).unwrap();
    
    assert!(connection_result.is_ok());
    let connection = connection_result.unwrap();
    assert_eq!(connection.address, address);
    assert_eq!(connection.chain_id, chain_id);
    assert_eq!(connection.wallet_type, wallet_type);
    
    // Test get wallet status
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_wallet_status",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let status: Option<WalletConnection> = Decode!(result.unwrap().bytes(), Option<WalletConnection>).unwrap();
    assert!(status.is_some());
    assert_eq!(status.unwrap().address, address);
}

#[test]
fn test_banking_operations() {
    let (pic, canister_id) = setup_canister();
    
    // First connect a wallet
    let wallet_type = WalletType::MetaMask;
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let chain_id = "1".to_string();
    
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: chain_id.clone(),
        wallet_type: wallet_type.clone(),
        balance: Some("1.5 ETH".to_string()),
    };
    
    // Create session
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_session",
        Encode!(&connection).unwrap(),
    );
    
    assert!(result.is_ok());
    
    // Test get dual balance
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_dual_balance",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let balance_result: Result<DualBalance, String> = 
        Decode!(result.unwrap().bytes(), Result<DualBalance, String>).unwrap();
    
    assert!(balance_result.is_ok());
    let balance = balance_result.unwrap();
    assert_eq!(balance.rupees_balance, 0.0); // Starting balance
    assert_eq!(balance.token_balance, 0.0);
    
    // Test currency exchange
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "exchange_currency",
        Encode!(&address, &"rupees".to_string(), &"tokens".to_string(), &1000.0).unwrap(),
    );
    
    assert!(result.is_ok());
    let exchange_result: Result<ExchangeResult, String> = 
        Decode!(result.unwrap().bytes(), Result<ExchangeResult, String>).unwrap();
    
    assert!(exchange_result.is_ok());
    let exchange = exchange_result.unwrap();
    assert!(exchange.success);
    assert_eq!(exchange.from_amount, 1000.0);
    assert_eq!(exchange.to_amount, 100.0); // 1000 * 0.1 exchange rate
    
    // Verify balance after exchange
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_dual_balance",
        Encode!(&address).unwrap(),
    );
    
    let balance_result: Result<DualBalance, String> = 
        Decode!(result.unwrap().bytes(), Result<DualBalance, String>).unwrap();
    let balance = balance_result.unwrap();
    assert_eq!(balance.rupees_balance, 24000.0); // 0 - 1000
    assert_eq!(balance.token_balance, 100.0); // 0 + 100
}

// staking integration tests removed

#[test]
fn test_achievement_system() {
    let (pic, canister_id) = setup_canister();
    
    // Setup wallet and session
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: "1".to_string(),
        wallet_type: WalletType::MetaMask,
        balance: Some("1.5 ETH".to_string()),
    };
    
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_session",
        Encode!(&connection).unwrap(),
    ).unwrap();
    
    // Perform an exchange to unlock achievement
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "exchange_currency",
        Encode!(&address, &"rupees".to_string(), &"tokens".to_string(), &1000.0).unwrap(),
    ).unwrap();
    
    // Test get achievements
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_achievements",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let achievements: Vec<Achievement> = Decode!(result.unwrap().bytes(), Vec<Achievement>).unwrap();
    
    // Should have first exchange achievement unlocked
    let first_exchange = achievements.iter().find(|a| a.id == "first_exchange");
    assert!(first_exchange.is_some());
    assert!(first_exchange.unwrap().unlocked);
    
    // Test claim achievement reward
    if let Some(achievement) = first_exchange {
        if achievement.reward.is_some() {
            let result = pic.update_call(
                canister_id,
                Principal::anonymous(),
                "claim_achievement_reward",
                Encode!(&address, &"first_exchange".to_string()).unwrap(),
            );
            
            assert!(result.is_ok());
            let reward_result: Result<AchievementReward, String> = 
                Decode!(result.unwrap().bytes(), Result<AchievementReward, String>).unwrap();
            
            assert!(reward_result.is_ok());
            let reward = reward_result.unwrap();
            assert_eq!(reward.reward_type, "rupees");
            assert_eq!(reward.amount, 1000.0);
        }
    }
}

#[test]
fn test_defi_simulations() {
    let (pic, canister_id) = setup_canister();
    
    // Setup wallet and session
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: "1".to_string(),
        wallet_type: WalletType::MetaMask,
        balance: Some("1.5 ETH".to_string()),
    };
    
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_session",
        Encode!(&connection).unwrap(),
    ).unwrap();
    
    // Exchange to get tokens
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "exchange_currency",
        Encode!(&address, &"rupees".to_string(), &"tokens".to_string(), &10000.0).unwrap(),
    ).unwrap();
    
    // Test liquidity pool simulation
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "simulate_liquidity_pool",
        Encode!(&address, &500.0).unwrap(),
    );
    
    assert!(result.is_ok());
    let rewards_result: Result<f64, String> = 
        Decode!(result.unwrap().bytes(), Result<f64, String>).unwrap();
    
    assert!(rewards_result.is_ok());
    let rewards = rewards_result.unwrap();
    assert!(rewards > 0.0);
    assert!(rewards < 500.0); // Rewards should be less than principal
    
    // Test yield farming simulation
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "simulate_yield_farming",
        Encode!(&address, &300.0).unwrap(),
    );
    
    assert!(result.is_ok());
    let rewards_result: Result<f64, String> = 
        Decode!(result.unwrap().bytes(), Result<f64, String>).unwrap();
    
    assert!(rewards_result.is_ok());
    let rewards = rewards_result.unwrap();
    assert!(rewards > 0.0);
    assert!(rewards < 300.0);
}

#[test]
fn test_transaction_history() {
    let (pic, canister_id) = setup_canister();
    
    // Setup wallet and session
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: "1".to_string(),
        wallet_type: WalletType::MetaMask,
        balance: Some("1.5 ETH".to_string()),
    };
    
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_session",
        Encode!(&connection).unwrap(),
    ).unwrap();
    
    // Perform some operations to generate transactions
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "exchange_currency",
        Encode!(&address, &"rupees".to_string(), &"tokens".to_string(), &1000.0).unwrap(),
    ).unwrap();
    
    pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_transaction",
        Encode!(&address, &TransactionType::Deposit, &500.0, &None::<String>).unwrap(),
    ).unwrap();
    
    // Test get transaction history
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_transaction_history",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let transactions: Vec<Web3Transaction> = Decode!(result.unwrap().bytes(), Vec<Web3Transaction>).unwrap();
    
    assert!(!transactions.is_empty());
    
    // Verify transactions are sorted by timestamp (newest first)
    if transactions.len() > 1 {
        assert!(transactions[0].timestamp >= transactions[1].timestamp);
    }
    
    // Verify transaction types
    let exchange_tx = transactions.iter().find(|t| t.transaction_type == TransactionType::Exchange);
    assert!(exchange_tx.is_some());
    
    let deposit_tx = transactions.iter().find(|t| t.transaction_type == TransactionType::Deposit);
    assert!(deposit_tx.is_some());
}

#[test]
fn test_session_management() {
    let (pic, canister_id) = setup_canister();
    
    let address = "0x1234567890123456789012345678901234567890".to_string();
    let connection = WalletConnection {
        address: address.clone(),
        chain_id: "1".to_string(),
        wallet_type: WalletType::MetaMask,
        balance: Some("1.5 ETH".to_string()),
    };
    
    // Create session
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "create_session",
        Encode!(&connection).unwrap(),
    );
    
    assert!(result.is_ok());
    let session_result: Result<Web3Session, String> = 
        Decode!(result.unwrap().bytes(), Result<Web3Session, String>).unwrap();
    
    assert!(session_result.is_ok());
    let session = session_result.unwrap();
    assert_eq!(session.wallet_address, address);
    assert_eq!(session.wallet_type, WalletType::MetaMask);
    
    // Get session
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_session",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let session_opt: Option<Web3Session> = Decode!(result.unwrap().bytes(), Option<Web3Session>).unwrap();
    assert!(session_opt.is_some());
    
    // Clear session
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "clear_session",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    
    // Verify session is cleared
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_session",
        Encode!(&address).unwrap(),
    );
    
    let session_opt: Option<Web3Session> = Decode!(result.unwrap().bytes(), Option<Web3Session>).unwrap();
    assert!(session_opt.is_none());
}

#[test]
fn test_error_handling() {
    let (pic, canister_id) = setup_canister();
    
    let address = "0x1234567890123456789012345678901234567890".to_string();
    
    // Test operation without session (should fail)
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "get_dual_balance",
        Encode!(&address).unwrap(),
    );
    
    assert!(result.is_ok());
    let balance_result: Result<DualBalance, String> = 
        Decode!(result.unwrap().bytes(), Result<DualBalance, String>).unwrap();
    
    assert!(balance_result.is_err());
    assert!(balance_result.unwrap_err().contains("Session"));
    
    // Test invalid wallet address
    let invalid_address = "invalid_address".to_string();
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "connect_wallet",
        Encode!(&WalletType::MetaMask, &invalid_address, &"1".to_string()).unwrap(),
    );
    
    assert!(result.is_ok());
    let connection_result: Result<WalletConnection, String> = 
        Decode!(result.unwrap().bytes(), Result<WalletConnection, String>).unwrap();
    
    assert!(connection_result.is_err());
    assert!(connection_result.unwrap_err().contains("Invalid wallet address"));
}

#[test]
fn test_concurrent_operations() {
    let (pic, canister_id) = setup_canister();
    
    // Setup multiple users
    let addresses = vec![
        "0x1111111111111111111111111111111111111111".to_string(),
        "0x2222222222222222222222222222222222222222".to_string(),
        "0x3333333333333333333333333333333333333333".to_string(),
    ];
    
    // Create sessions for all users
    for address in &addresses {
        let connection = WalletConnection {
            address: address.clone(),
            chain_id: "1".to_string(),
            wallet_type: WalletType::MetaMask,
            balance: Some("1.5 ETH".to_string()),
        };
        
        pic.update_call(
            canister_id,
            Principal::anonymous(),
            "create_session",
            Encode!(&connection).unwrap(),
        ).unwrap();
    }
    
    // Perform concurrent operations
    for address in &addresses {
        // Exchange currency
        let result = pic.update_call(
            canister_id,
            Principal::anonymous(),
            "exchange_currency",
            Encode!(address, &"rupees".to_string(), &"tokens".to_string(), &1000.0).unwrap(),
        );
        assert!(result.is_ok());
        
        // Check balance
        let result = pic.query_call(
            canister_id,
            Principal::anonymous(),
            "get_dual_balance",
            Encode!(address).unwrap(),
        );
        assert!(result.is_ok());
    }
    
    // Verify all users have correct balances
    for address in &addresses {
        let result = pic.query_call(
            canister_id,
            Principal::anonymous(),
            "get_dual_balance",
            Encode!(address).unwrap(),
        );
        
        let balance_result: Result<DualBalance, String> = 
            Decode!(result.unwrap().bytes(), Result<DualBalance, String>).unwrap();
        
        assert!(balance_result.is_ok());
        let balance = balance_result.unwrap();
        assert_eq!(balance.rupees_balance, 24000.0); // 0 - 1000
        assert_eq!(balance.token_balance, 100.0); // 1000 * 0.1
    }
}

// SSE Integration Tests
#[test]
fn test_sse_global_stats() {
    let (pic, canister_id) = setup_canister();
    
    // Test getting global SSE stats
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "sse_get_global_stats",
        Encode!().unwrap(),
    );
    
    assert!(result.is_ok());
    let stats: (usize, usize, usize) = Decode!(result.unwrap().bytes(), (usize, usize, usize)).unwrap();
    
    // Initially should have no rooms, connections, or events
    assert_eq!(stats, (0, 0, 0));
}

#[test] 
fn test_sse_broadcast_peer_joined() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-1".to_string();
    let peer_id = "peer-123".to_string();
    let mut meta = std::collections::HashMap::new();
    meta.insert("username".to_string(), "alice".to_string());
    
    // Test broadcasting peer joined event
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_peer_joined",
        Encode!(room_id, peer_id, meta).unwrap(),
    );
    
    assert!(result.is_ok());
    let broadcast_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(broadcast_count.is_ok());
    // Should return 0 since no connections are subscribed yet
    assert_eq!(broadcast_count.unwrap(), 0);
}

#[test]
fn test_sse_broadcast_peer_left() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-2".to_string();
    let peer_id = "peer-456".to_string();
    
    // Test broadcasting peer left event
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_peer_left",
        Encode!(room_id, peer_id).unwrap(),
    );
    
    assert!(result.is_ok());
    let broadcast_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(broadcast_count.is_ok());
    assert_eq!(broadcast_count.unwrap(), 0);
}

#[test]
fn test_sse_broadcast_offer() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-3".to_string();
    let from = "peer-1".to_string();
    let to = "peer-2".to_string();
    let sdp = "v=0\r\no=alice 2890844526 2890844526 IN IP4 host.atlanta.com".to_string();
    
    // Test broadcasting offer event
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_offer",
        Encode!(room_id, from, to, sdp).unwrap(),
    );
    
    assert!(result.is_ok());
    let broadcast_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(broadcast_count.is_ok());
    assert_eq!(broadcast_count.unwrap(), 0);
}

#[test]
fn test_sse_broadcast_answer() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-4".to_string();
    let from = "peer-2".to_string();
    let to = "peer-1".to_string();
    let sdp = "v=0\r\no=bob 2890844527 2890844527 IN IP4 host.biloxi.com".to_string();
    
    // Test broadcasting answer event
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_answer",
        Encode!(room_id, from, to, sdp).unwrap(),
    );
    
    assert!(result.is_ok());
    let broadcast_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(broadcast_count.is_ok());
    assert_eq!(broadcast_count.unwrap(), 0);
}

#[test]
fn test_sse_broadcast_ice_candidate() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-5".to_string();
    let from = "peer-1".to_string();
    let to = "peer-2".to_string();
    let mut candidate = std::collections::HashMap::new();
    candidate.insert("candidate".to_string(), "candidate:foundation udp 2130706431 192.168.1.1 54400 typ host generation 0".to_string());
    candidate.insert("sdpMid".to_string(), "0".to_string());
    candidate.insert("sdpMLineIndex".to_string(), "0".to_string());
    
    // Test broadcasting ICE candidate event
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_ice_candidate",
        Encode!(room_id, from, to, candidate).unwrap(),
    );
    
    assert!(result.is_ok());
    let broadcast_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(broadcast_count.is_ok());
    assert_eq!(broadcast_count.unwrap(), 0);
}

#[test]
fn test_sse_room_stats() {
    let (pic, canister_id) = setup_canister();
    
    let room_id = "test-room-6".to_string();
    
    // Test getting room stats for non-existent room
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "sse_get_room_stats",
        Encode!(room_id.clone()).unwrap(),
    );
    
    assert!(result.is_ok());
    let stats_result: Result<(usize, usize), String> = 
        Decode!(result.unwrap().bytes(), Result<(usize, usize), String>).unwrap();
    
    // Should return error for non-existent room
    assert!(stats_result.is_err());
    
    // Create a room by broadcasting an event
    let peer_id = "peer-123".to_string();
    let meta = std::collections::HashMap::new();
    
    let _broadcast_result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_broadcast_peer_joined",
        Encode!(room_id.clone(), peer_id, meta).unwrap(),
    );
    
    // Now try getting room stats again
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "sse_get_room_stats",
        Encode!(room_id).unwrap(),
    );
    
    assert!(result.is_ok());
    let stats_result: Result<(usize, usize), String> = 
        Decode!(result.unwrap().bytes(), Result<(usize, usize), String>).unwrap();
    
    assert!(stats_result.is_ok());
    let (connections, events) = stats_result.unwrap();
    assert_eq!(connections, 0); // No connections yet
    assert_eq!(events, 1); // One event was broadcast
}

#[test]
fn test_sse_cleanup_connections() {
    let (pic, canister_id) = setup_canister();
    
    // Test cleanup with no connections
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "sse_cleanup_connections",
        Encode!().unwrap(),
    );
    
    assert!(result.is_ok());
    let cleanup_count: Result<usize, String> = 
        Decode!(result.unwrap().bytes(), Result<usize, String>).unwrap();
    
    assert!(cleanup_count.is_ok());
    assert_eq!(cleanup_count.unwrap(), 0); // No connections to clean up
}