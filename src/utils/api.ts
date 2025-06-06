// API utility functions for backend communication
const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : 'https://dhaniverseapi.deno.dev';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('dhaniverse_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// ======================
// PLAYER STATE API
// ======================

export const playerStateApi = {
  // Get player state
  get: async () => {
    const response = await fetch(`${API_BASE}/game/player-state`, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse(response);
  },

  // Update player rupees
  updateRupees: async (rupees: number, operation: 'set' | 'add' | 'subtract' = 'set') => {
    const response = await fetch(`${API_BASE}/game/player-state/rupees`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rupees, operation }),
    });
    return handleApiResponse(response);
  },

  // Update full player state
  update: async (stateData: any) => {
    const response = await fetch(`${API_BASE}/game/player-state`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(stateData),
    });
    return handleApiResponse(response);
  }
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
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleApiResponse(response);
  },

  // Withdraw from bank account
  withdraw: async (amount: number) => {
    const response = await fetch(`${API_BASE}/game/bank-account/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleApiResponse(response);
  }
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
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, duration }),
    });
    return handleApiResponse(response);
  },

  // Claim matured fixed deposit
  claim: async (depositId: string) => {
    const response = await fetch(`${API_BASE}/game/fixed-deposits/${depositId}/claim`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleApiResponse(response);
  }
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
  buyStock: async (stockId: string, quantity: number, price: number, stockName?: string) => {
    const response = await fetch(`${API_BASE}/game/stock-portfolio/buy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stockId, stockName, quantity, price }),
    });
    return handleApiResponse(response);
  },

  // Sell stock
  sellStock: async (stockId: string, quantity: number, price: number) => {
    const response = await fetch(`${API_BASE}/game/stock-portfolio/sell`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stockId, quantity, price }),
    });
    return handleApiResponse(response);
  }
};

// ======================
// SYNC API
// ======================

export const syncApi = {
  // Sync local data with backend
  syncData: async (localData: any) => {
    const response = await fetch(`${API_BASE}/game/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(localData),
    });
    return handleApiResponse(response);
  }
};

export { API_BASE };
