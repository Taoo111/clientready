'use client';

import type { AssessmentStatus } from '@clientready/shared';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pl } from '@/i18n/pl';

const ALL = 'all';
const STATUSES: AssessmentStatus[] = ['CREATED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'FAILED'];

/** Search and filters kept in the URL (?q=&status=&role=), so they survive reloads and links. */
export function AssessmentFilters({ roles }: { roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get('q') ?? '');

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value && value !== ALL) next.set(key, value);
      else next.delete(key);
      startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`));
    },
    [params, pathname, router],
  );

  // Debounced search; restarts when another filter changes meanwhile, so it is not lost.
  useEffect(() => {
    if (query === (params.get('q') ?? '')) return;
    const timer = setTimeout(() => update('q', query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, params, update]);

  const hasFilters = params.has('q') || params.has('status') || params.has('role');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pl.list.searchPlaceholder}
          aria-label={pl.list.searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <Select value={params.get('status') ?? ALL} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="w-full sm:w-48" aria-label={pl.list.columns.status}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{pl.list.allStatuses}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {pl.status[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get('role') ?? ALL} onValueChange={(v) => update('role', v)}>
          <SelectTrigger className="w-full sm:w-48" aria-label={pl.list.columns.role}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{pl.list.allRoles}</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(pending || hasFilters) && (
        <div className="flex h-9 items-center sm:w-32">
          {pending ? (
            <Spinner />
          ) : (
            hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  startTransition(() => router.replace(pathname));
                }}
              >
                <X aria-hidden />
                {pl.list.clearFilters}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
