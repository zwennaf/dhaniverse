// API utility functions for backend communication
const API_BASE =
  (typeof window !== "undefined" && window.location.hostname === "localhost")
    ? "http://localhost:8000"
    : "https://dhaniverseapi.deno.dev";
   

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("dhaniverse_token");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
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
            const response = await fetch(`${API_BASE}/game/player-state`, {
                headers: getAuthHeaders(),
            });

            // If player state doesn't exist (404), create a new one with default values
            if (response.status === 404) {
                console.log(
                    "Player state not found, creating initial state..."
                );

                // Create default player state
                const defaultState = {
                    financial: {
                        rupees: 25000,
                        totalWealth: 25000,
                    },
                };

                // Create the player state
                const createResponse = await fetch(
                    `${API_BASE}/game/player-state`,
                    {
                        method: "PUT",
                        headers: getAuthHeaders(),
                        body: JSON.stringify(defaultState),
                    }
                );

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
                        rupees: 25000,
                        totalWealth: 25000,
                    },
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
            const response = await fetch(
                `${API_BASE}/game/player-state/rupees`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ rupees, operation }),
                }
            );

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
            const response = await fetch(`${API_BASE}/game/player-state`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(stateData),
            });
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
    // Get bank account
    getAccount: async () => {
        const response = await fetch(`${API_BASE}/game/bank-account`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse(response);
    },

    // Deposit to bank account
    deposit: async (amount: number) => {
        const response = await fetch(`${API_BASE}/game/bank-account/deposit`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount }),
        });
        return handleApiResponse(response);
    },

    // Withdraw from bank account
    withdraw: async (amount: number) => {
        const response = await fetch(`${API_BASE}/game/bank-account/withdraw`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount }),
        });
        return handleApiResponse(response);
    },

    // Get bank transactions
    getTransactions: async () => {
        try {
            const response = await fetch(`${API_BASE}/game/bank-account/transactions`, {
                headers: getAuthHeaders(),
            });
            return handleApiResponse(response);
        } catch (error) {
            console.warn("Bank transactions API not available:", error);
            // Return empty transactions if API endpoint doesn't exist
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
        const response = await fetch(`${API_BASE}/game/fixed-deposits`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse(response);
    },

    // Create fixed deposit
    create: async (amount: number, duration: number) => {
        const response = await fetch(`${API_BASE}/game/fixed-deposits`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount, duration }),
        });
        return handleApiResponse(response);
    },

    // Claim matured fixed deposit
    claim: async (depositId: string) => {
        const response = await fetch(
            `${API_BASE}/game/fixed-deposits/${depositId}/claim`,
            {
                method: "POST",
                headers: getAuthHeaders(),
            }
        );
        return handleApiResponse(response);
    },
};

// ======================
// STOCK PORTFOLIO API
// ======================

export const stockApi = {
    // Get stock portfolio
    getPortfolio: async () => {
        const response = await fetch(`${API_BASE}/game/stock-portfolio`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse(response);
    },
    // Buy stock
    buyStock: async (
        stockId: string,
        quantity: number,
        price: number,
        stockName?: string
    ) => {
        const response = await fetch(`${API_BASE}/game/stock-portfolio/buy`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ stockId, stockName, quantity, price }),
        });
        return handleApiResponse(response);
    },

    // Sell stock
    sellStock: async (stockId: string, quantity: number, price: number) => {
        const response = await fetch(`${API_BASE}/game/stock-portfolio/sell`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ stockId, quantity, price }),
        });
        return handleApiResponse(response);
    },

    // Get stock transactions
    getTransactions: async () => {
        try {
            const response = await fetch(`${API_BASE}/game/stock-portfolio/transactions`, {
                headers: getAuthHeaders(),
            });
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
        const response = await fetch(`${API_BASE}/game/sync`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(localData),
        });
        return handleApiResponse(response);
    },
};

export { API_BASE };
