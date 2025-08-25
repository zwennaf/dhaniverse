// IndexedDB persistent storage for map chunk PNG blobs.
// Designed to retain chunks across sessions/tabs without eviction logic (browser may still evict under storage pressure).

const DB_NAME = 'dhaniverse-map';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export interface PersistentChunkRecord { id: string; blob: Blob; ts: number; size: number; }

export async function storePersistentChunk(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const rec: PersistentChunkRecord = { id, blob, ts: Date.now(), size: blob.size };
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (e) {
    console.warn('[PersistentChunkStore] store failed', e);
  }
}

export async function getPersistentChunkBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result as PersistentChunkRecord | undefined;
        resolve(result ? result.blob : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[PersistentChunkStore] get failed', e);
    return null;
  }
}

export async function hasPersistentChunk(id: string): Promise<boolean> {
  return (await getPersistentChunkBlob(id)) != null;
}

export async function estimatePersistentUsage(): Promise<{ count: number; totalBytes: number }> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result as PersistentChunkRecord[];
        const total = records.reduce((a, r) => a + (r.size || 0), 0);
        resolve({ count: records.length, totalBytes: total });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}

// Debug helper
export function exposePersistentChunkDiagnostics() {
  (window as any).dhaniversePersistentChunksInfo = async () => {
    const info = await estimatePersistentUsage();
    console.log('[PersistentChunkStore] usage', info);
    return info;
  };
}
