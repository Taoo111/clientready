import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { LoginForm } from '@/components/admin/login-form';
import { pl } from '@/i18n/pl';
import { brand } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${pl.login.title} — ${pl.appName}`,
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  return (
    <main lang="pl" className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="scale-110" />
          <p className="text-sm text-muted-foreground">
            {pl.login.subtitle}
            {brand.customerName && ` · ${pl.nav.forCustomer} ${brand.customerName}`}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <h1 className="mb-6 text-xl font-semibold tracking-tight">{pl.login.title}</h1>
          <LoginForm next={next ?? ''} expired={expired === '1'} />
        </div>
      </div>
    </main>
  );
}
