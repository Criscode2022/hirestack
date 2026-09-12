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
    if (shouldOverlayFeaturedPath(req.originalUrl) || path === '/api/search') {
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
