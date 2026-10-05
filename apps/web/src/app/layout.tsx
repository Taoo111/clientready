import type { Metadata } from 'next';
import { IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { brand } from '@/lib/brand';
import './globals.css';

const sans = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-schibsted' });
const mono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'ClientReady',
  description: 'AI voice assessment of client-facing English',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      {/* Customer accent colour (validated in lib/brand); the other brand shades derive from it. */}
      {brand.color && <style>{`:root{--brand:${brand.color}}`}</style>}
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
