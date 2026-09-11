export const JWT_ACCESS_FALLBACK = 'hirestack-missing-jwt-access-secret';

export function jwtAccessSecret(value?: string | null): string {
  return value?.trim() || JWT_ACCESS_FALLBACK;
}
