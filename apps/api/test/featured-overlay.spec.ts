import {
  FEATURED_COOKIE,
  applyFeaturedOverlay,
  clearFeaturedOverlay,
  nextFeaturedIds,
  overlayFeaturedFlag,
  parseFeaturedCookie,
  parseFeaturedIds,
  serializeFeaturedCookie,
  setFeaturedOverlay,
  shouldOverlayFeaturedPath,
} from '../src/common/featured-overlay';

describe('featured overlay', () => {
  afterEach(() => {
    clearFeaturedOverlay();
  });

  it('marks and sorts jobs for preview hosts without Neon', () => {
    setFeaturedOverlay('job-1', true);
    expect(overlayFeaturedFlag('job-1', false)).toBe(true);
    const listed = applyFeaturedOverlay([
      { id: 'job-2', title: 'B', featured: false },
      { id: 'job-1', title: 'A', featured: false },
    ]) as Array<{ id: string; featured: boolean }>;
    expect(listed[0]?.id).toBe('job-1');
    expect(listed[0]?.featured).toBe(true);
    setFeaturedOverlay('job-1', false);
    expect(overlayFeaturedFlag('job-1', false)).toBe(false);
  });

  it('overlays paginated search payloads', () => {
    setFeaturedOverlay('job-9', true);
    const page = applyFeaturedOverlay({
      data: [{ id: 'job-9', featured: false }, { id: 'job-8', featured: false }],
      meta: { total: 2 },
    }) as { data: Array<{ featured: boolean }>; meta: { total: number } };
    expect(page.data[0]?.featured).toBe(true);
    expect(page.meta.total).toBe(2);
  });

  it('persists featured ids in a cookie and header for serverless preview hosts', () => {
    const ids = nextFeaturedIds(`${FEATURED_COOKIE}=job-a`, 'job-b', true);
    expect(ids).toEqual(expect.arrayContaining(['job-a', 'job-b']));
    expect(parseFeaturedCookie(`${FEATURED_COOKIE}=job-a%2Cjob-b`)).toEqual(['job-a', 'job-b']);
    expect(overlayFeaturedFlag('job-a', false, ['job-a'])).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/me/jobs')).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/auth/login')).toBe(false);
    expect(serializeFeaturedCookie(['job-a'])).toContain(`${FEATURED_COOKIE}=job-a`);
    expect(nextFeaturedIds(`${FEATURED_COOKIE}=job-a,job-b`, 'job-b', false)).toEqual(['job-a']);
  });

  it('applies cookie ids without in-memory state so another lambda can read them', () => {
    const extra = parseFeaturedIds(`${FEATURED_COOKIE}=job-7`, 'job-8');
    const listed = applyFeaturedOverlay(
      [
        { id: 'job-8', featured: false },
        { id: 'job-7', featured: false },
      ],
      extra,
    ) as Array<{ id: string; featured: boolean }>;
    expect(listed.map((job) => job.id)).toEqual(['job-8', 'job-7']);
    expect(listed.every((job) => job.featured)).toBe(true);
  });
});
