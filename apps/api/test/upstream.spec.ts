import {
  mergeApplicationOwners,
  rewriteStaleUpstreamWrite,
  shouldProxyPath,
  shouldUseUpstream,
} from '../src/common/upstream';

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
    expect(shouldProxyPath('/api/me/employer-dashboard')).toBe(false);
    expect(shouldProxyPath('/api/jobs')).toBe(false);
    expect(shouldProxyPath('/api/jobs?pageSize=3')).toBe(false);
    expect(shouldProxyPath('/api/jobs/featured')).toBe(false);
    expect(shouldProxyPath('/api/jobs/senior-angular-engineer')).toBe(false);
    expect(shouldProxyPath('/api/people')).toBe(false);
    expect(shouldProxyPath('/api/people/user_123')).toBe(true);
    expect(shouldProxyPath('/api/admin/users')).toBe(false);
    expect(shouldProxyPath('/api/jobs/job_123/publish')).toBe(true);
    expect(shouldProxyPath('/api/jobs/job_123/applications')).toBe(true);
    expect(shouldProxyPath('/api/companies/northwind-labs')).toBe(true);
    expect(shouldProxyPath('/api/auth/login')).toBe(true);
    expect(shouldProxyPath('/api/auth/forgot')).toBe(false);
    expect(shouldProxyPath('/api/auth/reset')).toBe(false);
  });

  it('rewrites forbidden candidate offer writes while previewing against the old API', () => {
    const rewritten = rewriteStaleUpstreamWrite(
      '/api/applications/app_123/transition',
      403,
      Buffer.from('{"statusCode":403}'),
    );
    expect(JSON.parse(rewritten.toString())).toEqual({
      statusCode: 403,
      code: 'UPSTREAM_STALE',
      message: 'Candidate offer actions need this SHA on the production API',
    });
    const kept = rewriteStaleUpstreamWrite('/api/auth/login', 403, Buffer.from('{"statusCode":403}'));
    expect(kept.toString()).toBe('{"statusCode":403}');
  });

  it('fills hiring-lead ids, pay, and logos onto proxied application rows', () => {
    const merged = mergeApplicationOwners(
      [
        { id: 'app_1', job: { slug: 'ios-engineer', company: { name: 'Lumen Studio' } } },
        { id: 'app_2', job: { slug: 'unknown-role', company: { name: 'Atlas' } } },
      ],
      {
        'ios-engineer': {
          ownerId: 'user_lumen',
          slug: 'lumen-studio',
          logoUrl: 'https://cdn.example/lumen.svg',
          salaryMin: 100000,
          salaryMax: 135000,
          currency: 'USD',
          employmentType: 'FULL_TIME',
          workplace: 'ONSITE',
          location: 'London, UK',
        },
      },
    );
    expect(merged).toEqual([
      {
        id: 'app_1',
        job: {
          slug: 'ios-engineer',
          salaryMin: 100000,
          salaryMax: 135000,
          currency: 'USD',
          employmentType: 'FULL_TIME',
          workplace: 'ONSITE',
          location: 'London, UK',
          company: {
            name: 'Lumen Studio',
            ownerId: 'user_lumen',
            slug: 'lumen-studio',
            logoUrl: 'https://cdn.example/lumen.svg',
          },
        },
      },
      { id: 'app_2', job: { slug: 'unknown-role', company: { name: 'Atlas' } } },
    ]);
  });
});
