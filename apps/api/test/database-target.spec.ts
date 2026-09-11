import {
  databaseHostname,
  describeDatabaseTarget,
  sanitizeDbError,
  selectPrismaAdapter,
} from '../src/common/database-target';

describe('database target', () => {
  it('classifies neon, vercel postgres, and local URLs', () => {
    expect(describeDatabaseTarget(undefined)).toBe('none');
    expect(
      describeDatabaseTarget('postgresql://user:pass@ep-foo-123.us-east-1.aws.neon.tech/neondb?sslmode=require'),
    ).toBe('neon');
    expect(
      describeDatabaseTarget('postgres://default:pass@ep-foo.postgres.vercel-storage.com/verceldb'),
    ).toBe('vercel-postgres');
    expect(describeDatabaseTarget('postgresql://127.0.0.1:65535/hirestack_unconfigured')).toBe('local');
    expect(
      databaseHostname('postgresql://user:pass@ep-foo-123.us-east-1.aws.neon.tech/neondb'),
    ).toBe('ep-foo-123.us-east-1.aws.neon.tech');
  });

  it('uses TCP on Vercel for non-Neon hosts and websockets for Neon', () => {
    expect(selectPrismaAdapter(true, 'vercel-postgres')).toBe('prisma-tcp');
    expect(selectPrismaAdapter(true, 'other')).toBe('prisma-tcp');
    expect(selectPrismaAdapter(true, 'neon')).toBe('neon-ws');
    expect(selectPrismaAdapter(false, 'neon')).toBe('neon-ws');
  });

  it('redacts credentials in error strings', () => {
    expect(
      sanitizeDbError(
        new Error('Can\'t reach postgresql://user:secret@ep-foo.us-east-1.aws.neon.tech/neondb'),
      ),
    ).toContain('postgresql://***@');
    expect(sanitizeDbError({ code: 'P1001', message: 'Can\'t reach database server' })).toContain('P1001');
  });
});
