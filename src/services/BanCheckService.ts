/**
 * Ban Check Service
 * Handles checking if a user is banned from the game
 */

interface BanCheckResponse {
  banned: boolean;
  reason?: string;
  banType?: string;
  expiresAt?: string;
}

class BanCheckService {
  private static instance: BanCheckService;
  private readonly API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  static getInstance(): BanCheckService {
    if (!BanCheckService.instance) {
      BanCheckService.instance = new BanCheckService();
    }
    return BanCheckService.instance;
  }

  /**
   * Check if the current user is banned
   */
  async checkCurrentUserBan(): Promise<BanCheckResponse> {
    try {
      const token = localStorage.getItem('dhaniverse_token');
      if (!token) {
        return { banned: false };
      }

      const response = await fetch(`${this.API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          // User is banned at the auth level
          const data = await response.json().catch(() => ({}));
          return {
            banned: true,
            reason: data.error || 'Account banned',
            banType: 'account'
          };
        }
        return { banned: false };
      }

      const userData = await response.json();
      
      // Check if we have ban information from admin endpoint
      try {
        const banCheckResponse = await fetch(`${this.API_BASE}/admin/check-ban`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userData.user?.email
          })
        });

        if (banCheckResponse.ok) {
          const banData = await banCheckResponse.json();
          if (banData.banned && banData.matches && banData.matches.length > 0) {
            const match = banData.matches[0];
            return {
              banned: true,
              reason: match.reason || 'Account banned',
              banType: match.type || 'account',
              expiresAt: match.expiresAt
            };
          }
        }
      } catch (error) {
        console.log('Admin ban check failed, user likely not admin:', error);
        // This is expected for non-admin users, so we continue
      }

      return { banned: false };
    } catch (error) {
      console.error('Ban check failed:', error);
      // On error, assume not banned to avoid blocking legitimate users
      return { banned: false };
    }
  }

  /**
   * Check ban status by specific criteria
   */
  async checkBan(criteria: { email?: string; ip?: string; principal?: string }): Promise<BanCheckResponse> {
    try {
      const token = localStorage.getItem('dhaniverse_token');
      if (!token) {
        return { banned: false };
      }

      const response = await fetch(`${this.API_BASE}/admin/check-ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(criteria)
      });

      if (!response.ok) {
        return { banned: false };
      }

      const data = await response.json();
      if (data.banned && data.matches && data.matches.length > 0) {
        const match = data.matches[0];
        return {
          banned: true,
          reason: match.reason || 'Account banned',
          banType: match.type || 'account',
          expiresAt: match.expiresAt
        };
      }

      return { banned: false };
    } catch (error) {
      console.error('Ban check failed:', error);
      return { banned: false };
    }
  }

  /**
   * Handle ban detected event with enhanced information
   */
  handleBanDetected(banInfo: BanCheckResponse): void {
    // Store ban information for the banned page
    if (banInfo.banned) {
      sessionStorage.setItem('ban_info', JSON.stringify(banInfo));
      
      // Log ban details for debugging
      console.log('Ban detected:', {
        reason: banInfo.reason,
        type: banInfo.banType,
        expiresAt: banInfo.expiresAt,
        isPermanent: !banInfo.expiresAt
      });
      
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('user-banned', {
        detail: banInfo
      }));
    }
  }

  /**
   * Get stored ban information
   */
  getStoredBanInfo(): BanCheckResponse | null {
    try {
      const stored = sessionStorage.getItem('ban_info');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse stored ban info:', error);
    }
    return null;
  }

  /**
   * Clear stored ban information
   */
  clearBanInfo(): void {
    sessionStorage.removeItem('ban_info');
  }
}

export const banCheckService = BanCheckService.getInstance();
export type { BanCheckResponse };
