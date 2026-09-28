import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { pl } from '@/i18n/pl';
import { adminEnabled, logIn } from '@/lib/admin/session';

export const metadata: Metadata = {
  title: `${pl.appName} — ${pl.login.title}`,
  robots: { index: false, follow: false },
};

/** Only same-site relative paths under /admin are allowed as redirect targets. */
function safeNext(value: FormDataEntryValue | string | string[] | undefined | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/admin/') && !next.startsWith('//') ? next : '/admin/login';
}

async function login(formData: FormData) {
  'use server';
  const next = safeNext(formData.get('next'));
  const ok = await logIn(String(formData.get('key') ?? ''));
  redirect(ok ? next : `/admin/login?error=1&next=${encodeURIComponent(next)}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const t = pl.login;
  return (
    <main lang="pl" className="legacy">
      <p className="brand">{pl.appName}</p>
      <section className="card">
        <h1>{t.title}</h1>
        {adminEnabled() ? (
          <form action={login}>
            <p>{t.body}</p>
            <input type="hidden" name="next" value={safeNext(next)} />
            <label className="field">
              <span>{t.key}</span>
              <input type="password" name="key" required autoComplete="current-password" />
            </label>
            {error && (
              <p className="error" role="alert">
                {t.invalid}
              </p>
            )}
            <button type="submit">{t.submit}</button>
          </form>
        ) : (
          <p className="error">{t.disabled}</p>
        )}
      </section>
    </main>
  );
}
