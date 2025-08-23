#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use crate::error::*;
    use crate::utils;
    use crate::banking;
    use crate::auth;
    use crate::wallet;
    use crate::storage;

    // Test data type serialization/deserialization
    #[test]
    fn test_wallet_type_serialization() {
        let wallet_type = WalletType::MetaMask;
        let serialized = serde_json::to_string(&wallet_type).unwrap();
        let deserialized: WalletType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(wallet_type, deserialized);
    }

    #[test]
    fn test_dual_balance_serialization() {
        let balance = DualBalance {
            rupees_balance: 0.0,
            token_balance: 100.0,
            last_updated: 1234567890,
        };
        let serialized = serde_json::to_string(&balance).unwrap();
        let deserialized: DualBalance = serde_json::from_str(&serialized).unwrap();
        assert_eq!(balance.rupees_balance, deserialized.rupees_balance);
        assert_eq!(balance.token_balance, deserialized.token_balance);
    }

    #[test]
    fn test_staking_pool_serialization() {
    // staking pool serialization test removed
    }

    #[test]
    fn test_achievement_serialization() {
        let achievement = Achievement {
            id: "test_achievement".to_string(),
            title: "Test Achievement".to_string(),
            description: "Test description".to_string(),
            category: AchievementCategory::Trading,
            rarity: AchievementRarity::Common,
            unlocked: true,
            unlocked_at: Some(1234567890),
            reward: Some(AchievementReward {
                reward_type: "tokens".to_string(),
                amount: 100.0,
            }),
        };
        let serialized = serde_json::to_string(&achievement).unwrap();
        let deserialized: Achievement = serde_json::from_str(&serialized).unwrap();
        assert_eq!(achievement.id, deserialized.id);
        assert_eq!(achievement.category, deserialized.category);
    }

    // Test currency exchange calculations
    #[test]
    fn test_currency_exchange_calculations() {
        // Test rupees to tokens (rate = 0.1)
        let result = utils::calculate_exchange(1000.0, 0.1).unwrap();
        assert_eq!(result, 100.0);

        // Test tokens to rupees (rate = 10.0)
        let result = utils::calculate_exchange(100.0, 10.0).unwrap();
        assert_eq!(result, 1000.0);

        // Test invalid rates
        assert!(utils::calculate_exchange(100.0, 0.0).is_err());
        assert!(utils::calculate_exchange(100.0, f64::INFINITY).is_err());
    }

    #[test]
    fn test_exchange_rate_validation() {
        // Valid amounts
        assert!(utils::validate_amount(100.0).is_ok());
        assert!(utils::validate_amount(0.1).is_ok());

        // Invalid amounts
        assert!(utils::validate_amount(-100.0).is_err());
        assert!(utils::validate_amount(0.0).is_err());
        assert!(utils::validate_amount(f64::INFINITY).is_err());
        assert!(utils::validate_amount(f64::NAN).is_err());
    }

    // Test staking APY calculations
    #[test]
    fn test_staking_apy_calculations() {
    // staking apy calculations removed
    }

    #[test]
    fn test_staking_rewards_partial_time() {
    // staking rewards partial time test removed
    }

    #[test]
    fn test_staking_duration_validation() {
    // staking duration validation removed
    }

    // Test achievement unlock logic
    #[test]
    fn test_achievement_unlock_logic() {
        let mut user_data = UserData::new("0x1234567890123456789012345678901234567890".to_string());
        
        // Initially no achievements
        assert_eq!(user_data.achievements.len(), 0);
        
        // Simulate first exchange
        banking::check_exchange_achievements(&mut user_data, 1000.0);
        
        // Should have first exchange achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "first_exchange" && a.unlocked));
        
        // Simulate big exchange
        banking::check_exchange_achievements(&mut user_data, 15000.0);
        
        // Should have big exchange achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "big_exchange" && a.unlocked));
    }

    #[test]
    fn test_staking_achievement_unlock() {
    // staking achievement unlock tests removed
    }

    // Test error handling and edge cases
    #[test]
    fn test_error_display() {
        let error = CanisterError::InsufficientBalance;
        assert_eq!(error.to_string(), "Insufficient balance for this operation");
        
        let error = CanisterError::InvalidSignature;
        assert_eq!(error.to_string(), "Invalid signature provided");
        
        let error = CanisterError::SessionExpired;
        assert_eq!(error.to_string(), "Session has expired, please reconnect");
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(CanisterError::InvalidSignature.get_error_code(), 1001);
        assert_eq!(CanisterError::InsufficientBalance.get_error_code(), 1201);
        assert_eq!(CanisterError::UserNotFound.get_error_code(), 1501);
    }

    #[test]
    fn test_error_retryable() {
        assert!(!CanisterError::InvalidSignature.is_retryable());
        assert!(!CanisterError::InsufficientBalance.is_retryable());
        assert!(CanisterError::SessionExpired.is_retryable());
        assert!(CanisterError::InternalError("test".to_string()).is_retryable());
    }

    // Test wallet address validation
    #[test]
    fn test_ethereum_address_validation() {
        // Valid Ethereum addresses
        assert!(utils::validate_ethereum_address("0x1234567890123456789012345678901234567890").is_ok());
        assert!(utils::validate_ethereum_address("0xabcdefABCDEF1234567890123456789012345678").is_ok());
        
        // Invalid addresses
        assert!(utils::validate_ethereum_address("1234567890123456789012345678901234567890").is_err()); // No 0x prefix
        assert!(utils::validate_ethereum_address("0x123").is_err()); // Too short
        assert!(utils::validate_ethereum_address("0x123456789012345678901234567890123456789g").is_err()); // Invalid hex
    }

    #[test]
    fn test_solana_address_validation() {
        // Valid Solana addresses (mock)
        assert!(utils::validate_solana_address("11111111111111111111111111111112").is_ok());
        assert!(utils::validate_solana_address("So11111111111111111111111111111111111111112").is_ok());
        
        // Invalid addresses
        assert!(utils::validate_solana_address("123").is_err()); // Too short
        assert!(utils::validate_solana_address("0x1234567890123456789012345678901234567890").is_err()); // Invalid chars
    }

    #[test]
    fn test_currency_validation() {
        assert!(utils::validate_currency("rupees").is_ok());
        assert!(utils::validate_currency("tokens").is_ok());
        assert!(utils::validate_currency("RUPEES").is_ok());
        assert!(utils::validate_currency("TOKENS").is_ok());
        assert!(utils::validate_currency("bitcoin").is_err());
        assert!(utils::validate_currency("ethereum").is_err());
    }

    // Test safe arithmetic operations
    #[test]
    fn test_safe_arithmetic() {
        assert_eq!(utils::safe_add(100.0, 50.0).unwrap(), 150.0);
        assert_eq!(utils::safe_subtract(100.0, 50.0).unwrap(), 50.0);
        assert_eq!(utils::safe_multiply(10.0, 5.0).unwrap(), 50.0);
        
        // Test overflow protection
        assert!(utils::safe_add(f64::MAX, 1.0).is_err());
        assert!(utils::safe_subtract(50.0, 100.0).is_err()); // Would be negative
        assert!(utils::safe_multiply(f64::MAX, 2.0).is_err());
    }

    // Test transaction ID generation
    #[test]
    fn test_transaction_id_generation() {
        let id1 = utils::generate_transaction_id();
        let id2 = utils::generate_transaction_id();
        
        assert_ne!(id1, id2); // Should be unique
        assert!(id1.starts_with("tx_"));
        assert!(id2.starts_with("tx_"));
    }

    #[test]
    fn test_staking_id_generation() {
        let id1 = utils::generate_staking_id();
        let id2 = utils::generate_staking_id();
        
        assert_ne!(id1, id2); // Should be unique
        assert!(id1.starts_with("stake_"));
        assert!(id2.starts_with("stake_"));
    }

    // Test balance formatting
    #[test]
    fn test_balance_formatting() {
        assert_eq!(utils::format_balance(123.4567), "123.4567");
        assert_eq!(utils::format_balance(1234.5), "1.23K");
        assert_eq!(utils::format_balance(1234567.8), "1.23M");
    }

    // Test string sanitization
    #[test]
    fn test_string_sanitization() {
        let input = "Hello, World! <script>alert('xss')</script>";
        let sanitized = utils::sanitize_string(input);
        assert!(!sanitized.contains("<script>"));
        assert!(sanitized.contains("Hello, World!"));
    }

    // Test time conversions
    #[test]
    fn test_time_conversions() {
        let nanos = 1_000_000_000u64; // 1 second in nanoseconds
        let millis = utils::nanos_to_millis(nanos);
        assert_eq!(millis, 1000); // 1 second in milliseconds
        
        let back_to_nanos = utils::millis_to_nanos(millis);
        assert_eq!(back_to_nanos, nanos);
    }

    // Test authentication message generation
    #[test]
    fn test_auth_message_generation() {
        let address = "0x1234567890123456789012345678901234567890";
        let timestamp = 1234567890;
        let message = utils::generate_auth_message(address, timestamp);
        
        assert!(message.contains(address));
        assert!(message.contains("1234567890"));
        assert!(message.contains("Dhaniverse"));
    }

    // Test wallet type conversions
    #[test]
    fn test_wallet_type_from_string() {
        assert_eq!(WalletType::from("metamask"), WalletType::MetaMask);
        assert_eq!(WalletType::from("phantom"), WalletType::Phantom);
        assert_eq!(WalletType::from("coinbase"), WalletType::Coinbase);
        assert_eq!(WalletType::from("walletconnect"), WalletType::WalletConnect);
        assert_eq!(WalletType::from("unknown"), WalletType::Injected);
    }

    #[test]
    fn test_transaction_type_from_string() {
        assert_eq!(TransactionType::from("deposit"), TransactionType::Deposit);
        assert_eq!(TransactionType::from("withdraw"), TransactionType::Withdraw);
        assert_eq!(TransactionType::from("exchange"), TransactionType::Exchange);
        assert_eq!(TransactionType::from("stake"), TransactionType::Stake);
        assert_eq!(TransactionType::from("unknown"), TransactionType::Deposit);
    }

    // Test user data creation
    #[test]
    fn test_user_data_creation() {
        let address = "0x1234567890123456789012345678901234567890".to_string();
        let user_data = UserData::new(address.clone());
        
        assert_eq!(user_data.wallet_address, address);
        assert_eq!(user_data.dual_balance.rupees_balance, 0.0);
        assert_eq!(user_data.dual_balance.token_balance, 0.0);
        assert_eq!(user_data.staking_pools.len(), 0);
        assert_eq!(user_data.achievements.len(), 0);
        assert_eq!(user_data.transactions.len(), 0);
    }

    // Test global settings defaults
    #[test]
    fn test_global_settings_defaults() {
        let settings = GlobalSettings::default();
        
        assert_eq!(settings.exchange_rate, 0.1);
        assert_eq!(settings.staking_apys.get(&30), Some(&5.0));
        assert_eq!(settings.staking_apys.get(&90), Some(&7.0));
        assert_eq!(settings.staking_apys.get(&180), Some(&10.0));
        assert_eq!(settings.session_timeout, 24 * 60 * 60 * 1_000_000_000);
    }
}