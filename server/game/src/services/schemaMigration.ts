/**
 * Schema Migration Service (SERVER-SIDE ONLY)
 * 
 * Handles automatic schema synchronization for old users' data at the DATABASE level.
 * Ensures all users have the latest schema structure without data loss.
 * 
 * NOTE: This runs ONCE per user on the server when loading from MongoDB.
 *       Client-side field syncing (runtime) is handled by ProgressionManager.ts
 * 
 * @module SchemaMigration
 * @created 2025-10-06
 * @updated 2025-10-06 - Added clarification about server vs client responsibilities
 */

import { PlayerStateDocument } from "../db/schemas.ts";

/**
 * Extended PlayerState type with migration fields
 */
interface ExtendedPlayerState extends PlayerStateDocument {
  schemaVersion?: number;
  starterClaimed?: boolean; // Legacy field
}

/**
 * Current schema version
 * Increment this when schema changes require migration
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Default onboarding state that all users should have
 */
export const DEFAULT_ONBOARDING_STATE = {
  hasMetMaya: false,
  hasFollowedMaya: false,
  hasClaimedMoney: false,
  hasCompletedBankOnboarding: false,
  hasReachedStockMarket: false,
  onboardingStep: 'not_started' as const,
  unlockedBuildings: { bank: false, atm: false, stockmarket: false },
  mayaPosition: { x: 7779, y: 3581 }, // Default Maya spawn position
  bankOnboardingComplete: false, // Client-side field for compatibility
  stockMarketOnboardingComplete: false, // Client-side field for compatibility
};

/**
 * Detects if a player's schema is outdated
 */
export function isSchemaOutdated(playerState: PlayerStateDocument): boolean {
  const extended = playerState as ExtendedPlayerState;
  const schemaVersion = extended.schemaVersion ?? 0;
  return schemaVersion < CURRENT_SCHEMA_VERSION;
}

/**
 * Migrates old user data to match the current schema
 * Preserves all existing progress while adding missing fields
 */
