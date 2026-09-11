const STORAGE_KEY = 'hs_featured';
export const FEATURED_HEADER = 'X-HireStack-Featured';

function canUseBrowser(): boolean {
  return typeof globalThis.document !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function readFeaturedIds(): string[] {
  if (!canUseBrowser()) {
    return [];
  }
  try {
    const fromStorage = globalThis.localStorage.getItem(STORAGE_KEY) ?? '';
    const ids = new Set(fromStorage.split(',').map((id) => id.trim()).filter(Boolean));
    const match = globalThis.document.cookie.match(/(?:^|;\s*)hs_featured=([^;]*)/);
    if (match) {
      try {
        for (const id of decodeURIComponent(match[1]).split(',')) {
          const trimmed = id.trim();
          if (trimmed) {
            ids.add(trimmed);
          }
        }
      } catch {
        // Ignore a malformed cookie and keep localStorage ids.
      }
    }
    return [...ids];
  } catch {
    return [];
  }
}

export function rememberFeatured(jobId: string, featured: boolean): string[] {
  const ids = new Set(readFeaturedIds());
  if (featured) {
    ids.add(jobId);
  } else {
    ids.delete(jobId);
  }
  const list = [...ids];
  persistFeaturedIds(list);
  return list;
}

export function persistFeaturedIds(ids: string[]): void {
  if (!canUseBrowser()) {
    return;
  }
  const value = ids.join(',');
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode can block storage; the cookie header still travels.
  }
  globalThis.document.cookie = `hs_featured=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function featuredOverlayHeaders(): Record<string, string> {
  const ids = readFeaturedIds();
  return ids.length ? { [FEATURED_HEADER]: ids.join(',') } : {};
}
