import { shouldProxyPath, shouldUseUpstream } from '../src/common/upstream';

describe('upstream preview mode', () => {
  it('only proxies on Vercel when no database URL is configured', () => {
    expect(shouldUseUpstream({})).toBe(false);
    expect(shouldUseUpstream({ VERCEL: '1' })).toBe(true);
    expect(shouldUseUpstream({ VERCEL: '1', DATABASE_URL: 'postgresql://example' })).toBe(false);
  });

  it('keeps health and billing local and proxies the marketplace', () => {
    expect(shouldProxyPath('/api/health')).toBe(false);
    expect(shouldProxyPath('/api/billing/plans')).toBe(false);
    expect(shouldProxyPath('/api/billing/workspace')).toBe(false);
    expect(shouldProxyPath('/api/billing/invoices')).toBe(false);
    expect(shouldProxyPath('/api/docs')).toBe(false);
    expect(shouldProxyPath('/api/jobs/job_123/feature')).toBe(false);
    expect(shouldProxyPath('/api/me/jobs')).toBe(false);
    expect(shouldProxyPath('/api/me/jobs/job_123')).toBe(false);
    expect(shouldProxyPath('/api/jobs')).toBe(false);
    expect(shouldProxyPath('/api/jobs?pageSize=3')).toBe(false);
    expect(shouldProxyPath('/api/jobs/featured')).toBe(false);
    expect(shouldProxyPath('/api/jobs/senior-angular-engineer')).toBe(false);
    expect(shouldProxyPath('/api/people')).toBe(false);
    expect(shouldProxyPath('/api/people/user_123')).toBe(true);
    expect(shouldProxyPath('/api/admin/users')).toBe(false);
    expect(shouldProxyPath('/api/jobs/job_123/publish')).toBe(true);
    expect(shouldProxyPath('/api/auth/login')).toBe(true);
    expect(shouldProxyPath('/api/me/employer-dashboard')).toBe(true);
  });
});
