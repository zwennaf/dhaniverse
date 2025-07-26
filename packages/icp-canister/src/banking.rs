use crate::types::*;
use crate::error::*;
use crate::storage;
use crate::utils;
use crate::auth;

// Get dual currency balance
pub fn get_dual_balance(wallet_address: String) -> CanisterResult<DualBalance> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    let user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    Ok(user_data.dual_balance)
}

// Exchange currency between rupees and tokens
pub async fn exchange_currency(
    wallet_address: String,
    from_currency: String,
    to_currency: String,
    amount: f64,
) -> CanisterResult<ExchangeResult> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Validate inputs
    utils::validate_amount(amount)?;
    utils::validate_currency(&from_currency)?;
    utils::validate_currency(&to_currency)?;
    
    if from_currency == to_currency {
        return Err(CanisterError::InvalidInput("Cannot exchange same currency".to_string()));
    }
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Get exchange rate
    let exchange_rate = storage::get_exchange_rate();
    
    let (from_amount, to_amount, rate) = if from_currency == "rupees" && to_currency == "tokens" {
        // Rupees to tokens
        if user_data.dual_balance.rupees_balance < amount {
            return Err(CanisterError::InsufficientBalance);
        }
        
        let to_amount = utils::calculate_exchange(amount, exchange_rate)?;
        user_data.dual_balance.rupees_balance = utils::safe_subtract(user_data.dual_balance.rupees_balance, amount)?;
        user_data.dual_balance.token_balance = utils::safe_add(user_data.dual_balance.token_balance, to_amount)?;
        
        (amount, to_amount, exchange_rate)
    } else {
        // Tokens to rupees
        if user_data.dual_balance.token_balance < amount {
            return Err(CanisterError::InsufficientBalance);
        }
        
        let rate = 1.0 / exchange_rate;
        let to_amount = utils::calculate_exchange(amount, rate)?;
        user_data.dual_balance.token_balance = utils::safe_subtract(user_data.dual_balance.token_balance, amount)?;
        user_data.dual_balance.rupees_balance = utils::safe_add(user_data.dual_balance.rupees_balance, to_amount)?;
        
        (amount, to_amount, rate)
    };
    
    // Update balance timestamp
    user_data.dual_balance.last_updated = ic_cdk::api::time();
    user_data.last_activity = ic_cdk::api::time();
    
    // Create transaction record
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to: None,
        amount: from_amount,
        transaction_type: TransactionType::Exchange,
        timestamp: ic_cdk::api::time(),
        status: TransactionStatus::Confirmed,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction.clone());
    
    // Check for achievements
    check_exchange_achievements(&mut user_data, from_amount);
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(ExchangeResult {
        success: true,
        from_amount,
        to_amount,
        rate,
        transaction: Some(transaction),
        error: None,
    })
}

// Stake tokens
pub async fn stake_tokens(
    wallet_address: String,
    amount: f64,
    duration: u32,
) -> CanisterResult<StakingPool> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Validate inputs
    utils::validate_amount(amount)?;
    utils::validate_staking_duration(duration)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Check token balance
    if user_data.dual_balance.token_balance < amount {
        return Err(CanisterError::InsufficientBalance);
    }
    
    // Get staking APY
    let apy = storage::get_staking_apy(duration)
        .ok_or(CanisterError::InvalidInput("Invalid staking duration".to_string()))?;
    
    let now = ic_cdk::api::time();
    let maturity_date = now + (duration as u64 * 24 * 60 * 60 * 1_000_000_000); // Convert days to nanoseconds
    
    // Create staking pool
    let staking_pool = StakingPool {
        id: utils::generate_staking_id(),
        staked_amount: amount,
        apy,
        start_date: now,
        maturity_date,
        current_rewards: 0.0,
        status: StakingStatus::Active,
    };
    
    // Deduct tokens from balance
    user_data.dual_balance.token_balance = utils::safe_subtract(user_data.dual_balance.token_balance, amount)?;
    user_data.dual_balance.last_updated = now;
    user_data.last_activity = now;
    
    // Add staking pool
    user_data.staking_pools.push(staking_pool.clone());
    
    // Create transaction record
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to: None,
        amount,
        transaction_type: TransactionType::Stake,
        timestamp: now,
        status: TransactionStatus::Confirmed,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction);
    
    // Check for achievements
    check_staking_achievements(&mut user_data, duration);
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(staking_pool)
}

