import type { PoolConfig } from 'pg';

export interface PgOptions {
  connectionString: string;
  max: number;
  ssl?: PoolConfig['ssl'];
}

/**
 * node-postgres options for Prisma's driver adapter.
 *
 * `sslmode=require` in the URL is kept for `prisma migrate` (libpq semantics: encrypt), but
 * node-postgres 8.x treats it as verify-full, which fails against poolers with their own CA
 * (e.g. Supabase). So the TLS settings are passed explicitly instead:
 * - with `ca` (the provider's CA certificate): encrypted and verified;
 * - without it: encrypted, not verified (the caller should log a warning).
 */
export function pgOptions(
  url: string,
  max: number,
  ca?: string,
): PgOptions & { verified: boolean } {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get('sslmode');
  if (!sslmode || sslmode === 'disable') return { connectionString: url, max, verified: false };

  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');
  parsed.searchParams.delete('sslrootcert');
  return {
    connectionString: parsed.toString(),
    max,
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    verified: !!ca,
  };
}
