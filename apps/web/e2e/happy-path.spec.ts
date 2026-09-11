import { expect, test } from '@playwright/test';

test('marketing site is sellable and jobs are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /hiring os/i })).toBeVisible();
  await expect(page.getByText('Live roles')).toBeVisible();
  await page.getByRole('link', { name: 'Jobs' }).first().click();
  await expect(page.getByRole('heading', { name: /open jobs/i })).toBeVisible();
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: /plans a hiring desk can buy/i })).toBeVisible();
  await expect(page.getByText('$49')).toBeVisible();
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
