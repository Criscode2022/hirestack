import { attachSkillMatch, skillSlugsFromProfile } from '../jobs/upstream-board';

export function shouldOverlayCompanyOwnerPath(path: string): boolean {
  return /^\/api\/companies\/[^/]+$/.test(path);
}

export function companyOwnerId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const ownerId = (payload as { ownerId?: unknown }).ownerId;
  return typeof ownerId === 'string' && ownerId.length ? ownerId : undefined;
}

export function attachCompanyOwner(company: unknown, person: unknown): unknown {
  if (!company || typeof company !== 'object') {
    return company;
  }
  const record = company as Record<string, unknown>;
  if (record.owner && typeof record.owner === 'object') {
    return company;
  }
  if (!person || typeof person !== 'object') {
    return company;
  }
  const profile = person as { id?: unknown; name?: unknown; headline?: unknown };
  const id =
    typeof profile.id === 'string' && profile.id
      ? profile.id
      : typeof record.ownerId === 'string'
        ? record.ownerId
        : undefined;
  const name = typeof profile.name === 'string' ? profile.name : '';
  if (!id || !name) {
    return company;
  }
  return {
    ...record,
    owner: {
      id,
      name,
      headline: typeof profile.headline === 'string' ? profile.headline : null,
    },
  };
}

export async function overlayCompanyOwner(
  payload: unknown,
  fetchImpl: typeof fetch,
  upstream: string,
): Promise<unknown> {
  if (payload && typeof payload === 'object' && (payload as { owner?: unknown }).owner) {
    return payload;
  }
  const ownerId = companyOwnerId(payload);
  if (!ownerId) {
    return payload;
  }
  try {
    const response = await fetchImpl(`${upstream}/api/people/${encodeURIComponent(ownerId)}`);
    if (!response.ok) {
      return payload;
    }
    return attachCompanyOwner(payload, await response.json());
  } catch {
    return payload;
  }
}

export function attachCompanyJobMatches(company: unknown, skillSlugs: string[]): unknown {
  if (!company || typeof company !== 'object' || !skillSlugs.length) {
    return company;
  }
  const record = company as Record<string, unknown>;
  if (!Array.isArray(record.jobs)) {
    return company;
  }
  return {
    ...record,
    jobs: record.jobs.map((job) => attachSkillMatch(job, skillSlugs)),
  };
}

export async function overlayCompanyDetail(
  payload: unknown,
  fetchImpl: typeof fetch,
  upstream: string,
  authorization?: string,
): Promise<unknown> {
  const withOwner = await overlayCompanyOwner(payload, fetchImpl, upstream);
  if (!authorization) {
    return withOwner;
  }
  try {
    const meRes = await fetchImpl(`${upstream}/api/auth/me`, { headers: { authorization } });
    if (!meRes.ok) {
      return withOwner;
    }
    const me = (await meRes.json()) as { id?: string };
    if (!me.id) {
      return withOwner;
    }
    const profileRes = await fetchImpl(`${upstream}/api/people/${encodeURIComponent(me.id)}`, {
      headers: { authorization },
    });
    if (!profileRes.ok) {
      return withOwner;
    }
    return attachCompanyJobMatches(withOwner, skillSlugsFromProfile(await profileRes.json()));
  } catch {
    return withOwner;
  }
}
