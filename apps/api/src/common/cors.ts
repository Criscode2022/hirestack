const STATIC_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://hirestack-web.vercel.app',
  'https://hirestack-angular-web.vercel.app',
];

const PREVIEW_ORIGIN =
  /^https:\/\/hirestack-(?:angular(?:-web)?|web|nestjs-api|api)[a-z0-9.-]*\.vercel\.app$/i;

export function configuredOrigins(webOrigin = process.env.WEB_ORIGIN): string[] {
  const extra = (webOrigin ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...STATIC_ORIGINS, ...extra])];
}

export function isAllowedOrigin(origin: string | undefined, webOrigin = process.env.WEB_ORIGIN): boolean {
  if (!origin) {
    return true;
  }
  if (configuredOrigins(webOrigin).includes(origin)) {
    return true;
  }
  return PREVIEW_ORIGIN.test(origin);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isAllowedOrigin(origin));
}
