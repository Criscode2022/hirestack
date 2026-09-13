import { healthEnvelope, probeDatabase } from '../src/health/health-snapshot';

describe('health snapshot', () => {
  it('uses local prisma when a database URL is set', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const probe = await probeDatabase({
      prisma,
      env: { DATABASE_URL: 'postgresql://example' },
      fetchFn: jest.fn(),
    });
    expect(probe).toEqual({ db: true });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('reads upstream database health on Vercel without a local URL', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, db: true }),
    });
    const prisma = { $queryRaw: jest.fn() };
    const probe = await probeDatabase({
      prisma,
      env: { VERCEL: '1' },
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(probe).toEqual({ db: true });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledWith('https://hirestack-api.vercel.app/api/health');
  });

  it('marks the envelope as upstream without exposing a false local database', () => {
    const body = healthEnvelope({ db: true }, { VERCEL: '1' });
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    expect(body.upstreamMode).toBe(true);
    expect(body.hasDatabaseUrl).toBe(false);
    expect(body.hasBlob).toBe(false);
  });

  it('reports object storage without echoing the blob token', () => {
    const body = healthEnvelope({ db: true }, { BLOB_READ_WRITE_TOKEN: 'blob-token' });
    expect(body.hasBlob).toBe(true);
    expect(JSON.stringify(body)).not.toContain('blob-token');
  });

  it('reports checkout mode without echoing the Stripe secret', () => {
    const body = healthEnvelope({ db: true }, { STRIPE_SECRET_KEY: 'sk_test_secret' });
    expect(body.hasStripe).toBe(true);
    expect(JSON.stringify(body)).not.toContain('sk_test_secret');
  });
});
