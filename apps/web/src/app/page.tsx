import { en } from '@/i18n/en';
import { pl } from '@/i18n/pl';
import { isApiHealthy } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const healthy = await isApiHealthy();

  return (
    <main className="legacy">
      <h1>{en.appName}</h1>
      <p>{en.tagline}</p>
      <p>
        {pl.apiStatus}: <strong>{healthy ? pl.apiOk : pl.apiDown}</strong>
      </p>
    </main>
  );
}
