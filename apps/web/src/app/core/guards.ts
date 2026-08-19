import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { UserRole } from '@hirestack/shared';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.bootstrap();
  }
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const roleGuard = (...roles: UserRole[]): CanActivateFn => {
  return async () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.ready()) {
      await auth.bootstrap();
    }
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    if (!auth.hasRole(...roles)) {
      return router.createUrlTree(['/forbidden']);
    }
    return true;
  };
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.bootstrap();
  }
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
