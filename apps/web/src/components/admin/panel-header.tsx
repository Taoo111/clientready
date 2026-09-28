'use client';

import { ChevronDown, LogOut, Plus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/actions';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export function PanelHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const onList = pathname === '/admin';

  return (
    <header className="print-hidden sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/admin" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 sm:flex" aria-label="Główna">
          <Link
            href="/admin"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              onList && 'bg-muted text-foreground',
            )}
          >
            {pl.nav.assessments}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="h-9">
            <Link href="/admin/assessments/new">
              <Plus aria-hidden />
              <span className="hidden sm:inline">{pl.nav.newAssessment}</span>
              <span className="sr-only sm:hidden">{pl.nav.newAssessment}</span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2"
                aria-label={pl.nav.account}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <UserRound className="size-4" aria-hidden />
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-xs text-muted-foreground">{pl.nav.account}</span>
                <span className="block truncate text-sm">{email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full">
                    <LogOut aria-hidden />
                    {pl.nav.logout}
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
