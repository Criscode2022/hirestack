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
