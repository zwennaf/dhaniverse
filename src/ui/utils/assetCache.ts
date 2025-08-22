// Simple runtime asset cache that converts fetched assets to blob URLs to bypass no-store headers
// and guarantees Onboarding component uses already-loaded data.
const assetMap: Record<string, string> = {};

export const cacheAssets = async (urls: string[]): Promise<void> => {
  await Promise.all(urls.map(async (url) => {
    if (assetMap[url]) return; // already cached
    try {
      const resp = await fetch(url, { cache: 'force-cache' });
      if (!resp.ok) throw new Error('Bad status ' + resp.status);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      assetMap[url] = objectUrl;
    } catch {
      // fallback: keep original url so <img> can still try
      assetMap[url] = url;
    }
  }));
};

export const resolveAsset = (url: string): string => assetMap[url] || url;

export const hasAssetCached = (url: string): boolean => !!assetMap[url];

export const getCachedMap = () => ({ ...assetMap });

// Optional: clear (not used now)
export const clearAssetCache = () => {
  Object.values(assetMap).forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); });
  Object.keys(assetMap).forEach(k => delete assetMap[k]);
};
