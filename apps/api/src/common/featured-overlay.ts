const featured = new Map<string, boolean>();

export function setFeaturedOverlay(jobId: string, value: boolean): void {
  if (value) {
    featured.set(jobId, true);
    return;
  }
  featured.delete(jobId);
}

export function overlayFeaturedFlag(jobId: string | undefined, current?: boolean): boolean {
  if (!jobId) {
    return Boolean(current);
  }
  if (featured.has(jobId)) {
    return featured.get(jobId) === true;
  }
  return Boolean(current);
}

export function applyFeaturedOverlay(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return sortFeatured(payload.map((row) => overlayRecord(row)));
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return { ...record, data: sortFeatured(record.data.map((row) => overlayRecord(row))) };
    }
    if (typeof record.id === 'string') {
      return overlayRecord(record);
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
    /^\/api\/jobs\/[^/]+$/.test(path)
  );
}

function overlayRecord(row: unknown): unknown {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const job = row as { id?: string; featured?: boolean };
  if (!job.id) {
    return row;
  }
  return { ...job, featured: overlayFeaturedFlag(job.id, job.featured) };
}

function sortFeatured<T>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const a = Number(Boolean((left as { featured?: boolean }).featured));
    const b = Number(Boolean((right as { featured?: boolean }).featured));
    return b - a;
  });
}
