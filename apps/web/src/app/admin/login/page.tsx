import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { LoginForm } from '@/components/admin/login-form';
import { LoginShowcase } from '@/components/admin/login-showcase';
import { pl } from '@/i18n/pl';
import { brand } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${pl.login.title} - ${pl.appName}`,
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  return (
    <main lang="pl" className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-12">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{pl.login.title}</h1>
            <p className="text-sm text-muted-foreground">
              {pl.login.subtitle}
              {brand.customerName && ` · ${pl.nav.forCustomer} ${brand.customerName}`}
            </p>
          </div>
          <LoginForm next={next ?? ''} expired={expired === '1'} />
        </div>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          {pl.login.candidateHint}
        </p>
      </div>
      <LoginShowcase />
    </main>
  );
}
