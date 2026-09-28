'use client';

import { CircleAlert, LogIn, RotateCw, ServerCog } from 'lucide-react';
import { useActionState } from 'react';
import { loginAction, type FormState } from '@/app/admin/actions';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pl } from '@/i18n/pl';
import { useApiWake } from '@/lib/api-wake';

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const t = pl.login;
  const message = state.error ?? (expired ? t.expired : undefined);
  const api = useApiWake();
  const apiReady = api.state === 'ready';

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {message && (
        <Notice tone={state.error ? 'danger' : 'info'} icon={CircleAlert}>
          {message}
        </Notice>
      )}
      {api.state === 'waking' && (
        <Notice tone="info" icon={ServerCog} title={t.waking}>
          {t.wakingBody}
        </Notice>
      )}
      {api.state === 'down' && (
        <Notice tone="danger" icon={CircleAlert} title={t.apiDown}>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={api.retry}>
            <RotateCw aria-hidden />
            {t.retry}
          </Button>
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
      <Button type="submit" size="lg" className="w-full" disabled={pending || !apiReady}>
        {pending || (!apiReady && api.state !== 'down') ? (
          <Spinner className="text-current" />
        ) : (
          <LogIn aria-hidden />
        )}
        {apiReady || api.state === 'down' ? t.submit : t.connecting}
      </Button>
    </form>
  );
}
