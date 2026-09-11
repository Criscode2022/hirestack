import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4200';
const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: 'apps/web/e2e',
  timeout: remote ? 90_000 : 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: process.env.PLAYWRIGHT_VIDEO === 'on' ? 'on' : 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
