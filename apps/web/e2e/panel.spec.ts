import { expect, test } from '@playwright/test';
import { pl } from '../src/i18n/pl';
import { ADMIN } from './env';
import { logIn, seedEvaluatedAssessment } from './helpers';

test('wrong password is rejected', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel(pl.login.email).fill(ADMIN.email);
  await page.getByLabel(pl.login.password).fill('not the right password');
  await page.getByRole('button', { name: pl.login.submit }).click();
  await expect(page.getByText(pl.login.invalid)).toBeVisible();
});

test('recruiter creates an assessment and gets the candidate link', async ({ page }) => {
  await logIn(page);
  await page.goto('/admin/assessments/new');
  await page.getByLabel(pl.create.candidateName).fill('Jan Nowak');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Backend Developer' }).click();
  await page.getByRole('button', { name: pl.create.submit }).click();

  await expect(page.getByRole('heading', { name: 'Jan Nowak' })).toBeVisible();
  await expect(page.getByRole('textbox').first()).toHaveValue(/\/a\/[A-Za-z0-9_-]{20,}$/);

  await page.goto('/admin');
  await expect(page.getByRole('link', { name: 'Jan Nowak' }).first()).toBeVisible();
});

test('recruiter reads the report and records a decision', async ({ page }) => {
  const id = await seedEvaluatedAssessment('Maria Wiśniewska');
  await logIn(page);
  await page.goto(`/admin/assessments/${id}`);

  await expect(page.getByRole('heading', { name: pl.recommendation.READY })).toBeVisible();
  await expect(page.getByText(/jasno tłumaczy decyzje techniczne/)).toBeVisible();
  // Transcript (evidence quotes are collapsed by default).
  await expect(
    page.getByText('Well, we moved the payouts to a queue', { exact: false }),
  ).toBeVisible();

  const t = pl.report.decision;
  // Before any decision the list marks the report as waiting for review.
  await page.goto('/admin');
  await expect(
    page.getByRole('row', { name: /Maria Wiśniewska/ }).getByText(pl.list.toReview),
  ).toBeVisible();
  await page.goto(`/admin/assessments/${id}`);

  // Agree in one click.
  await page.getByRole('button', { name: t.agree, exact: true }).click();
  await expect(page.getByText(t.agrees)).toBeVisible();

  // Change it: a different verdict needs a reason.
  await page.getByRole('button', { name: t.change }).click();
  await page.getByRole('button', { name: t.disagree }).click();
  await page.getByRole('radio', { name: pl.recommendation.NOT_READY }).check();
  await page.getByRole('button', { name: t.save }).click();
  await expect(page.getByText(t.commentRequired)).toBeVisible();

  await page.getByLabel(t.comment).fill('Could not explain the incident handling.');
  await page.getByRole('button', { name: t.save }).click();
  await expect(page.getByText(t.differs)).toBeVisible();
  await expect(page.getByText('Could not explain the incident handling.')).toBeVisible();

  // Persisted: still there after a reload.
  await page.reload();
  await expect(page.getByText(t.differs)).toBeVisible();

  // The list shows the decision instead of "to review".
  await page.goto('/admin');
  const row = page.getByRole('row', { name: /Maria Wiśniewska/ });
  await expect(row.getByText(pl.recommendation.NOT_READY)).toBeVisible();
  await expect(row.getByText(pl.list.toReview)).toHaveCount(0);
});
