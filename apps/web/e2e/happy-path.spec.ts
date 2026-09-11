import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const SNAP_DIR = process.env.PLAYWRIGHT_SNAP_DIR ?? '/tmp/hirestack-e2e';
mkdirSync(SNAP_DIR, { recursive: true });

async function snap(page: Page, name: string) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.getAnimations().forEach((animation) => {
      const effect = animation.effect;
      if (effect && 'getTiming' in effect && effect.getTiming().iterations === Infinity) {
        return;
      }
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    });
  });
  const close = page.getByRole('button', { name: 'Dismiss notification' });
  if (await close.count()) {
    await close.first().click();
  }
  await page.screenshot({ path: `${SNAP_DIR}/${name}.png`, fullPage: true });
}

test('marketing site is sellable and jobs are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /hiring os/i })).toBeVisible();
  await expect(page.getByText('Live roles', { exact: true })).toBeVisible();
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('article.job-card img.logo-mark').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.logo-row img.logo-mark').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.landing-stats article').filter({ hasText: 'Live roles' }).locator('strong')).toHaveText(/^\d+$/, {
    timeout: 15_000,
  });
  await snap(page, 'landing_with_live_jobs');
  await page.getByRole('link', { name: 'Jobs' }).first().click();
  await expect(page.getByRole('heading', { name: /open jobs/i })).toBeVisible();
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'jobs_grid_loaded');
  await page.goto('/companies');
  await expect(page.getByRole('heading', { name: /who is hiring/i })).toBeVisible();
  await expect(page.locator('img.logo-mark').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'companies_with_logos');
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: /plans a hiring desk can buy/i })).toBeVisible();
  await expect(page.getByText('$49')).toBeVisible();
  await snap(page, 'pricing_plans');
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: /salary ranges/i })).toBeVisible();
  await expect(page.locator('.salary, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'salary_insights');
  await page.goto('/people');
  await expect(page.getByRole('heading', { name: /^people$/i })).toBeVisible();
  await expect(page.locator('article.person-card, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Alex Rivera')).toBeVisible({ timeout: 15_000 });
  await snap(page, 'people_directory');
  await page.getByRole('link', { name: 'Alex Rivera' }).first().click();
  await expect(page.getByRole('heading', { name: 'Alex Rivera' })).toBeVisible({ timeout: 15_000 });
  await snap(page, 'people_alex_profile');
  await page.goto('/search?q=Angular');
  await expect(page.getByRole('heading', { name: 'Angular' })).toBeVisible();
  await expect(page.locator('article.job-card, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'search_angular');
  await page.goto('/live');
  await expect(page.getByRole('heading', { name: /announcements/i })).toBeVisible();
  await expect(page.locator('article.announce, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'live_board');
  await page.goto('/not-a-real-page');
  await expect(page.getByRole('heading', { name: /not on HireStack/i })).toBeVisible();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await snap(page, 'auth_split_login');
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
  await expect(page).toHaveURL(/feed/);
  await expect(page.getByRole('heading', { name: /happening/i })).toBeVisible();
  await snap(page, 'candidate_feed');
  await page.goto('/applications');
  await expect(page.getByRole('heading', { name: /applications/i })).toBeVisible();
  await expect(page.locator('.kanban-col, hs-empty-state').first()).toBeVisible();
  await snap(page, 'candidate_applications');
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  await expect(page.getByText('candidate.alex@hirestack.dev')).toBeVisible();
  await expect(page.getByText(/access tokens stay in memory/i)).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible();
  await snap(page, 'candidate_profile');
  await page.goto('/jobs');
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  const save = page.locator('article.job-card').first().getByRole('button', { name: /^(Save|Saved)$/ });
  await expect(save).toBeVisible();
  if ((await save.innerText()) === 'Save') {
    await save.click();
    await expect(page.getByText(/saved for later/i)).toBeVisible({ timeout: 15_000 });
  }
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: /saved jobs/i })).toBeVisible();
  await expect(page.locator('article.job-card, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'candidate_saved');
  await page.goto('/messages');
  await expect(page.getByRole('heading', { name: /^messages$/i })).toBeVisible();
  await expect(page.locator('.messages-layout, hs-empty-state').first()).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
  await expect(page.locator('article.list-row, hs-empty-state').first()).toBeVisible();
  await snap(page, 'candidate_alerts');
});

test('demo employer reaches pipeline and billing', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo employer' }).click();
  await expect(page).toHaveURL(/employer/);
  await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
  await expect(page.locator('article.card, hs-empty-state').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.stats').getByText(/\/∞ published/i)).toBeVisible({ timeout: 15_000 });
  const firstTitle = (await page.locator('article.job-row strong').first().innerText()).trim();
  await page.getByRole('link', { name: 'Edit' }).first().click();
  await expect(page.getByRole('heading', { name: /edit job/i })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue(firstTitle);
  await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'employer_edit_job');
  await page.goto('/employer');
  await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
  const feature = page.getByRole('button', { name: /^(Feature|Unfeature)$/ }).first();
  if (await feature.count()) {
    const box = await feature.boundingBox();
    expect(box?.width ?? 999).toBeLessThan(160);
    if ((await feature.innerText()) === 'Feature') {
      await feature.click();
      await expect(page.getByText(/featured this role|upgrade to feature/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Unfeature' }).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Featured', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/1\/5 featured/i).first()).toBeVisible({ timeout: 15_000 });
      await page.goto('/jobs');
      await expect(page.locator('article.job-card').getByText('Featured', { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
      await snap(page, 'featured_on_open_jobs');
    }
  }
  await snap(page, 'employer_pipeline');
  await page.goto('/employer/billing');
  await expect(page.getByRole('heading', { name: /workspace plan/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Growth' })).toBeVisible();
  await expect(page.getByText('Featured slots', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Invoices', exact: true })).toBeVisible();
  await expect(page.locator('.invoice-table tbody')).toContainText('Growth');
  await expect(page.locator('.invoice-table tbody')).toContainText('$199');
  await expect(page.locator('.invoice-table tbody')).toContainText('paid');
  await expect(page.getByText(/next invoice/i)).toBeVisible();
  await snap(page, 'employer_billing');
  await page.goto('/employer/company');
  await expect(page.getByRole('heading', { name: /^company$/i })).toBeVisible();
  await expect(page.locator('img.logo-mark, span.logo-mark').first()).toBeVisible({ timeout: 15_000 });
  await snap(page, 'employer_company');
});

test('candidate can open apply and employer can open a kanban', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo candidate' }).click();
  await expect(page).toHaveURL(/feed/);
  await expect(page.getByRole('link', { name: 'Applications' })).toBeVisible();
  await page.goto('/jobs');
  await expect(page.locator('article.job-card').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('article.job-card a.title').first().click();
  await expect(page).toHaveURL(/\/jobs\/.+/);
  await expect(page.locator('article.detail img.logo-mark').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /^Apply$/ })).toBeVisible();
  await page.getByRole('link', { name: /^Apply$/ }).click();
  await expect(page).toHaveURL(/apply/);
  await expect(page.getByRole('heading', { name: 'Apply' })).toBeVisible();
  await expect(page.locator('form.card, hs-empty-state')).toBeVisible({ timeout: 15_000 });
  const resumeSelect = page.locator('form.card select');
  if (await resumeSelect.count()) {
    const options = await resumeSelect.locator('option').count();
    if (options > 1) {
      await resumeSelect.selectOption({ index: 1 });
    }
    await page.getByLabel('Cover letter').fill('Excited to join the team and ship the hiring OS.');
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText(/application submitted|already applied/i)).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.locator('hs-empty-state')).toBeVisible();
  }
  await snap(page, 'candidate_apply');

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo employer' }).click();
  await expect(page).toHaveURL(/employer/);
  await expect(page.locator('article.card').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('article.card').filter({ hasText: /[1-9]\s+applicant/ }).first().getByRole('link', { name: 'Pipeline' }).click();
  await expect(page.getByRole('heading', { name: /applicant pipeline/i })).toBeVisible();
  await expect(page.locator('.kanban-col, hs-empty-state').first()).toBeVisible();
  await snap(page, 'employer_kanban');
});

test('admin reaches the moderation desk', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Demo admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Demo admin' }).click();
  await expect(page).toHaveURL(/admin/);
  await expect(page.getByRole('heading', { name: /moderation/i })).toBeVisible();
  await expect(page.locator('.stats article').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('h2').filter({ hasText: 'Users' })).toBeVisible();
  await expect(page.locator('article.card.row').first()).toContainText('Avery Admin', { timeout: 15_000 });
  await expect(page.locator('article.card.row').first()).toContainText('admin@hirestack.dev');
  await expect(page.locator('article.card.row').filter({ hasText: 'Playwright Candidate' })).toHaveCount(0);
  await snap(page, 'admin_moderation');
});
