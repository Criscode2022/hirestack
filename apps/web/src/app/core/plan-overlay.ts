const STORAGE_KEY = 'hs_plan';
export const PLAN_HEADER = 'X-HireStack-Plan';

function canUseBrowser(): boolean {
  return typeof globalThis.document !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function readPlanOverlay(): string | null {
  if (!canUseBrowser()) {
    return null;
  }
  try {
    const fromStorage = globalThis.localStorage.getItem(STORAGE_KEY);
    if (fromStorage) {
      return fromStorage;
    }
    const match = globalThis.document.cookie.match(/(?:^|;\s*)hs_plan=([^;]*)/);
    if (!match) {
      return null;
    }
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function rememberPlan(plan: string): void {
  if (!canUseBrowser()) {
    return;
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, plan);
  } catch {
    // Private mode can block storage; the cookie header still travels.
  }
  globalThis.document.cookie = `hs_plan=${encodeURIComponent(plan)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function planOverlayHeaders(): Record<string, string> {
  const plan = readPlanOverlay();
  return plan ? { [PLAN_HEADER]: plan } : {};
}
