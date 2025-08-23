use crate::types::*;
use crate::error::*;
use std::cell::RefCell;
// Removed unused import
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Thread-local storage for the canister state
thread_local! {
    static STATE: RefCell<CanisterState> = RefCell::new(CanisterState::default());
    
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    static USER_STORAGE: RefCell<StableBTreeMap<String, UserData, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );
    
    static SESSION_STORAGE: RefCell<StableBTreeMap<String, Web3Session, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
    
    static WALLET_STORAGE: RefCell<StableBTreeMap<String, WalletConnection, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)))
        )
    );
}

// Initialize the canister state
pub fn init_state() {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        *state = CanisterState::default();
        
        // Initialize global settings with default achievement definitions
        state.global_settings = create_default_global_settings();
    });
}

// Save state to stable storage before upgrade
pub fn save_state() {
    STATE.with(|state| {
        let state = state.borrow();
        
        // Save users to stable storage
        USER_STORAGE.with(|storage| {
            let mut storage = storage.borrow_mut();
            for (address, user_data) in &state.users {
                storage.insert(address.clone(), user_data.clone());
            }
        });
        
        // Save sessions to stable storage
        SESSION_STORAGE.with(|storage| {
            let mut storage = storage.borrow_mut();
            for (address, session) in &state.sessions {
                storage.insert(address.clone(), session.clone());
            }
        });
        
        // Save wallet connections to stable storage
        WALLET_STORAGE.with(|storage| {
            let mut storage = storage.borrow_mut();
            for (address, connection) in &state.wallet_connections {
                storage.insert(address.clone(), connection.clone());
            }
        });
    });
}

// Restore state from stable storage after upgrade
pub fn restore_state() {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        *state = CanisterState::default();
        
        // Restore users from stable storage
        USER_STORAGE.with(|storage| {
            let storage = storage.borrow();
            for (address, user_data) in storage.iter() {
                state.users.insert(address, user_data);
            }
        });
        
        // Restore sessions from stable storage
        SESSION_STORAGE.with(|storage| {
            let storage = storage.borrow();
            for (address, session) in storage.iter() {
                state.sessions.insert(address, session);
            }
        });
        
        // Restore wallet connections from stable storage
        WALLET_STORAGE.with(|storage| {
            let storage = storage.borrow();
            for (address, connection) in storage.iter() {
                state.wallet_connections.insert(address, connection);
            }
        });
        
        // Restore global settings
        state.global_settings = create_default_global_settings();
    });
}

// User data operations
pub fn get_user_data(wallet_address: &str) -> Option<UserData> {
    STATE.with(|state| {
        state.borrow().users.get(wallet_address).cloned()
    })
}

pub fn create_user_data(wallet_address: String) -> UserData {
    let user_data = UserData::new(wallet_address.clone());
    
    STATE.with(|state| {
        state.borrow_mut().users.insert(wallet_address, user_data.clone());
    });
    
    user_data
}

pub fn update_user_data(wallet_address: &str, user_data: UserData) -> CanisterResult<()> {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.users.contains_key(wallet_address) {
            state.users.insert(wallet_address.to_string(), user_data);
            Ok(())
        } else {
            Err(CanisterError::UserNotFound)
        }
    })
}

pub fn get_or_create_user_data(wallet_address: &str) -> UserData {
    match get_user_data(wallet_address) {
        Some(user_data) => user_data,
        None => create_user_data(wallet_address.to_string()),
    }
}

// Session operations
pub fn get_session(wallet_address: &str) -> Option<Web3Session> {
    STATE.with(|state| {
        state.borrow().sessions.get(wallet_address).cloned()
    })
}

pub fn create_session(session: Web3Session) {
    STATE.with(|state| {
        state.borrow_mut().sessions.insert(session.wallet_address.clone(), session);
    });
}

pub fn remove_session(wallet_address: &str) -> bool {
    STATE.with(|state| {
        state.borrow_mut().sessions.remove(wallet_address).is_some()
    })
}

