import type { IncomingHttpHeaders } from 'node:http';
import type { Request, Response } from 'express';
import { resolveDatabaseUrl } from './database-target';
import { applyFeaturedOverlay, parseFeaturedIds, shouldOverlayFeaturedPath } from './featured-overlay';
import { rewriteSearchPeople } from '../network/directory-upstream';

export const DEFAULT_UPSTREAM_API_URL = 'https://hirestack-api.vercel.app';

export function upstreamApiUrl(): string {
  return (process.env.UPSTREAM_API_URL || DEFAULT_UPSTREAM_API_URL).replace(/\/$/, '');
}

export function shouldUseUpstream(env: NodeJS.Dict<string> = process.env): boolean {
  return Boolean(env.VERCEL) && !resolveDatabaseUrl(env).url;
}

export function shouldProxyPath(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0] ?? '';
  if (path === '/api/health' || path.startsWith('/api/health/')) {
    return false;
  }
  if (path.startsWith('/api/billing')) {
    return false;
  }
  if (path.startsWith('/api/docs')) {
    return false;
  }
  if (path === '/api/jobs' || path === '/api/jobs/featured') {
    return false;
  }
  if (/^\/api\/jobs\/[^/]+$/.test(path)) {
    return false;
  }
  if (/^\/api\/jobs\/[^/]+\/feature$/.test(path)) {
    return false;
  }
  if (path === '/api/me/jobs' || /^\/api\/me\/jobs\/[^/]+$/.test(path)) {
    return false;
  }
  if (path === '/api/me/employer-dashboard') {
    return false;
  }
  if (path === '/api/people') {
    return false;
  }
  if (path === '/api/admin/users') {
    return false;
  }
  return true;
}

const HOP_BY_HOP = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function headersForUpstream(headers: IncomingHttpHeaders): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) {
      continue;
    }
    out.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  return out;
}

export async function resolveUpstreamUser(
  authorization: string | undefined,
): Promise<{ id: string; email: string; role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' } | null> {
  if (!authorization) {
    return null;
  }
  const response = await fetch(`${upstreamApiUrl()}/api/auth/me`, {
    headers: { authorization },
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { id?: string; email?: string; role?: string };
  if (!body.id || !body.email || !body.role) {
    return null;
  }
  return { id: body.id, email: body.email, role: body.role as 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' };
}

export async function proxyToUpstream(req: Request, res: Response): Promise<void> {
  const headers = headersForUpstream(req.headers);
  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers, redirect: 'manual' };
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!['GET', 'HEAD'].includes(method)) {
    if (rawBody && rawBody.length) {
      init.body = new Uint8Array(rawBody);
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
      init.body = JSON.stringify(req.body);
      headers.set('content-type', headers.get('content-type') || 'application/json');
    }
  }
  const response = await fetch(`${upstreamApiUrl()}${req.originalUrl}`, init);
  res.status(response.status);
  res.setHeader('x-hirestack-upstream', '1');
  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) {
      return;
    }
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  if (cookies.length) {
    res.setHeader('set-cookie', cookies);
  }
  let buf: Buffer = Buffer.from(await response.arrayBuffer());
  const path = req.originalUrl.split('?')[0] ?? '';
  if (response.ok) {
    if (
      shouldOverlayFeaturedPath(req.originalUrl) ||
      path === '/api/search' ||
      path === '/api/me/applications'
    ) {
      try {
        let payload: unknown = JSON.parse(buf.toString('utf8'));
        if (shouldOverlayFeaturedPath(req.originalUrl)) {
          const extra = parseFeaturedIds(
            Array.isArray(req.headers.cookie) ? req.headers.cookie.join('; ') : req.headers.cookie,
            req.headers['x-hirestack-featured'],
          );
          payload = applyFeaturedOverlay(payload, extra);
        }
        if (path === '/api/search' && payload && typeof payload === 'object') {
          payload = rewriteSearchPeople(payload as { people?: unknown[] });
        }
        if (path === '/api/me/applications') {
          payload = await overlayMineApplications(payload);
        }
        buf = Buffer.from(JSON.stringify(payload));
      } catch {
        // Keep the upstream body when it is not JSON.
      }
    }
  } else {
    buf = rewriteStaleUpstreamWrite(path, response.status, buf);
  }
  res.end(buf);
}

type ApplicationOwnerRow = {
  job?: {
    slug?: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string;
    employmentType?: string;
    location?: string | null;
    workplace?: string;
    company?: { name?: string; slug?: string; ownerId?: string; logoUrl?: string | null };
  };
};

export type ApplicationJobOverlay = {
  ownerId?: string;
  slug?: string;
  logoUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  employmentType?: string;
  location?: string | null;
  workplace?: string;
};

export function mergeApplicationOwners(
  payload: unknown,
  owners: Record<string, ApplicationJobOverlay>,
): unknown {
  if (!Array.isArray(payload)) {
    return payload;
  }
  return payload.map((row) => {
    if (!row || typeof row !== 'object') {
      return row;
    }
    const app = row as ApplicationOwnerRow;
    const slug = app.job?.slug;
    const extra = slug ? owners[slug] : undefined;
    if (!extra || !app.job) {
      return row;
    }
    return {
      ...app,
      job: {
        ...app.job,
        salaryMin: app.job.salaryMin ?? extra.salaryMin,
        salaryMax: app.job.salaryMax ?? extra.salaryMax,
        currency: app.job.currency ?? extra.currency,
        employmentType: app.job.employmentType ?? extra.employmentType,
        location: app.job.location ?? extra.location,
        workplace: app.job.workplace ?? extra.workplace,
        company: {
          ...app.job.company,
          ownerId: app.job.company?.ownerId || extra.ownerId,
          slug: app.job.company?.slug || extra.slug,
          logoUrl: app.job.company?.logoUrl || extra.logoUrl,
        },
      },
    };
  });
}

export async function overlayMineApplications(
  payload: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<unknown> {
  if (!Array.isArray(payload)) {
    return payload;
  }
  const slugs = [
    ...new Set(
      payload
        .map((row) =>
          row && typeof row === 'object' ? (row as ApplicationOwnerRow).job?.slug : undefined,
        )
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];
  const owners: Record<string, ApplicationJobOverlay> = {};
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const res = await fetchFn(`${upstreamApiUrl()}/api/jobs/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          return;
        }
        const job = (await res.json()) as {
          salaryMin?: number | null;
          salaryMax?: number | null;
          currency?: string;
          employmentType?: string;
          location?: string | null;
          workplace?: string;
          company?: { ownerId?: string; slug?: string; logoUrl?: string | null };
        };
        owners[slug] = {
          ownerId: job.company?.ownerId,
          slug: job.company?.slug,
          logoUrl: job.company?.logoUrl,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          employmentType: job.employmentType,
          location: job.location,
          workplace: job.workplace,
        };
      } catch {
        // Keep the row without an owner overlay.
      }
    }),
  );
  return mergeApplicationOwners(payload, owners);
}

export function rewriteStaleUpstreamWrite(path: string, status: number, body: Buffer): Buffer {
  if (status !== 403) {
    return body;
  }
  if (!/^\/api\/applications\/[^/]+\/(transition|withdraw)$/.test(path)) {
    return body;
  }
  return Buffer.from(
    JSON.stringify({
      statusCode: 403,
      code: 'UPSTREAM_STALE',
      message: 'Candidate offer actions need this SHA on the production API',
    }),
  );
}
