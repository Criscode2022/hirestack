import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  use: {
    baseURL: 'http://localhost:4200',
  },
  webServer: [
    { command: 'pnpm --filter @hirestack/api dev', port: 3000, reuseExistingServer: true },
    { command: 'pnpm --filter @hirestack/web dev', port: 4200, reuseExistingServer: true },
  ],
});
