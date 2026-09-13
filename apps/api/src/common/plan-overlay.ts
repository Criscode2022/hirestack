import { BILLING_PLAN_IDS, BillingPlan } from '@hirestack/shared';

const store = new Map<string, BillingPlan>();
export const PLAN_COOKIE = 'hs_plan';
export const PLAN_HEADER = 'x-hirestack-plan';

export function parsePlanValue(raw?: string | null): BillingPlan | null {
  const value = raw?.trim().toUpperCase();
  if (value && (BILLING_PLAN_IDS as string[]).includes(value)) {
    return value as BillingPlan;
  }
  return null;
}

export function parsePlanCookie(cookieHeader?: string): BillingPlan | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) {
      continue;
    }
    const name = part.slice(0, idx).trim();
    if (name !== PLAN_COOKIE) {
      continue;
    }
    try {
      return parsePlanValue(decodeURIComponent(part.slice(idx + 1)));
    } catch {
      return parsePlanValue(part.slice(idx + 1));
    }
  }
  return null;
}

export function resolvePlanOverlay(
  ownerId: string,
  cookieHeader?: string,
  header?: string | string[],
): BillingPlan | null {
  const remembered = store.get(ownerId);
  if (remembered) {
    return remembered;
  }
  const rawHeader = Array.isArray(header) ? header[0] : header;
  return parsePlanValue(rawHeader) ?? parsePlanCookie(cookieHeader);
}

export function setPlanOverlay(ownerId: string, plan: BillingPlan) {
  store.set(ownerId, plan);
}

export function clearPlanOverlay() {
  store.clear();
}

export function serializePlanCookie(plan: BillingPlan): string {
  const parts = [`${PLAN_COOKIE}=${plan}`, 'Path=/', 'Max-Age=2592000', 'SameSite=Lax'];
  if (process.env.VERCEL) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
