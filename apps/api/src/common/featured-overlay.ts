const store = new Map<string, boolean>();
export const FEATURED_COOKIE = 'hs_featured';
export const FEATURED_HEADER = 'x-hirestack-featured';

function collectIds(raw?: string): Set<string> {
  const ids = new Set<string>();
  if (!raw) {
    return ids;
  }
  try {
    const decoded = decodeURIComponent(raw);
    for (const id of decoded.split(',')) {
      const trimmed = id.trim();
      if (trimmed) {
        ids.add(trimmed);
      }
    }
  } catch {
    return ids;
  }
  return ids;
}

export function parseFeaturedCookie(cookieHeader?: string): string[] {
  const ids = new Set<string>();
  if (!cookieHeader) {
    return [];
  }
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) {
      continue;
    }
    const name = part.slice(0, idx).trim();
    if (name !== FEATURED_COOKIE) {
      continue;
    }
    for (const id of collectIds(part.slice(idx + 1))) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function parseFeaturedIds(cookieHeader?: string, header?: string | string[]): Set<string> {
  const ids = new Set(parseFeaturedCookie(cookieHeader));
  const raw = Array.isArray(header) ? header.join(',') : header;
  for (const id of collectIds(raw)) {
    ids.add(id);
  }
  return ids;
}

export function nextFeaturedIds(
  cookieHeader: string | undefined,
  jobId: string,
  featured = true,
  header?: string | string[],
): string[] {
  const ids = parseFeaturedIds(cookieHeader, header);
  if (featured) {
    ids.add(jobId);
  } else {
    ids.delete(jobId);
  }
  return [...ids];
}

export function serializeFeaturedCookie(ids: string[]): string {
  const value = encodeURIComponent(ids.join(','));
  const parts = [`${FEATURED_COOKIE}=${value}`, 'Path=/', 'Max-Age=2592000', 'SameSite=Lax'];
  if (process.env.VERCEL) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function overlayFeaturedFlag(
  jobId: string | undefined,
  current?: boolean,
  extraIds: Iterable<string> = [],
): boolean {
  if (!jobId) {
    return Boolean(current);
  }
  if (store.has(jobId)) {
    return store.get(jobId) === true;
  }
  const extras = extraIds instanceof Set ? extraIds : new Set(extraIds);
  return extras.has(jobId) || Boolean(current);
}

export function setFeaturedOverlay(jobId: string, featured: boolean) {
  store.set(jobId, featured);
}

export function clearFeaturedOverlay() {
  store.clear();
}

export function applyFeaturedOverlay(payload: unknown, extraIds: Iterable<string> = []): unknown {
  const featuredIds = new Set<string>([...extraIds]);
  for (const [id, featured] of store) {
    if (featured) {
      featuredIds.add(id);
    } else {
      featuredIds.delete(id);
    }
  }
  const overlayJob = (job: Record<string, unknown>) => {
    if (typeof job.id !== 'string') {
      return job;
    }
    return { ...job, featured: overlayFeaturedFlag(job.id, Boolean(job.featured), featuredIds) };
  };
  if (Array.isArray(payload)) {
    const jobs = payload.map((job) =>
      job && typeof job === 'object' ? overlayJob(job as Record<string, unknown>) : job,
    );
    return [...jobs].sort((a, b) => {
      const af = a && typeof a === 'object' && (a as { featured?: boolean }).featured ? 1 : 0;
      const bf = b && typeof b === 'object' && (b as { featured?: boolean }).featured ? 1 : 0;
      return bf - af;
    });
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return { ...record, data: applyFeaturedOverlay(record.data, extraIds) };
    }
    if (typeof record.id === 'string') {
      return overlayJob(record);
    }
  }
  return payload;
}

export function shouldOverlayFeaturedPath(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0] ?? '';
  return (
    path === '/api/jobs' ||
    path === '/api/jobs/featured' ||
    path === '/api/me/jobs' ||
    /^\/api\/me\/jobs\/[^/]+$/.test(path) ||
    /^\/api\/jobs\/[^/]+$/.test(path)
  );
}
