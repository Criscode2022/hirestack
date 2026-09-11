import { JWT_ACCESS_FALLBACK, jwtAccessSecret } from '../src/auth/jwt-secret';

describe('jwtAccessSecret', () => {
  it('uses the configured secret and falls back when env is empty', () => {
    expect(jwtAccessSecret('  live-secret  ')).toBe('live-secret');
    expect(jwtAccessSecret('')).toBe(JWT_ACCESS_FALLBACK);
    expect(jwtAccessSecret(undefined)).toBe(JWT_ACCESS_FALLBACK);
  });
});
