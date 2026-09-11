import {
  databaseEnvFlags,
  databaseHostname,
  describeDatabaseTarget,
  resolveDatabaseUrl,
  sanitizeDbError,
  selectPrismaAdapter,
} from '../common/database-target';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';

type PrismaProbe = {
  $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
};

export async function probeDatabase(options: {
  prisma: PrismaProbe;
  env?: NodeJS.Dict<string>;
  fetchFn?: typeof fetch;
}): Promise<{ db: boolean; dbError?: string }> {
  const env = options.env ?? process.env;
  if (shouldUseUpstream(env)) {
    try {
      const response = await (options.fetchFn ?? fetch)(`${upstreamApiUrl()}/api/health`);
      const body = (await response.json()) as { db?: boolean };
      if (body.db) {
        return { db: true };
      }
      return { db: false, dbError: 'upstream database offline' };
    } catch (error) {
      return { db: false, dbError: sanitizeDbError(error) };
    }
  }
  try {
    await options.prisma.$queryRaw`SELECT 1`;
    return { db: true };
  } catch (error) {
    return { db: false, dbError: sanitizeDbError(error) };
  }
}

export function healthEnvelope(
  probe: { db: boolean; dbError?: string },
  env: NodeJS.Dict<string> = process.env,
) {
  const resolved = resolveDatabaseUrl(env);
  const kind = describeDatabaseTarget(resolved.url);
  return {
    ok: true,
    db: probe.db,
    dbError: probe.dbError,
    dbHostKind: kind,
    dbHost: databaseHostname(resolved.url),
    dbAdapter: selectPrismaAdapter(Boolean(env.VERCEL), kind),
    dbSource: resolved.source,
    databaseEnv: databaseEnvFlags(env),
    service: 'hirestack-api',
    time: new Date().toISOString(),
    hasDatabaseUrl: Boolean(resolved.url),
    hasJwt: Boolean(env.JWT_ACCESS_SECRET || env.JWT_SECRET),
    upstreamMode: shouldUseUpstream(env),
    upstream: shouldUseUpstream(env) ? upstreamApiUrl() : undefined,
    gitSha: env.VERCEL_GIT_COMMIT_SHA || undefined,
  };
}
