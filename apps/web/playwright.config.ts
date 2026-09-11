import { defineConfig } from '@playwright/test';

const remote = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './apps/web/e2e',
  use: {
    baseURL: remote ?? 'http://localhost:4200',
  },
  webServer: remote
    ? undefined
    : [
        { command: 'pnpm --filter @hirestack/api dev', port: 3000, reuseExistingServer: true },
        { command: 'pnpm --filter @hirestack/web dev', port: 4200, reuseExistingServer: true },
      ],
});
