import { Inbox, Info, Mic, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'ClientReady - design system',
  robots: { index: false },
};

const swatches = [
  ['brand', 'bg-brand'],
  ['brand-strong', 'bg-brand-strong'],
  ['brand-soft', 'bg-brand-soft'],
  ['background', 'bg-background'],
  ['card', 'bg-card'],
  ['muted', 'bg-muted'],
  ['border', 'bg-border'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
  ['danger', 'bg-danger'],
  ['info', 'bg-info'],
] as const;

/** Development-only overview of tokens and components (not available in production). */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
        <p className="text-muted-foreground">Tokens live in src/app/globals.css.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Colours</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-xl border bg-card shadow-card">
              <div className={`h-14 ${cls}`} />
              <p className="px-3 py-2 font-mono text-xs">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Buttons & badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>
            <Spinner className="text-current" /> Saving
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>Subtle border, soft shadow, generous padding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo">Candidate name</Label>
              <Input id="demo" placeholder="Jan Kowalski" />
            </div>
            <Progress value={64} />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Notices</h2>
        <Notice tone="info" icon={Info} title="Info">
          Neutral information.
        </Notice>
        <Notice tone="warning" icon={TriangleAlert} title="Warning">
          Something needs attention.
        </Notice>
        <Notice tone="danger" icon={Mic} title="Microphone blocked">
          Click the lock icon in the address bar and allow the microphone.
        </Notice>
      </section>

      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description="Empty states explain what will appear and offer the next step."
        action={<Button>Primary action</Button>}
      />
    </main>
  );
}
