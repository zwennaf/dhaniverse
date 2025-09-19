import canisterService from './CanisterService';

class StockCanisterClient {
  private initialized = false;
  private cache = new Map<string, any>();
  private cacheTTL = 60 * 1000; // 1 minute

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      const ok = await canisterService.initialize();
      this.initialized = !!ok;
      return this.initialized;
    } catch (err) {
      console.warn('StockCanisterClient: initialize failed', err);
      this.initialized = false;
      return false;
    }
  }

  async getStockPrices(symbols: string[]): Promise<{ symbol: string; price: number }[]> {
    if (!symbols || symbols.length === 0) return [];

    // Use cache for short-term repeated requests
    const now = Date.now();
    const uncached: string[] = [];
    const results: { symbol: string; price: number }[] = [];

    for (const s of symbols) {
      const key = s.toUpperCase();
      const cached = this.cache.get(key);
      if (cached && now - cached.ts < this.cacheTTL) {
        results.push({ symbol: key, price: cached.price });
      } else {
        uncached.push(key);
      }
    }

    if (uncached.length === 0) return results;

    // Try to initialize canister if not already
    const ok = await this.ensureInitialized();
    if (!ok) {
      console.warn('StockCanisterClient: canister not initialized, returning cached results only');
      return results;
    }

    try {
      const actor = (canisterService as any).actor;
      if (!actor) return results;

      // Prefer batch method if available
      if (actor.fetch_multiple_crypto_prices || actor.fetch_multiple_stock_prices) {
        // Normalize to comma separated string if needed
        const arg = uncached.join(',');
        // Try both possible method names safely
        let raw: any = null;
        if (actor.fetch_multiple_stock_prices) {
          raw = await actor.fetch_multiple_stock_prices(uncached);
        } else if (actor.fetch_multiple_crypto_prices) {
          raw = await actor.fetch_multiple_crypto_prices(arg);
        }

        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (Array.isArray(item) && item.length >= 2) {
              const symbol = (item[0] || '').toString().toUpperCase();
              const price = Number(item[1]) || 0;
              this.cache.set(symbol, { price, ts: Date.now() });
              results.push({ symbol, price });
            } else if (item && item.symbol) {
              const symbol = (item.symbol || '').toUpperCase();
              const price = Number(item.price || 0);
              this.cache.set(symbol, { price, ts: Date.now() });
              results.push({ symbol, price });
            }
          }
        }
      } else {
        // Fallback: call per-symbol with delay to avoid canister spam
        for (const s of uncached.slice(0, 8)) {
          try {
            const res = await actor.fetch_stock_price(s);
            let price = 0;
            if (typeof res === 'number') price = res;
            else if (res && typeof res === 'object') {
              if ('Ok' in res) price = res.Ok;
              else if ('Some' in res) price = res.Some;
            }
            this.cache.set(s, { price, ts: Date.now() });
            results.push({ symbol: s, price });
            await new Promise(r => setTimeout(r, 120));
          } catch (err) {
            console.warn('fetch_stock_price failed for', s, err);
            break;
          }
        }
      }
    } catch (err) {
      console.error('StockCanisterClient.getStockPrices error', err);
    }

    return results;
  }

}

export const stockCanisterClient = new StockCanisterClient();
export default stockCanisterClient;
