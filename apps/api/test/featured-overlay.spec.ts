import {
  applyFeaturedOverlay,
  overlayFeaturedFlag,
  setFeaturedOverlay,
  shouldOverlayFeaturedPath,
} from '../src/common/featured-overlay';

describe('featured overlay', () => {
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
    setFeaturedOverlay('job-9', false);
  });

  it('applies to marketplace job reads used by the web app', () => {
    expect(shouldOverlayFeaturedPath('/api/jobs?pageSize=3')).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/jobs/featured')).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/me/jobs')).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/jobs/abc')).toBe(true);
    expect(shouldOverlayFeaturedPath('/api/auth/login')).toBe(false);
  });
});
