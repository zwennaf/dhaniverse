// API utility functions for backend communication
// Runtime-safe API_BASE: prefer Vite env, but avoid localhost in production builds
const inferredBase = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? 'http://localhost:8000' : 'https://api.dhaniverse.in';
const API_BASE = (import.meta.env && (import.meta.env.VITE_API_BASE_URL as string)) || inferredBase;

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("dhaniverse_token");
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV === 'development') {
        console.log('Auth headers:', { hasToken: !!token, tokenStart: token ? token.substring(0, 20) + '...' : null });
    }
    return headers;
};

// Wrapper around fetch that ensures credentials are included for cookie-based auth
const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const opts: RequestInit = { ...(init || {}) };
    // Set up base headers and merge with any provided headers
    const baseHeaders = getAuthHeaders();
    opts.headers = { ...baseHeaders, ...(opts.headers as Record<string, string> || {}) };
    // Always include credentials for cookie auth
    opts.credentials = 'include';

    // If the input is a string and is a relative path, rewrite to runtime-safe API_BASE
    let finalInput: RequestInfo | URL = input;
    if (typeof input === 'string') {
        const str = input as string;
        if (str.startsWith('/')) {
            finalInput = `${API_BASE.replace(/\/$/, '')}${str}`;
        }
    }

    // Send the request
    const response = await fetch(finalInput, opts);
    // Handle 401 Unauthorized and attempt to refresh session
    if (response.status === 401) {
        try {
            // Try to refresh the session using runtime-safe endpoint
            const refreshResponse = await fetch(`${API_BASE.replace(/\/$/, '')}/auth/session`, {
                credentials: 'include'
            });
            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.token) {
                    localStorage.setItem('dhaniverse_token', refreshData.token);
                    // Retry original request with new token
                    opts.headers = { 
                        ...baseHeaders, 
                        ...getAuthHeaders(), 
                        ...(opts.headers as Record<string, string> || {}) 
                    };
                    return fetch(finalInput, opts);
                }
            }
        } catch (error) {
            console.warn('Session refresh failed:', error);
        }
    }
    return response;
};

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
};

// ======================
// PLAYER STATE API
// ======================

export const playerStateApi = {
    // Get player state - creates a new one if it doesn't exist
    get: async () => {
        try {
            const response = await apiFetch('/game/player-state');

            // If player state doesn't exist (404), create a new one with default values
            if (response.status === 404) {
                console.log(
                    "Player state not found, creating initial state..."
                );

                // Create default player state
                const defaultState = {
                    financial: {
                        rupees: 0,
                        totalWealth: 0,
                    },
                    hasCompletedTutorial: false, // Default for new players
                };

                // Create the player state
                const createResponse = await apiFetch('/game/player-state', { method: 'PUT', body: JSON.stringify(defaultState) });

                // Return the newly created state
                return handleApiResponse(createResponse);
            }

            return handleApiResponse(response);
        } catch (error) {
            console.error("Error in player state API:", error);

            // Return a default state object if all else fails
            return {
                success: true,
                data: {
                    financial: {
                        rupees: 0,
                        totalWealth: 0,
                    },
                    hasCompletedTutorial: false, // Default for new players
                },
            };
        }
    },

    // Update player rupees
    updateRupees: async (
        rupees: number,
        operation: "set" | "add" | "subtract" = "set"
    ) => {
        try {
            const response = await apiFetch('/game/player-state/rupees', { method: 'PUT', body: JSON.stringify({ rupees, operation }) });

            // If player state doesn't exist (404), create it first then update rupees
            if (response.status === 404) {
                console.log(
                    "Player state not found when updating rupees, creating it first..."
                );

                // Create default player state with the specified rupees
                await playerStateApi.update({
                    financial: {
                        rupees: rupees,
                        totalWealth: rupees,
                    },
                });

                // Return a successful response
                return {
                    success: true,
                    data: {
                        rupees: rupees,
                    },
                };
            }

            return handleApiResponse(response);
        } catch (error) {
            console.error("Error updating rupees:", error);
            throw error;
        }
    },

    // Update full player state
    update: async (stateData: any) => {
        try {
            const response = await apiFetch('/game/player-state');
            return handleApiResponse(response);
        } catch (error) {
            console.error("Error updating player state:", error);
            throw error;
        }
    },
};

// ======================
// BANKING API
// ======================

