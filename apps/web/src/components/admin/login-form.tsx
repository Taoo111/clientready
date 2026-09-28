'use client';

import { CircleAlert, LogIn } from 'lucide-react';
import { useActionState } from 'react';
import { loginAction, type FormState } from '@/app/admin/actions';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pl } from '@/i18n/pl';

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const t = pl.login;
  const message = state.error ?? (expired ? t.expired : undefined);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {message && (
        <Notice tone={state.error ? 'danger' : 'info'} icon={CircleAlert}>
          {message}
        </Notice>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state.values?.email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner className="text-current" /> : <LogIn aria-hidden />}
        {t.submit}
      </Button>
    </form>
  );
}
