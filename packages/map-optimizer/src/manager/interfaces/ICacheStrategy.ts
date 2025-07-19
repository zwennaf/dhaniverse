// Cache strategy interface for different eviction policies
export interface ICacheStrategy<T> {
  add(key: string, value: T): void;
  get(key: string): T | undefined;
  remove(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
  
  // Eviction policy
  evict(): string | null; // Returns key of evicted item
  shouldEvict(maxSize: number): boolean;
  
  // Priority management
  updatePriority(key: string, priority: number): void;
  getPriority(key: string): number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  priority: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
}