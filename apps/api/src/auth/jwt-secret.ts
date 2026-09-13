export const JWT_ACCESS_FALLBACK = 'hirestack-missing-jwt-access-secret';

export function jwtAccessSecret(value?: string | null): string {
  return value?.trim() || process.env.JWT_ACCESS_SECRET?.trim() || process.env.JWT_SECRET?.trim() || JWT_ACCESS_FALLBACK;
}
