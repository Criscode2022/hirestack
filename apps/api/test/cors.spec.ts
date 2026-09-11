import { configuredOrigins, isAllowedOrigin } from '../src/common/cors';

describe('cors allowlist', () => {
  it('always allows local Angular and production web hosts', () => {
    expect(configuredOrigins('')).toEqual(
      expect.arrayContaining([
        'http://localhost:4200',
        'https://hirestack-web.vercel.app',
      ]),
    );
  });

  it('merges comma-separated WEB_ORIGIN values', () => {
    expect(configuredOrigins('https://app.hirestack.dev, https://staging.hirestack.dev')).toEqual(
      expect.arrayContaining(['https://app.hirestack.dev', 'https://staging.hirestack.dev']),
    );
  });

  it('allows same-origin requests with no Origin header', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
  });

  it('allows GitHub-connected Vercel preview hosts', () => {
    expect(
      isAllowedOrigin('https://hirestack-angular-3vpl7j2wj-criscode2022s-projects.vercel.app'),
    ).toBe(true);
    expect(isAllowedOrigin('https://hirestack-web.vercel.app')).toBe(true);
  });

  it('rejects unrelated origins', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('https://random-app.vercel.app')).toBe(false);
  });
});