export const bankingApi = {
    // Debug function to test server connectivity
    testConnection: async () => {
        try {
            console.log('🔍 Testing API connection to:', API_BASE);
            const response = await apiFetch('/api/health');
            console.log('🔍 Health check response:', response.status, response.statusText);
            return { success: response.ok, status: response.status };
        } catch (error) {
            console.error("🔍 API connection test failed:", error);
            return { success: false, error: String(error) };
        }
    },

    // Check bank onboarding status
    getOnboardingStatus: async () => {
        try {
            console.log('🏦 Banking API: Getting onboarding status from:', `${API_BASE}/game/bank-onboarding/status`);
            const response = await apiFetch('/game/bank-onboarding/status');
            console.log('🏦 Banking API: Onboarding status response:', response.status);
            return handleApiResponse(response);
        } catch (error) {
            console.error("🏦 Banking API: Error checking bank onboarding status:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                data: { hasCompletedOnboarding: false, hasBankAccount: false, bankAccount: null }
            };
        }
    },

    // Create bank account
    createAccount: async (accountHolder: string, initialDeposit: number = 0) => {
        const response = await apiFetch('/game/bank-account/create', { method: 'POST', body: JSON.stringify({ accountHolder, initialDeposit }) });
        return handleApiResponse(response);
    },

    // Get bank account
    getAccount: async () => {
        try {
            console.log('🏦 Banking API: Getting account from:', `${API_BASE}/game/bank-account`);
            const response = await apiFetch('/game/bank-account');
            
            if (response.status === 404) {
                console.log('🏦 Banking API: No bank account found (404)');
                return {
                    success: false,
                    error: "No bank account found",
                    data: null
                };
            }
            console.log('🏦 Banking API: Account request successful');
            return handleApiResponse(response);
        } catch (error) {
            console.error("🏦 Banking API: Error getting bank account:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                data: null
            };
        }
    },

    // Deposit to bank account
    deposit: async (amount: number) => {
    const response = await apiFetch('/game/bank-account/deposit', { method: 'POST', body: JSON.stringify({ amount }) });
        return handleApiResponse(response);
    },

    // Withdraw from bank account
    withdraw: async (amount: number) => {
    const response = await apiFetch('/game/bank-account/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
        return handleApiResponse(response);
    },

    // Get bank transactions
    getTransactions: async () => {
        // Banking transactions are embedded in the bank account data
        // We'll get them from the account details endpoint instead
        try {
            const response = await apiFetch('/game/bank-account');
            
            if (response.status === 404) {
                console.log('Bank account not found');
                return {
                    success: true,
                };
            }
            
            if (!response.ok) {
                console.warn("Bank account API error:", response.status);
                return {
                    success: true,
                    data: []
                };
            }
            
            const result = await response.json();
            // Extract transactions from bank account data
            return {
                success: true,
                data: result.data?.transactions || []
            };
        } catch (error) {
            console.warn("Bank transactions API not available:", error);
            return {
                success: true,
                data: []
            };
        }
    },
};

// ======================
// FIXED DEPOSIT API
// ======================

export const fixedDepositApi = {
    // Get all fixed deposits
    getAll: async () => {
        const response = await apiFetch('/game/fixed-deposits');
        return handleApiResponse(response);
    },

    // Create fixed deposit
    create: async (amount: number, duration: number) => {
        const response = await apiFetch('/game/fixed-deposits', { method: 'POST', body: JSON.stringify({ amount, duration }) });
        return handleApiResponse(response);
    },

    // Claim matured fixed deposit
    claim: async (depositId: string) => {
        const response = await apiFetch(`/game/fixed-deposits/${depositId}/claim`, { method: 'POST' });
        return handleApiResponse(response);
    },
};

// ======================
// STOCK PORTFOLIO API
// ======================

export const stockApi = {
    // Get stock portfolio
    getPortfolio: async () => {
    console.log('Fetching portfolio from:', `${API_BASE.replace(/\/$/, '')}/game/stock-portfolio`);
    const response = await apiFetch('/game/stock-portfolio');
        const result = await handleApiResponse(response);
        console.log('Portfolio API result:', result);
        return result;
    },
    // Buy stock
    buyStock: async (
        stockId: string,
        quantity: number,
        price: number,
        stockName?: string
    ) => {
        // Validate required parameters
        if (!stockId || !stockId.trim()) {
            throw new Error('Stock ID is required');
        }
        if (!quantity || quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }
        if (!price || price <= 0) {
            throw new Error('Price must be greater than 0');
        }

        const payload = { 
            stockId: stockId.trim().toUpperCase(), 
            stockName: stockName || stockId.trim().toUpperCase(), 
            quantity: parseInt(quantity.toString()), 
            price: parseFloat(price.toString()) 
        };
        
        console.log('🚀 Sending buy stock request:', payload);
    console.log('📡 API endpoint:', `${API_BASE.replace(/\/$/, '')}/game/stock-portfolio/buy`);
        console.log('🔑 Headers:', getAuthHeaders());
        
    const response = await apiFetch('/game/stock-portfolio/buy', { method: 'POST', body: JSON.stringify(payload) });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Buy stock API error response:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
                payload: payload
            });
            
            // Try to parse error as JSON for better debugging
            try {
                const errorJson = JSON.parse(errorText);
                console.error('❌ Parsed error JSON:', errorJson);
                throw new Error(`API Error ${response.status}: ${errorJson.message || errorJson.error || errorText}`);
            } catch (parseError) {
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
        }
        
        const result = await handleApiResponse(response);
        console.log('Buy stock API result:', result);
        return result;
    },

    // Sell stock
    sellStock: async (stockId: string, quantity: number, price: number) => {
    const response = await apiFetch('/game/stock-portfolio/sell', { method: 'POST', body: JSON.stringify({ stockId, quantity, price }) });
        return handleApiResponse(response);
    },

    // Get stock transactions
    getTransactions: async () => {
        try {
            const response = await apiFetch('/game/stock-transactions');
            
            // Handle case where endpoint doesn't exist yet
            if (response.status === 404) {
                console.log('Stock transactions endpoint not available yet');
                return {
                    success: true,
                    data: [] // Return empty transactions array
                };
            }
            
            // Only call handleApiResponse for successful responses
            if (!response.ok) {
                console.warn("Stock transactions API error:", response.status);
                return {
                    success: true,
                    data: []
                };
            }
            
            return handleApiResponse(response);
        } catch (error) {
            console.warn("Stock transactions API not available:", error);
            // Return empty transactions if API endpoint doesn't exist
            return {
                success: true,
                data: []
            };
        }
    },
};



// ======================
// SYNC API
// ======================

export const syncApi = {
    // Sync local data with backend
    syncData: async (localData: any) => {
        const response = await apiFetch('/game/sync', { method: 'POST', body: JSON.stringify(localData) });
        return handleApiResponse(response);
    },
};

export { API_BASE };

// Expose debug functions globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).testBankingAPI = bankingApi.testConnection;
    (window as any).debugAPI = { API_BASE, bankingApi };
}