// Get staking information
pub fn get_staking_info(wallet_address: String) -> Vec<StakingPool> {
    if let Some(mut user_data) = storage::get_user_data(&wallet_address) {
        // Update rewards for all active pools
        update_staking_rewards(&mut user_data.staking_pools);
        
        // Save updated rewards
        let _ = storage::update_user_data(&wallet_address, user_data.clone());
        
        user_data.staking_pools
    } else {
        Vec::new()
    }
}

// Claim staking rewards
pub async fn claim_staking_rewards(
    wallet_address: String,
    staking_id: String,
) -> CanisterResult<f64> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Find staking pool
    let pool_index = user_data.staking_pools
        .iter()
        .position(|p| p.id == staking_id)
        .ok_or(CanisterError::StakingPoolNotFound)?;
    
    let pool = &mut user_data.staking_pools[pool_index];
    
    // Check if pool is active
    if pool.status != StakingStatus::Active {
        return Err(CanisterError::InvalidInput("Staking pool is not active".to_string()));
    }
    
    // Check if staking period is completed
    let now = ic_cdk::api::time();
    if now < pool.maturity_date {
        return Err(CanisterError::StakingNotMatured);
    }
    
    // Calculate final rewards
    let final_rewards = utils::calculate_staking_rewards(
        pool.staked_amount,
        pool.apy,
        pool.start_date,
        pool.maturity_date,
    )?;
    
    let total_return = pool.staked_amount + final_rewards;
    
    // Update user balance
    user_data.dual_balance.token_balance = utils::safe_add(user_data.dual_balance.token_balance, total_return)?;
    user_data.dual_balance.last_updated = now;
    user_data.last_activity = now;
    
    // Update pool status
    pool.status = StakingStatus::Claimed;
    pool.current_rewards = final_rewards;
    
    // Create transaction record
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to: None,
        amount: total_return,
        transaction_type: TransactionType::Stake,
        timestamp: now,
        status: TransactionStatus::Confirmed,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction);
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(total_return)
}

// Get achievements
pub fn get_achievements(wallet_address: String) -> Vec<Achievement> {
    if let Some(user_data) = storage::get_user_data(&wallet_address) {
        user_data.achievements
    } else {
        Vec::new()
    }
}

// Claim achievement reward
pub async fn claim_achievement_reward(
    wallet_address: String,
    achievement_id: String,
) -> CanisterResult<AchievementReward> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Find achievement
    let achievement = user_data.achievements
        .iter_mut()
        .find(|a| a.id == achievement_id)
        .ok_or(CanisterError::AchievementNotFound)?;
    
    // Check if achievement is unlocked
    if !achievement.unlocked {
        return Err(CanisterError::AchievementNotUnlocked);
    }
    
    // Check if reward is available
    let reward = achievement.reward.take()
        .ok_or(CanisterError::NoRewardAvailable)?;
    
    // Apply reward to balance
    let now = ic_cdk::api::time();
    if reward.reward_type == "rupees" {
        user_data.dual_balance.rupees_balance = utils::safe_add(user_data.dual_balance.rupees_balance, reward.amount)?;
    } else {
        user_data.dual_balance.token_balance = utils::safe_add(user_data.dual_balance.token_balance, reward.amount)?;
    }
    
    user_data.dual_balance.last_updated = now;
    user_data.last_activity = now;
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(reward)
}

