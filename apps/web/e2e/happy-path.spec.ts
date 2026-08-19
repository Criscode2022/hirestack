import { expect, test } from '@playwright/test';

test('register, search, and apply happy path', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find the role/i })).toBeVisible();
  await page.getByRole('link', { name: 'Jobs' }).click();
  await expect(page.getByRole('heading', { name: 'Job search' })).toBeVisible();

  await page.goto('/register');
  const stamp = Date.now();
  await page.getByLabel('Name').fill('Playwright Candidate');
  await page.getByLabel('Email').fill(`pw.${stamp}@hirestack.dev`);
  await page.getByLabel('Password').fill('HireStack!2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/profile/);
});
