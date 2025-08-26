// Test script to verify new user flow
console.log('=== TESTING NEW USER BANK ACCOUNT FLOW ===');

// Step 1: Clear all localStorage to simulate new user
function clearAllUserData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('dhaniverse')) {
            localStorage.removeItem(key);
        }
    });
    console.log('✅ Cleared all user data');
}

// Step 2: Check progression state
function checkProgressionState() {
    try {
        // This will only work if the game is loaded
        if (window.progressionManager) {
            const state = window.progressionManager.getState();
            console.log('📊 Progression State:', state);
            
            const isNewUser = !state.hasMetMaya && !state.hasClaimedMoney && state.onboardingStep === 'not_started';
            console.log('🆕 Is New User:', isNewUser);
            
            return { state, isNewUser };
        } else {
            console.log('⚠️ ProgressionManager not available in window scope');
            
            // Manual check
            const hasMetMaya = localStorage.getItem('dhaniverse_has_met_maya') === 'true';
            const hasClaimedMoney = localStorage.getItem('dhaniverse_has_claimed_money') === 'true';
            const onboardingStep = localStorage.getItem('dhaniverse_onboarding_step') || 'not_started';
            const hasCompletedBankOnboarding = localStorage.getItem('dhaniverse_bank_onboarding_completed') === 'true';
            
            const state = { hasMetMaya, hasClaimedMoney, onboardingStep, hasCompletedBankOnboarding };
            const isNewUser = !hasMetMaya && !hasClaimedMoney && onboardingStep === 'not_started';
            
            console.log('📊 Manual Progression State:', state);
            console.log('🆕 Is New User:', isNewUser);
            
            return { state, isNewUser };
        }
    } catch (error) {
        console.error('❌ Error checking progression state:', error);
        return null;
    }
}

// Step 3: Simulate bank manager interaction
function simulateBankManagerInteraction() {
    console.log('🏦 Simulating bank manager interaction...');
    
    // Dispatch the event that the bank manager would dispatch
    window.dispatchEvent(new CustomEvent('open-bank-account-creation-flow'));
    
    console.log('📤 Dispatched open-bank-account-creation-flow event');
}

// Step 4: Monitor for account creation
function monitorAccountCreation() {
    window.addEventListener('bank-account-creation-finished', (e) => {
        console.log('✅ Account creation finished:', e.detail);
    });
    
    console.log('👂 Listening for account creation completion...');
}

// Run the test
console.log('🚀 Starting new user flow test...');
clearAllUserData();
setTimeout(() => {
    const result = checkProgressionState();
    if (result && result.isNewUser) {
        console.log('✅ Confirmed: User is detected as new user');
        monitorAccountCreation();
        setTimeout(() => {
            simulateBankManagerInteraction();
        }, 1000);
    } else {
        console.log('❌ Error: User not detected as new user');
    }
}, 500);