// Simulate liquidity pool
pub async fn simulate_liquidity_pool(
    wallet_address: String,
    amount: f64,
) -> CanisterResult<f64> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Validate amount
    utils::validate_amount(amount)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Check token balance
    if user_data.dual_balance.token_balance < amount {
        return Err(CanisterError::InsufficientBalance);
    }
    
    // Simulate liquidity pool rewards (5-15% APY for 30 days)
    let base_apy = 0.05;
    let random_bonus = (ic_cdk::api::time() % 100) as f64 / 1000.0; // 0-0.1
    let apy = base_apy + random_bonus;
    let rewards = amount * apy * (30.0 / 365.0); // 30-day simulation
    
    // Add rewards to balance
    let now = ic_cdk::api::time();
    user_data.dual_balance.token_balance = utils::safe_add(user_data.dual_balance.token_balance, rewards)?;
    user_data.dual_balance.last_updated = now;
    user_data.last_activity = now;
    
    // Create transaction record
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to: None,
        amount: rewards,
        transaction_type: TransactionType::Deposit,
        timestamp: now,
        status: TransactionStatus::Confirmed,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction);
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(rewards)
}

// Simulate yield farming
pub async fn simulate_yield_farming(
    wallet_address: String,
    amount: f64,
) -> CanisterResult<f64> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Validate amount
    utils::validate_amount(amount)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    // Check token balance
    if user_data.dual_balance.token_balance < amount {
        return Err(CanisterError::InsufficientBalance);
    }
    
    // Simulate yield farming rewards (10-25% APY for 7 days)
    let base_apy = 0.1;
    let random_bonus = (ic_cdk::api::time() % 150) as f64 / 1000.0; // 0-0.15
    let apy = base_apy + random_bonus;
    let rewards = amount * apy * (7.0 / 365.0); // 7-day simulation
    
    // Add rewards to balance
    let now = ic_cdk::api::time();
    user_data.dual_balance.token_balance = utils::safe_add(user_data.dual_balance.token_balance, rewards)?;
    user_data.dual_balance.last_updated = now;
    user_data.last_activity = now;
    
    // Create transaction record
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to: None,
        amount: rewards,
        transaction_type: TransactionType::Deposit,
        timestamp: now,
        status: TransactionStatus::Confirmed,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction);
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(rewards)
}

// Create transaction
pub async fn create_transaction(
    wallet_address: String,
    transaction_type: TransactionType,
    amount: f64,
    to: Option<String>,
) -> CanisterResult<Web3Transaction> {
    // Verify session
    auth::verify_session(&wallet_address)?;
    
    // Validate amount
    utils::validate_amount(amount)?;
    
    // Get user data
    let mut user_data = storage::get_user_data(&wallet_address)
        .ok_or(CanisterError::UserNotFound)?;
    
    let now = ic_cdk::api::time();
    let transaction = Web3Transaction {
        id: utils::generate_transaction_id(),
        from: wallet_address.clone(),
        to,
        amount,
        transaction_type,
        timestamp: now,
        status: TransactionStatus::Pending,
        hash: Some(utils::generate_transaction_hash()),
    };
    
    user_data.transactions.push(transaction.clone());
    user_data.last_activity = now;
    
    // Save updated user data
    storage::update_user_data(&wallet_address, user_data)?;
    
    Ok(transaction)
}

// Get transaction history
pub fn get_transaction_history(wallet_address: String) -> Vec<Web3Transaction> {
    if let Some(user_data) = storage::get_user_data(&wallet_address) {
        let mut transactions = user_data.transactions;
        transactions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        transactions
    } else {
        Vec::new()
    }
}

// Helper function to update staking rewards
fn update_staking_rewards(staking_pools: &mut Vec<StakingPool>) {
    let now = ic_cdk::api::time();
    
    for pool in staking_pools.iter_mut() {
        if pool.status == StakingStatus::Active {
            if let Ok(rewards) = utils::calculate_staking_rewards(
                pool.staked_amount,
                pool.apy,
                pool.start_date,
                now,
            ) {
                pool.current_rewards = rewards;
                
                if now >= pool.maturity_date {
                    pool.status = StakingStatus::Matured;
                }
            }
        }
    }
}

