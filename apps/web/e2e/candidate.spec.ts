import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { en } from '../src/i18n/en';
import { createAssessment } from './helpers';

/** Consent, microphone check (Chromium's synthetic microphone) and the ready screen. */
async function startConversation(page: Page, request: APIRequestContext): Promise<void> {
  const { link } = await createAssessment(request, 'Anna Kowalska');
  await page.goto(new URL(link).pathname);

  // Consent: the button stays disabled until the checkbox is ticked.
  await expect(page.getByRole('heading', { name: en.consent.title('Anna') })).toBeVisible();
  const proceed = page.getByRole('button', { name: en.consent.continue });
  await expect(proceed).toBeDisabled();
  await page.getByRole('checkbox').check();
  await proceed.click();

  await expect(page.getByRole('heading', { name: en.mic.title })).toBeVisible();
  await page.getByRole('button', { name: en.mic.allow }).click();
  const next = page.getByRole('button', { name: en.mic.continue, exact: true });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();

  // Who is about to call, then a deliberate start.
  await expect(page.getByRole('heading', { name: en.ready.title('Emma') })).toBeVisible();
  await page.getByRole('button', { name: en.ready.start }).click();
}

test('candidate goes through consent and the microphone check to the conversation', async ({
  page,
  request,
}) => {
  await startConversation(page, request);

  // No OpenAI key in tests: the realtime service is "unavailable" and the candidate can retry.
  await expect(page.getByRole('heading', { name: en.live.dropped.title })).toBeVisible();
  await expect(page.getByText(en.live.errors.unavailable)).toBeVisible();
  await expect(page.getByRole('button', { name: en.live.dropped.reconnect })).toBeVisible();
});

test('the conversation screen shows the client, the timer and the end button', async ({
  page,
  request,
}) => {
  // Hold the realtime session request: the screen stays in "connecting".
  await page.route('**/realtime-session', () => undefined);
  await startConversation(page, request);

  await expect(page.getByText('Emma Visser')).toBeVisible();
  await expect(page.getByText(en.live.connecting)).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('button', { name: en.live.end })).toBeDisabled();
});

test('an unknown link shows a clear message', async ({ page }) => {
  await page.goto('/a/this-token-does-not-exist-at-all');
  await expect(page.getByRole('heading', { name: en.errors.notFound.title })).toBeVisible();
});
