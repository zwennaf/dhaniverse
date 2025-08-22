// Lightweight localStorage-based cache for map chunks.
// Stores a limited number of base64-encoded chunk images with LRU eviction and versioning.
// NOTE: localStorage quota (~5MB) means we must aggressively limit stored chunks and sizes.

interface ChunkCacheIndexEntry {
  id: string;
  ts: number; // last access timestamp
  size: number; // approximate size in bytes (base64 length)
}

const PREFIX = 'map_chunk_';
const INDEX_KEY = 'map_chunk_cache_index';
const VERSION_KEY = 'map_chunk_cache_version';

// Fast in-memory layer (not size limited; relies on process memory)
const memoryCache: Map<string, { dataUrl: string; ts: number }> = new Map();

// Limits (tune conservatively for safety)
const MAX_CACHED_CHUNKS = 60; // absolute count cap
const MAX_TOTAL_SIZE = 4_200_000; // ~4.2MB budget inside ~5MB allowance

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function loadIndex(): ChunkCacheIndexEntry[] {
  return safeParse<ChunkCacheIndexEntry[]>(localStorage.getItem(INDEX_KEY), []);
}

function saveIndex(index: ChunkCacheIndexEntry[]) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(index)); } catch { /* ignore quota */ }
}

/**
 * Initialize cache version. Only purge if incoming version is greater than stored version.
 * This avoids wiping cache during dev when metadata version may be regenerated equal or lower.
 */
export function initChunkCache(version: number) {
  const storedVersionStr = localStorage.getItem(VERSION_KEY);
  const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : undefined;
  if (storedVersion === undefined) {
    try { localStorage.setItem(VERSION_KEY, String(version)); } catch {}
    return;
  }
  if (Number.isFinite(version) && storedVersion !== undefined && version > storedVersion) {
    console.log('[MapChunkCache] Version upgrade', storedVersion, '->', version, 'purging cache');
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(INDEX_KEY);
    try { localStorage.setItem(VERSION_KEY, String(version)); } catch {}
  } else {
    // Keep existing cache
    // Optionally update stored version if it was lower for some reason
    if (version > (storedVersion || 0)) {
      try { localStorage.setItem(VERSION_KEY, String(version)); } catch {}
    }
  }
}

export function getChunkDataUrl(id: string): string | null {
  const key = PREFIX + id;
  // Memory layer first
  const mem = memoryCache.get(id);
  if (mem) {
    mem.ts = Date.now();
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[MapChunkCache] mem-hit ${id} (${(mem.dataUrl.length/1024).toFixed(1)}kb)`);
    }
    return mem.dataUrl;
  }
  const data = localStorage.getItem(key);
  if (data) {
    // touch LRU
    const index = loadIndex();
    const entry = index.find(e => e.id === id);
    if (entry) {
      entry.ts = Date.now();
      saveIndex(index);
    }
    // Debug marker for diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[MapChunkCache] hit ${id} (${(data.length/1024).toFixed(1)}kb)`);
    }
    // Promote to memory
    memoryCache.set(id, { dataUrl: data, ts: Date.now() });
  } else if (process.env.NODE_ENV !== 'production') {
    console.debug(`[MapChunkCache] miss ${id}`);
  }
  return data;
}

function evictIfNeeded(index: ChunkCacheIndexEntry[]) {
  let totalSize = index.reduce((sum, e) => sum + e.size, 0);
  // Sort by timestamp ascending (oldest first)
  index.sort((a, b) => a.ts - b.ts);
  let changed = false;
  while ((index.length > MAX_CACHED_CHUNKS || totalSize > MAX_TOTAL_SIZE) && index.length) {
    const victim = index.shift();
    if (victim) {
      localStorage.removeItem(PREFIX + victim.id);
      totalSize -= victim.size;
      changed = true;
    }
  }
  if (changed) saveIndex(index);
}

export function storeChunk(id: string, dataUrl: string) {
  try {
    const key = PREFIX + id;
    localStorage.setItem(key, dataUrl); // may throw on quota
  memoryCache.set(id, { dataUrl, ts: Date.now() });
    const index = loadIndex();
    let entry = index.find(e => e.id === id);
    if (!entry) {
      entry = { id, ts: Date.now(), size: dataUrl.length };
      index.push(entry);
    } else {
      entry.ts = Date.now();
      entry.size = dataUrl.length;
    }
    saveIndex(index);
    evictIfNeeded(index);
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[MapChunkCache] stored ${id} size ${(dataUrl.length/1024).toFixed(1)}kb index=${index.length}`);
    }
  } catch (e) {
    // On quota errors, attempt one round of eviction then retry once
    const index = loadIndex();
    evictIfNeeded(index);
    try { localStorage.setItem(PREFIX + id, dataUrl); } catch { /* give up */ }
    memoryCache.set(id, { dataUrl, ts: Date.now() });
  }
}

export function getMemoryCacheSize(): { entries: number; approxKB: number } {
  let bytes = 0;
  memoryCache.forEach(v => { bytes += v.dataUrl.length; });
  return { entries: memoryCache.size, approxKB: +(bytes/1024).toFixed(1) };
}

export function clearChunkCache() {
  const index = loadIndex();
  index.forEach(e => localStorage.removeItem(PREFIX + e.id));
  localStorage.removeItem(INDEX_KEY);
}

// Helper to bulk preload and cache a set of chunk filenames.
// chunkIdsWithFilenames: Array of { id, filename }
export async function preloadAndCacheChunks(basePath: string, chunkIdsWithFilenames: Array<{id: string; filename: string}>) {
  const tasks = chunkIdsWithFilenames.map(async ({ id, filename }) => {
    if (getChunkDataUrl(id)) return; // already cached
    try {
      const resp = await fetch(`${basePath}/${filename}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      storeChunk(id, dataUrl);
    } catch (e) {
      console.warn(`Failed to preload chunk ${id}:`, e);
    }
  });
  await Promise.all(tasks);
}