pub fn update_session_activity(wallet_address: &str) -> CanisterResult<()> {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        if let Some(session) = state.sessions.get_mut(wallet_address) {
            session.last_activity = ic_cdk::api::time();
            Ok(())
        } else {
            Err(CanisterError::SessionExpired)
        }
    })
}

pub fn is_session_valid(wallet_address: &str) -> bool {
    STATE.with(|state| {
        let state = state.borrow();
        if let Some(session) = state.sessions.get(wallet_address) {
            let now = ic_cdk::api::time();
            let timeout = state.global_settings.session_timeout;
            now - session.last_activity < timeout
        } else {
            false
        }
    })
}

// Wallet connection operations
pub fn get_wallet_connection(wallet_address: &str) -> Option<WalletConnection> {
    STATE.with(|state| {
        state.borrow().wallet_connections.get(wallet_address).cloned()
    })
}

pub fn create_wallet_connection(connection: WalletConnection) {
    STATE.with(|state| {
        state.borrow_mut().wallet_connections.insert(connection.address.clone(), connection);
    });
}

pub fn remove_wallet_connection(wallet_address: &str) -> bool {
    STATE.with(|state| {
        state.borrow_mut().wallet_connections.remove(wallet_address).is_some()
    })
}

// Global settings operations
pub fn get_global_settings() -> GlobalSettings {
    STATE.with(|state| {
        state.borrow().global_settings.clone()
    })
}

pub fn get_exchange_rate() -> f64 {
    STATE.with(|state| {
        state.borrow().global_settings.exchange_rate
    })
}

// Staking APY removed

// Helper function to create default global settings
fn create_default_global_settings() -> GlobalSettings {
    let mut settings = GlobalSettings::default();
    
    // Initialize achievement definitions
    settings.achievement_definitions = vec![
        Achievement {
            id: "first_exchange".to_string(),
            title: "Currency Explorer".to_string(),
            description: "Complete your first currency exchange".to_string(),
            category: AchievementCategory::Trading,
            rarity: AchievementRarity::Common,
            unlocked: false,
            unlocked_at: None,
            reward: Some(AchievementReward {
                reward_type: "rupees".to_string(),
                amount: 1000.0,
            }),
        },
        Achievement {
            id: "big_exchange".to_string(),
            title: "High Roller".to_string(),
            description: "Exchange over 10,000 rupees in a single transaction".to_string(),
            category: AchievementCategory::Trading,
            rarity: AchievementRarity::Rare,
            unlocked: false,
            unlocked_at: None,
            reward: Some(AchievementReward {
                reward_type: "tokens".to_string(),
                amount: 50.0,
            }),
        },
// Staking achievements removed
        Achievement {
            id: "defi_master".to_string(),
            title: "DeFi Master".to_string(),
            description: "Complete all DeFi simulations".to_string(),
            category: AchievementCategory::Learning,
            rarity: AchievementRarity::Legendary,
            unlocked: false,
            unlocked_at: None,
            reward: Some(AchievementReward {
                reward_type: "tokens".to_string(),
                amount: 100.0,
            }),
        },
    ];
    
    settings
}

// Cleanup expired sessions
pub fn cleanup_expired_sessions() {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let now = ic_cdk::api::time();
        let timeout = state.global_settings.session_timeout;
        
        let expired_addresses: Vec<String> = state
            .sessions
            .iter()
            .filter(|(_, session)| now - session.last_activity >= timeout)
            .map(|(address, _)| address.clone())
            .collect();
        
        for address in expired_addresses {
            state.sessions.remove(&address);
        }
    });
}

// Get all users count (for monitoring)
pub fn get_users_count() -> usize {
    STATE.with(|state| {
        state.borrow().users.len()
    })
}

// Get active sessions count (for monitoring)
pub fn get_active_sessions_count() -> usize {
    STATE.with(|state| {
        let state = state.borrow();
        let now = ic_cdk::api::time();
        let timeout = state.global_settings.session_timeout;
        
        state
            .sessions
            .values()
            .filter(|session| now - session.last_activity < timeout)
            .count()
    })
}