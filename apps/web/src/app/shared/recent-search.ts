const KEY = 'hs-recent-search';

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const rows = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return readRecentSearches();
  const next = [q, ...readRecentSearches().filter((row) => row.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
