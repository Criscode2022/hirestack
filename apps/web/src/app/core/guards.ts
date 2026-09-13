import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { UserRole } from '@hirestack/shared';
import { AuthStore } from './auth.store';

export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://') || raw.includes('\\')) {
    return null;
  }
  if (raw === '/login' || raw.startsWith('/login?') || raw === '/register' || raw.startsWith('/register?')) {
    return null;
  }
  return raw;
}

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.bootstrap();
  }
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  }
  return true;
};

export const roleGuard = (...roles: UserRole[]): CanActivateFn => {
  return async (_route, state) => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.ready()) {
      await auth.bootstrap();
    }
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
    }
    if (!auth.hasRole(...roles)) {
      return router.createUrlTree(['/forbidden']);
    }
    return true;
  };
};

export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.bootstrap();
  }
  if (!auth.isAuthenticated()) {
    return true;
  }
  const next = safeInternalPath(route.queryParamMap.get('next'));
  return router.parseUrl(next ?? '/');
};