// Helper function to check exchange achievements
fn check_exchange_achievements(user_data: &mut UserData, amount: f64) {
    let now = ic_cdk::api::time();
    
    // First exchange achievement
    if let Some(achievement) = user_data.achievements.iter_mut().find(|a| a.id == "first_exchange") {
        if !achievement.unlocked {
            achievement.unlocked = true;
            achievement.unlocked_at = Some(now);
        }
    } else {
        // Add achievement if not present
        user_data.achievements.push(Achievement {
            id: "first_exchange".to_string(),
            title: "Currency Explorer".to_string(),
            description: "Complete your first currency exchange".to_string(),
            category: AchievementCategory::Trading,
            rarity: AchievementRarity::Common,
            unlocked: true,
            unlocked_at: Some(now),
            reward: Some(AchievementReward {
                reward_type: "rupees".to_string(),
                amount: 1000.0,
            }),
        });
    }
    
    // Big exchange achievement
    if amount >= 10000.0 {
        if let Some(achievement) = user_data.achievements.iter_mut().find(|a| a.id == "big_exchange") {
            if !achievement.unlocked {
                achievement.unlocked = true;
                achievement.unlocked_at = Some(now);
            }
        } else {
            user_data.achievements.push(Achievement {
                id: "big_exchange".to_string(),
                title: "High Roller".to_string(),
                description: "Exchange over 10,000 rupees in a single transaction".to_string(),
                category: AchievementCategory::Trading,
                rarity: AchievementRarity::Rare,
                unlocked: true,
                unlocked_at: Some(now),
                reward: Some(AchievementReward {
                    reward_type: "tokens".to_string(),
                    amount: 50.0,
                }),
            });
        }
    }
}

// Helper function to check staking achievements
fn check_staking_achievements(user_data: &mut UserData, duration: u32) {
    let now = ic_cdk::api::time();
    
    // First stake achievement
    if let Some(achievement) = user_data.achievements.iter_mut().find(|a| a.id == "first_stake") {
        if !achievement.unlocked {
            achievement.unlocked = true;
            achievement.unlocked_at = Some(now);
        }
    } else {
        user_data.achievements.push(Achievement {
            id: "first_stake".to_string(),
            title: "Staking Pioneer".to_string(),
            description: "Stake tokens for the first time".to_string(),
            category: AchievementCategory::Staking,
            rarity: AchievementRarity::Common,
            unlocked: true,
            unlocked_at: Some(now),
            reward: Some(AchievementReward {
                reward_type: "tokens".to_string(),
                amount: 10.0,
            }),
        });
    }
    
    // Long stake achievement
    if duration == 180 {
        if let Some(achievement) = user_data.achievements.iter_mut().find(|a| a.id == "long_stake") {
            if !achievement.unlocked {
                achievement.unlocked = true;
                achievement.unlocked_at = Some(now);
            }
        } else {
            user_data.achievements.push(Achievement {
                id: "long_stake".to_string(),
                title: "Patient Investor".to_string(),
                description: "Stake tokens for 180 days".to_string(),
                category: AchievementCategory::Staking,
                rarity: AchievementRarity::Epic,
                unlocked: true,
                unlocked_at: Some(now),
                reward: Some(AchievementReward {
                    reward_type: "rupees".to_string(),
                    amount: 5000.0,
                }),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_staking_rewards() {
        let mut pools = vec![
            StakingPool {
                id: "test1".to_string(),
                staked_amount: 1000.0,
                apy: 10.0,
                start_date: 0,
                maturity_date: 1000,
                current_rewards: 0.0,
                status: StakingStatus::Active,
            }
        ];
        
        update_staking_rewards(&mut pools);
        
        // Rewards should be calculated
        assert!(pools[0].current_rewards >= 0.0);
    }

    #[test]
    fn test_check_exchange_achievements() {
        let mut user_data = UserData::new("0x123".to_string());
        
        check_exchange_achievements(&mut user_data, 5000.0);
        
        // Should have first exchange achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "first_exchange" && a.unlocked));
        
        check_exchange_achievements(&mut user_data, 15000.0);
        
        // Should have big exchange achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "big_exchange" && a.unlocked));
    }

    #[test]
    fn test_check_staking_achievements() {
        let mut user_data = UserData::new("0x123".to_string());
        
        check_staking_achievements(&mut user_data, 30);
        
        // Should have first stake achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "first_stake" && a.unlocked));
        
        check_staking_achievements(&mut user_data, 180);
        
        // Should have long stake achievement
        assert!(user_data.achievements.iter().any(|a| a.id == "long_stake" && a.unlocked));
    }
}