/**
 * Schema Migration Test Script
 * 
 * Run this script to test the schema migration system without affecting production data.
 * Tests various migration scenarios to ensure robustness.
 */

import { 
  migratePlayerState, 
  isSchemaOutdated, 
  validateMigratedState,
  logMigrationChanges,
  CURRENT_SCHEMA_VERSION
} from './schemaMigration.ts';

import type { PlayerStateDocument } from '../db/schemas.ts';

// Test data fixtures
const createLegacyUser = (): PlayerStateDocument => ({
  userId: 'test_legacy_user',
  position: { x: 500, y: 500, scene: 'main' },
  financial: {
    rupees: 1000,
    totalWealth: 1000,
    bankBalance: 0,
    stockPortfolioValue: 0
  },
  inventory: {
    items: [],
    capacity: 20
  },
  progress: {
    level: 3,
    experience: 150,
    unlockedBuildings: ['bank', 'stockmarket'],
    completedTutorials: ['starter-claimed']
  },
  // No onboarding object - simulates very old user
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    autoSave: true
  },
  lastUpdated: new Date('2024-01-01')
} as PlayerStateDocument);

const createPartialSchemaUser = (): PlayerStateDocument => ({
  userId: 'test_partial_user',
  position: { x: 600, y: 600, scene: 'main' },
  financial: {
    rupees: 2000,
    totalWealth: 2000,
    bankBalance: 0,
    stockPortfolioValue: 0
  },
  inventory: {
    items: [],
    capacity: 20
  },
  progress: {
    level: 5,
    experience: 300,
    unlockedBuildings: ['bank', 'stockmarket'],
    completedTutorials: ['starter-claimed']
  },
  onboarding: {
    hasMetMaya: true,
    hasFollowedMaya: true,
    hasClaimedMoney: true,
    onboardingStep: 'claimed_money',
    unlockedBuildings: { bank: true, atm: false, stockmarket: false }
    // Missing: hasCompletedBankOnboarding, hasReachedStockMarket, client fields, mayaPosition
  },
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    autoSave: true
  },
  lastUpdated: new Date('2025-08-01')
} as PlayerStateDocument);

const createCurrentSchemaUser = (): PlayerStateDocument => ({
  userId: 'test_current_user',
  position: { x: 700, y: 700, scene: 'main' },
  financial: {
    rupees: 5000,
    totalWealth: 5000,
    bankBalance: 0,
    stockPortfolioValue: 0
  },
  inventory: {
    items: [],
    capacity: 20
  },
  progress: {
    level: 10,
    experience: 500,
    unlockedBuildings: ['bank', 'stockmarket'],
    completedTutorials: ['starter-claimed']
  },
  onboarding: {
    hasMetMaya: true,
    hasFollowedMaya: true,
    hasClaimedMoney: true,
    hasCompletedBankOnboarding: true,
    hasReachedStockMarket: false,
    onboardingStep: 'bank_onboarding_completed',
    unlockedBuildings: { bank: true, atm: false, stockmarket: true },
    bankOnboardingComplete: true,
    stockMarketOnboardingComplete: false,
    mayaPosition: { x: 9415, y: 6297 }
  },
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    autoSave: true
  },
  schemaVersion: CURRENT_SCHEMA_VERSION,
  hasCompletedTutorial: true,
  lastUpdated: new Date()
});

