/**
 * Environment Configuration Service
 * 
 * Centralized configuration for API keys, endpoints, and feature flags.
 * Reads from environment variables with sensible defaults.
 * 
 * @author Dhaniverse Team
 */

// ============================================================================
// POLYGON.IO API CONFIGURATION
// ============================================================================

export const POLYGON_CONFIG = {
    apiKey: import.meta.env.VITE_POLYGON_API_KEY || '',
    baseUrl: 'https://api.polygon.io/v2',
    enabled: Boolean(import.meta.env.VITE_POLYGON_API_KEY),
    
    // Free tier limits
    maxCallsPerMinute: 5,
    maxCallsPerDay: 7200,
} as const;

// ============================================================================
// ICP CANISTER CONFIGURATION
// ============================================================================

export const ICP_CONFIG = {
    canisterId: import.meta.env.VITE_ICP_CANISTER_ID || '2v55c-vaaaa-aaaas-qbrpq-cai',
    host: import.meta.env.VITE_ICP_HOST || 'https://ic0.app',
    
    // Cycle costs
    cyclesPerHttpCall: 25_000_000_000, // 25B cycles
    estimatedCostPerCall: 0.000033, // ~$0.000033 USD
} as const;

// ============================================================================
// BACKEND API CONFIGURATION
// ============================================================================

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

export const API_CONFIG = {
    // REST API
    baseUrl: import.meta.env.VITE_API_URL || (
        isLocal 
            ? 'http://localhost:8000'
            : 'https://dhaniverse-api.azurewebsites.net'
    ),
    
    // WebSocket
    wsUrl: import.meta.env.VITE_WS_URL || (
        isLocal
            ? 'ws://localhost:8001'
            : 'wss://dhaniverse-ws.azurewebsites.net'
    ),
    
    // Timeouts
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
} as const;

// ============================================================================
// STOCK MARKET CONFIGURATION
// ============================================================================

export const STOCK_MARKET_CONFIG = {
    // Update intervals
    priceUpdateInterval: Number(import.meta.env.VITE_STOCK_UPDATE_INTERVAL) || 300000, // 5 minutes
    
    // Cache TTLs
    memoryCacheTTL: 5 * 60 * 1000, // 5 minutes
    canisterCacheTTL: 30 * 60 * 1000, // 30 minutes
    localStorageTTL: 60 * 60 * 1000, // 1 hour
    
    // Rate limiting
    maxCanisterCallsPerMinute: 5,
    minTimeBetweenCalls: 2000, // 2 seconds
    
    // Batch operations
    maxSymbolsPerBatch: 20,
    batchDelay: 100, // milliseconds
    
    // Feature flags
    enableRealTimeUpdates: true,
    enablePolygonAPI: POLYGON_CONFIG.enabled,
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
} as const;

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

export const AUTH_CONFIG = {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    magicLinkSecret: import.meta.env.VITE_MAGIC_LINK_SECRET || '',
    
    // Session
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    tokenRefreshInterval: 50 * 60 * 1000, // 50 minutes
} as const;

// ============================================================================
// LIVEKIT (VOICE CHAT) CONFIGURATION
// ============================================================================

export const LIVEKIT_CONFIG = {
    apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || 'APIaMz2VKrmZgqW',
    apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || '',
    wsUrl: import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://dhaniverse-voice.livekit.cloud',
} as const;

// ============================================================================
// DEVELOPMENT FLAGS
// ============================================================================

export const DEV_CONFIG = {
    debug: import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV,
    enableDevTools: import.meta.env.DEV,
    enablePerformanceMonitoring: true,
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
    // Stock Market
    enableStockMarket: true,
    enableRealStockPrices: POLYGON_CONFIG.enabled,
    enableStockTransactions: true,
    enablePortfolio: true,
    
    // Banking
    enableBanking: true,
    enableATM: true,
    enableLoans: false, // Coming soon
    
    // Multiplayer
    enableVoiceChat: Boolean(LIVEKIT_CONFIG.apiKey),
    enableTextChat: true,
    enableRooms: true,
    
    // ICP Integration
    enableICPWallet: true,
    enableWeb3Features: true,
    enableCryptoTrading: false, // Coming soon
    
    // Tutorial
    enableMayaTutorial: true,
    enableOnboarding: true,
} as const;

// ============================================================================
// VALIDATION & WARNINGS
// ============================================================================

export function validateConfig(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check Polygon API
    if (!POLYGON_CONFIG.apiKey) {
        warnings.push('⚠️  POLYGON_API_KEY not set. Using fallback stock prices.');
    }
    
    // Check ICP config
    if (!ICP_CONFIG.canisterId) {
        warnings.push('⚠️  ICP_CANISTER_ID not set. Web3 features may not work.');
    }
    
    // Check authentication
    if (!AUTH_CONFIG.googleClientId) {
        warnings.push('⚠️  GOOGLE_CLIENT_ID not set. Google OAuth login disabled.');
    }
    
    // Check LiveKit
    if (!LIVEKIT_CONFIG.apiKey) {
        warnings.push('⚠️  LIVEKIT_API_KEY not set. Voice chat disabled.');
    }
    
    // Log warnings in development
    if (DEV_CONFIG.debug && warnings.length > 0) {
        console.group('🔧 Configuration Warnings');
        warnings.forEach(w => console.warn(w));
        console.groupEnd();
    }
    
    return {
        valid: warnings.length === 0,
        warnings,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const config = {
    polygon: POLYGON_CONFIG,
    icp: ICP_CONFIG,
    api: API_CONFIG,
    stockMarket: STOCK_MARKET_CONFIG,
    auth: AUTH_CONFIG,
    livekit: LIVEKIT_CONFIG,
    dev: DEV_CONFIG,
    features: FEATURE_FLAGS,
    validate: validateConfig,
} as const;

// Validate on module load
if (DEV_CONFIG.debug) {
    validateConfig();
}

// Debug access
(window as any).dhaniConfig = config;

export default config;
