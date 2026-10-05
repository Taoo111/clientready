'use client';

import { Check, Copy, Link2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { brand } from '@/lib/brand';
import { cn } from '@/lib/utils';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(pl.invite.copied);
    return true;
  } catch {
    toast.error(pl.invite.copyFailed);
    return false;
  }
}

function CopyButton({
  text,
  label,
  variant,
}: {
  text: string;
  label: string;
  variant?: 'default' | 'outline';
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      onClick={async () => {
        if (await copy(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {label}
    </Button>
  );
}

export function InviteCard({
  link,
  candidateName,
  roleName,
  highlight,
}: {
  link: string;
  candidateName: string;
  roleName: string;
  highlight: boolean;
}) {
  const [language, setLanguage] = useState<'pl' | 'en'>('pl');
  const t = pl.invite;
  const firstName = candidateName.trim().split(/\s+/)[0] ?? candidateName;
  const message =
    language === 'pl'
      ? t.messagePl(firstName, roleName, link, brand.customerName)
      : t.messageEn(firstName, roleName, link, brand.customerName);

  return (
    <section
      className={cn(
        'print-hidden space-y-5 rounded-xl border bg-card p-5 shadow-card sm:p-6',
        highlight && 'border-brand/40 ring-4 ring-brand/10',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Link2 className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">{highlight ? t.createdTitle : t.title}</h2>
          <p className="text-sm text-muted-foreground">{highlight ? t.createdBody : t.body}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          aria-label={t.title}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-muted/50 px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <CopyButton text={link} label={t.copyLink} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t.messageTitle}</h3>
          <div
            role="tablist"
            aria-label={t.messageTitle}
            className="inline-flex rounded-lg bg-muted p-1"
          >
            {(['pl', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={language === lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors',
                  language === lang && 'bg-card text-foreground shadow-sm',
                )}
              >
                {lang === 'pl' ? t.polish : t.english}
              </button>
            ))}
          </div>
        </div>
        <pre className="max-h-96 overflow-auto rounded-xl border bg-muted/40 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </pre>
        <CopyButton text={message} label={t.copyMessage} variant="outline" />
      </div>
    </section>
  );
}