export function migratePlayerState(playerState: PlayerStateDocument): {
  migrated: PlayerStateDocument;
  changes: string[];
  needsUpdate: boolean;
} {
  const changes: string[] = [];
  let needsUpdate = false;

  // Deep clone to avoid mutation
  const migrated = JSON.parse(JSON.stringify(playerState)) as ExtendedPlayerState;

  // Add schema version tracking
  if (!migrated.schemaVersion) {
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    changes.push('Added schema version tracking');
    needsUpdate = true;
  } else if (migrated.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const oldVersion = migrated.schemaVersion;
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    changes.push(`Updated schema version from ${oldVersion} to ${CURRENT_SCHEMA_VERSION}`);
    needsUpdate = true;
  }

  // Check for legacy starterClaimed flag
  const legacyStarterClaimed = 
    migrated.starterClaimed === true || 
    migrated.progress?.completedTutorials?.includes('starter-claimed');

  // Initialize or backfill onboarding object
  if (!migrated.onboarding) {
    migrated.onboarding = {
      ...DEFAULT_ONBOARDING_STATE,
      // If legacy user had claimed starter, mark initial progression as complete
      hasMetMaya: legacyStarterClaimed,
      hasFollowedMaya: legacyStarterClaimed,
      hasClaimedMoney: legacyStarterClaimed,
      onboardingStep: legacyStarterClaimed ? 'claimed_money' : 'not_started',
      unlockedBuildings: { 
        bank: legacyStarterClaimed, 
        atm: false, 
        stockmarket: false 
      },
    };
    changes.push('Created onboarding object from legacy data');
    needsUpdate = true;
  } else {
    // Backfill missing onboarding fields
    const onboarding = migrated.onboarding;

    // Add missing boolean flags
    if (onboarding.hasCompletedBankOnboarding === undefined) {
      onboarding.hasCompletedBankOnboarding = false;
      changes.push('Added hasCompletedBankOnboarding field');
      needsUpdate = true;
    }

    if (onboarding.hasReachedStockMarket === undefined) {
      onboarding.hasReachedStockMarket = false;
      changes.push('Added hasReachedStockMarket field');
      needsUpdate = true;
    }

    // Add client-side compatibility fields (bankOnboardingComplete, stockMarketOnboardingComplete)
    if (onboarding.bankOnboardingComplete === undefined) {
      onboarding.bankOnboardingComplete = onboarding.hasCompletedBankOnboarding ?? false;
      changes.push('Added bankOnboardingComplete field for client compatibility');
      needsUpdate = true;
    }

    if (onboarding.stockMarketOnboardingComplete === undefined) {
      onboarding.stockMarketOnboardingComplete = onboarding.hasReachedStockMarket ?? false;
      changes.push('Added stockMarketOnboardingComplete field for client compatibility');
      needsUpdate = true;
    }

    // Sync client/server field inconsistencies - PREFER TRUE (completed) VALUES
    // If either field is true, both should be true (completion is permanent)
    if (onboarding.bankOnboardingComplete !== onboarding.hasCompletedBankOnboarding) {
      const correctValue = onboarding.bankOnboardingComplete || onboarding.hasCompletedBankOnboarding || false;
      onboarding.bankOnboardingComplete = correctValue;
      onboarding.hasCompletedBankOnboarding = correctValue;
      changes.push(`Synchronized bank onboarding fields to: ${correctValue}`);
      needsUpdate = true;
    }

    if (onboarding.stockMarketOnboardingComplete !== onboarding.hasReachedStockMarket) {
      const correctValue = onboarding.stockMarketOnboardingComplete || onboarding.hasReachedStockMarket || false;
      onboarding.stockMarketOnboardingComplete = correctValue;
      onboarding.hasReachedStockMarket = correctValue;
      changes.push(`Synchronized stock market fields to: ${correctValue}`);
      needsUpdate = true;
    }

    // Add mayaPosition if missing
    if (!onboarding.mayaPosition) {
      // Infer position based on progression state
      let mayaPosition = { x: 7779, y: 3581 }; // Default spawn

      // Check both client and server fields for stock market completion
      if (onboarding.hasReachedStockMarket || onboarding.stockMarketOnboardingComplete) {
        mayaPosition = { x: 2598, y: 3736 }; // Stock market entrance
      } else if (
        onboarding.hasFollowedMaya || 
        onboarding.hasClaimedMoney || 
        onboarding.hasCompletedBankOnboarding ||
        onboarding.bankOnboardingComplete
      ) {
        mayaPosition = { x: 9415, y: 6297 }; // Bank entrance
      }

      onboarding.mayaPosition = mayaPosition;
      changes.push(`Added mayaPosition field at (${mayaPosition.x}, ${mayaPosition.y})`);
      needsUpdate = true;
    }

    // Ensure unlockedBuildings is properly initialized
    if (!onboarding.unlockedBuildings) {
      onboarding.unlockedBuildings = { bank: false, atm: false, stockmarket: false };
      changes.push('Initialized unlockedBuildings object');
      needsUpdate = true;
    } else {
      // Backfill missing building locks
      if (onboarding.unlockedBuildings.bank === undefined) {
        onboarding.unlockedBuildings.bank = onboarding.hasClaimedMoney ?? false;
        changes.push('Backfilled bank unlock status');
        needsUpdate = true;
      }
      if (onboarding.unlockedBuildings.atm === undefined) {
        onboarding.unlockedBuildings.atm = false;
        changes.push('Backfilled ATM unlock status');
        needsUpdate = true;
      }
      if (onboarding.unlockedBuildings.stockmarket === undefined) {
        onboarding.unlockedBuildings.stockmarket = onboarding.hasCompletedBankOnboarding ?? false;
        changes.push('Backfilled stock market unlock status');
        needsUpdate = true;
      }
    }

    // Handle legacy players who claimed starter but have inconsistent onboarding state
    if (legacyStarterClaimed && !onboarding.hasClaimedMoney) {
      onboarding.hasMetMaya = true;
      onboarding.hasFollowedMaya = true;
      onboarding.hasClaimedMoney = true;
      onboarding.onboardingStep = 'claimed_money';
      onboarding.unlockedBuildings.bank = true;
      changes.push('Upgraded legacy starterClaimed player to claimed_money state');
      needsUpdate = true;
    }
  }

  // Backfill hasCompletedTutorial field for old users
  if (migrated.hasCompletedTutorial === undefined) {
    migrated.hasCompletedTutorial = legacyStarterClaimed || migrated.onboarding?.hasClaimedMoney || false;
    changes.push('Backfilled hasCompletedTutorial field');
    needsUpdate = true;
  }

  // Ensure progress object exists
  if (!migrated.progress) {
    migrated.progress = {
      level: 1,
      experience: 0,
      unlockedBuildings: ["bank", "stockmarket"],
      completedTutorials: [],
    };
    changes.push('Created missing progress object');
    needsUpdate = true;
  }

  return { migrated, changes, needsUpdate };
}

/**
 * Logs migration changes for debugging
 */
export function logMigrationChanges(userId: string, changes: string[]): void {
  if (changes.length > 0) {
    console.log(`\n🔄 Schema Migration for user ${userId}:`);
    changes.forEach((change, index) => {
      console.log(`  ${index + 1}. ${change}`);
    });
    console.log('✅ Migration completed successfully\n');
  }
}

/**
 * Validates that migrated state has all required fields
 */
export function validateMigratedState(playerState: PlayerStateDocument): boolean {
  try {
    // Check required top-level fields
    if (!playerState.userId || !playerState.position || !playerState.financial) {
      console.error('❌ Migration validation failed: Missing required top-level fields');
      return false;
    }

    // Check onboarding object
    if (!playerState.onboarding) {
      console.error('❌ Migration validation failed: Missing onboarding object');
      return false;
    }

    const onboarding = playerState.onboarding;
    const requiredFields = [
      'hasMetMaya',
      'hasFollowedMaya', 
      'hasClaimedMoney',
      'hasCompletedBankOnboarding',
      'hasReachedStockMarket',
      'onboardingStep',
      'unlockedBuildings',
    ];

    for (const field of requiredFields) {
      if (!(field in onboarding)) {
        console.error(`❌ Migration validation failed: Missing onboarding.${field}`);
        return false;
      }
    }

    // Check client-side compatibility fields
    if (!('bankOnboardingComplete' in onboarding) || !('stockMarketOnboardingComplete' in onboarding)) {
      console.error('❌ Migration validation failed: Missing client compatibility fields');
      return false;
    }

    // Check mayaPosition
    if (!onboarding.mayaPosition || 
        typeof onboarding.mayaPosition.x !== 'number' ||
        typeof onboarding.mayaPosition.y !== 'number') {
      console.error('❌ Migration validation failed: Invalid mayaPosition');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Migration validation error:', error);
    return false;
  }
}