// Test runner
function runTests() {
  console.log('🧪 Starting Schema Migration Tests\n');
  console.log('='.repeat(80));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Legacy User Migration
  console.log('\n📋 Test 1: Legacy User Migration');
  console.log('-'.repeat(80));
  totalTests++;
  try {
    const legacyUser = createLegacyUser();
    const extendedLegacy = legacyUser as PlayerStateDocument & { schemaVersion?: number; starterClaimed?: boolean };
    console.log('Initial state:', {
      hasOnboarding: !!legacyUser.onboarding,
      schemaVersion: extendedLegacy.schemaVersion,
      starterClaimed: extendedLegacy.starterClaimed
    });
    
    const isOutdated = isSchemaOutdated(legacyUser);
    console.log('Is outdated?', isOutdated);
    
    if (!isOutdated) {
      throw new Error('Legacy user should be detected as outdated');
    }
    
    const { migrated, changes, needsUpdate } = migratePlayerState(legacyUser);
    
    console.log('\nChanges detected:', changes.length);
    logMigrationChanges(legacyUser.userId, changes);
    
    if (!needsUpdate) {
      throw new Error('Legacy user should need update');
    }
    
    const isValid = validateMigratedState(migrated);
    console.log('Validation result:', isValid);
    
    if (!isValid) {
      throw new Error('Migrated state validation failed');
    }
    
    // Check key fields
    if (!migrated.onboarding) {
      throw new Error('Onboarding object not created');
    }
    
    if (migrated.onboarding.hasClaimedMoney !== true) {
      throw new Error('Legacy user should have hasClaimedMoney=true');
    }
    
    if (!migrated.onboarding.mayaPosition) {
      throw new Error('mayaPosition not added');
    }
    
    console.log('✅ Test 1 PASSED');
    passedTests++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test 1 FAILED:', errorMessage);
  }
  
  // Test 2: Partial Schema User Migration
  console.log('\n📋 Test 2: Partial Schema User Migration');
  console.log('-'.repeat(80));
  totalTests++;
  try {
    const partialUser = createPartialSchemaUser();
    console.log('Initial state:', {
      hasOnboarding: !!partialUser.onboarding,
      hasCompletedBankOnboarding: partialUser.onboarding?.hasCompletedBankOnboarding,
      mayaPosition: partialUser.onboarding?.mayaPosition
    });
    
    const isOutdated = isSchemaOutdated(partialUser);
    console.log('Is outdated?', isOutdated);
    
    if (!isOutdated) {
      throw new Error('Partial schema user should be detected as outdated');
    }
    
    const { migrated, changes, needsUpdate } = migratePlayerState(partialUser);
    
    console.log('\nChanges detected:', changes.length);
    logMigrationChanges(partialUser.userId, changes);
    
    if (!needsUpdate) {
      throw new Error('Partial schema user should need update');
    }
    
    const isValid = validateMigratedState(migrated);
    console.log('Validation result:', isValid);
    
    if (!isValid) {
      throw new Error('Migrated state validation failed');
    }
    
    // Check that existing progress was preserved
    if (migrated.onboarding!.hasClaimedMoney !== true) {
      throw new Error('Existing progress not preserved');
    }
    
    // Check that new fields were added
    if (migrated.onboarding!.hasCompletedBankOnboarding === undefined) {
      throw new Error('hasCompletedBankOnboarding not added');
    }
    
    if (!migrated.onboarding!.mayaPosition) {
      throw new Error('mayaPosition not added');
    }
    
    // Check client fields
    if (migrated.onboarding!.bankOnboardingComplete === undefined) {
      throw new Error('bankOnboardingComplete not added');
    }
    
    console.log('✅ Test 2 PASSED');
    passedTests++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test 2 FAILED:', errorMessage);
  }
  
  // Test 3: Current Schema User (No Migration Needed)
  console.log('\n📋 Test 3: Current Schema User (No Migration Needed)');
  console.log('-'.repeat(80));
  totalTests++;
  try {
    const currentUser = createCurrentSchemaUser();
    const extendedUser = currentUser as PlayerStateDocument & { schemaVersion?: number };
    console.log('Initial state:', {
      schemaVersion: extendedUser.schemaVersion,
      hasAllFields: !!currentUser.onboarding?.mayaPosition
    });
    
    const isOutdated = isSchemaOutdated(currentUser);
    console.log('Is outdated?', isOutdated);
    
    if (isOutdated) {
      throw new Error('Current schema user should NOT be detected as outdated');
    }
    
    console.log('✅ Test 3 PASSED (No migration needed, as expected)');
    passedTests++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test 3 FAILED:', errorMessage);
  }
  
  // Test 4: Field Synchronization
  console.log('\n📋 Test 4: Field Synchronization (Client ↔ Server)');
  console.log('-'.repeat(80));
  totalTests++;
  try {
    const unsyncedUser = createPartialSchemaUser();
    // Manually add fields with inconsistency
    if (unsyncedUser.onboarding) {
      unsyncedUser.onboarding.hasCompletedBankOnboarding = true;
      unsyncedUser.onboarding.bankOnboardingComplete = false; // Inconsistent!
    }
    
    const { migrated } = migratePlayerState(unsyncedUser);
    
    // Check that sync happened (TRUE value wins)
    if (migrated.onboarding!.bankOnboardingComplete !== migrated.onboarding!.hasCompletedBankOnboarding) {
      throw new Error('Field synchronization failed');
    }
    
    if (migrated.onboarding!.bankOnboardingComplete !== true) {
      throw new Error('Both fields should be true (completion is permanent)');
    }
    
    console.log('Field sync result:', {
      hasCompletedBankOnboarding: migrated.onboarding!.hasCompletedBankOnboarding,
      bankOnboardingComplete: migrated.onboarding!.bankOnboardingComplete,
      synced: migrated.onboarding!.bankOnboardingComplete === migrated.onboarding!.hasCompletedBankOnboarding
    });
    
    console.log('✅ Test 4 PASSED');
    passedTests++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test 4 FAILED:', errorMessage);
  }
  
  // Test 5: Maya Position Inference
  console.log('\n📋 Test 5: Maya Position Inference');
  console.log('-'.repeat(80));
  totalTests++;
  try {
    // Test default position
    const newUser = createPartialSchemaUser();
    newUser.onboarding = {
      hasMetMaya: false,
      hasFollowedMaya: false,
      hasClaimedMoney: false,
      onboardingStep: 'not_started',
      unlockedBuildings: {}
    };
    
    const { migrated: migratedNew } = migratePlayerState(newUser);
    if (!migratedNew.onboarding!.mayaPosition) {
      throw new Error('mayaPosition not set for new user');
    }
    if (migratedNew.onboarding!.mayaPosition.x !== 7779 || migratedNew.onboarding!.mayaPosition.y !== 3581) {
      throw new Error('Default position incorrect');
    }
    console.log('✓ Default position correct:', migratedNew.onboarding!.mayaPosition);
    
    // Test bank position
    const bankUser = createPartialSchemaUser();
    bankUser.onboarding!.hasFollowedMaya = true;
    const { migrated: migratedBank } = migratePlayerState(bankUser);
    if (migratedBank.onboarding!.mayaPosition!.x !== 9415 || migratedBank.onboarding!.mayaPosition!.y !== 6297) {
      throw new Error('Bank position incorrect');
    }
    console.log('✓ Bank position correct:', migratedBank.onboarding!.mayaPosition);
    
    // Test stock market position
    const stockUser = createPartialSchemaUser();
    stockUser.onboarding!.hasReachedStockMarket = true;
    const { migrated: migratedStock } = migratePlayerState(stockUser);
    if (migratedStock.onboarding!.mayaPosition!.x !== 2598 || migratedStock.onboarding!.mayaPosition!.y !== 3736) {
      throw new Error('Stock market position incorrect');
    }
    console.log('✓ Stock market position correct:', migratedStock.onboarding!.mayaPosition);
    
    console.log('✅ Test 5 PASSED');
    passedTests++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test 5 FAILED:', errorMessage);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ ALL TESTS PASSED! Migration system is working correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the errors above.');
  }
  
  console.log('='.repeat(80));
}

// Run tests if executed directly
if (import.meta.main) {
  runTests();
}

export { runTests };
