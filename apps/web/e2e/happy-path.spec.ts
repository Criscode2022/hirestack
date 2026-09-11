import { expect, test, type Page } from '@playwright/test';

async function snap(page: Page, name: string) {
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}.png`, fullPage: true });
}

test('marketing site is sellable and jobs are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /hiring os/i })).toBeVisible();
  await expect(page.getByText('Live roles')).toBeVisible();
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'landing_with_live_jobs');
  await page.getByRole('link', { name: 'Jobs' }).first().click();
  await expect(page.getByRole('heading', { name: /open jobs/i })).toBeVisible();
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'jobs_grid_loaded');
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: /plans a hiring desk can buy/i })).toBeVisible();
  await expect(page.getByText('$49')).toBeVisible();
  await snap(page, 'pricing_plans');
});

test('register, search, and apply happy path', async ({ page }) => {
  await page.goto('/register');
  const stamp = Date.now();
  await page.getByLabel('Name').fill('Playwright Candidate');
  await page.getByLabel('Email').fill(`pw.${stamp}@hirestack.dev`);
  await page.getByLabel('Password').fill('HireStack!2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/profile/);
});

test('demo candidate reaches the feed', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo candidate' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/feed/);
  await expect(page.getByRole('heading', { name: /happening/i })).toBeVisible();
  await snap(page, 'candidate_feed');
});

test('demo employer reaches pipeline and billing', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo employer' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/employer/);
  await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
  await snap(page, 'employer_pipeline');
  await page.goto('/employer/billing');
  await expect(page.getByRole('heading', { name: /workspace plan/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Growth' })).toBeVisible();
  await snap(page, 'employer_billing');
});
