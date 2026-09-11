export type DatabaseHostKind = 'none' | 'neon' | 'vercel-postgres' | 'local' | 'other' | 'unparseable';
export type PrismaAdapterKind = 'neon-http' | 'neon-ws' | 'prisma-tcp';

function parseDatabaseUrl(url = process.env.DATABASE_URL): URL | undefined {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url.replace(/^postgres(ql)?:/i, 'https:'));
  } catch {
    return undefined;
  }
}

export function describeDatabaseTarget(url = process.env.DATABASE_URL): DatabaseHostKind {
  if (!url) {
    return 'none';
  }
  const parsed = parseDatabaseUrl(url);
  if (!parsed) {
    return 'unparseable';
  }
  const host = parsed.hostname.toLowerCase();
  if (host.includes('neon.tech') || host.includes('neon.build')) {
    return 'neon';
  }
  if (host.includes('vercel-storage.com') || host.includes('postgres.vercel')) {
    return 'vercel-postgres';
  }
  if (host === '127.0.0.1' || host === 'localhost' || host.endsWith('.local')) {
    return 'local';
  }
  return 'other';
}

export function databaseHostname(url = process.env.DATABASE_URL): string | undefined {
  return parseDatabaseUrl(url)?.hostname;
}

export function selectPrismaAdapter(
  vercel = Boolean(process.env.VERCEL),
  kind: DatabaseHostKind = describeDatabaseTarget(),
): PrismaAdapterKind {
  if (vercel && kind !== 'neon' && kind !== 'none' && kind !== 'unparseable') {
    return 'prisma-tcp';
  }
  return 'neon-ws';
}

export function sanitizeDbError(error: unknown): string {
  const chunks: string[] = [];
  const walk = (value: unknown, depth = 0) => {
    if (value == null || depth > 4) {
      return;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      chunks.push(String(value));
      return;
    }
    if (typeof value !== 'object') {
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of ['code', 'name', 'message'] as const) {
      if (record[key]) {
        chunks.push(String(record[key]));
      }
    }
    if (record.cause) {
      walk(record.cause, depth + 1);
    }
  };
  walk(error);
  const raw = chunks.filter(Boolean).join(' | ') || 'unknown';
  return raw
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://***@')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]')
    .slice(0, 240);
}
