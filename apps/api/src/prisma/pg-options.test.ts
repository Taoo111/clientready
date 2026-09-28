import { describe, expect, it } from 'vitest';
import { pgOptions } from './pg-options';

describe('pgOptions', () => {
  it('leaves local URLs without sslmode untouched', () => {
    const url = 'postgresql://u:p@localhost:5433/db';
    expect(pgOptions(url, 5)).toEqual({ connectionString: url, max: 5, verified: false });
  });

  it('verifies TLS with the provider CA', () => {
    const options = pgOptions(
      'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require',
      5,
      '-----BEGIN CERTIFICATE-----',
    );
    expect(options.connectionString).toBe(
      'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
    );
    expect(options.ssl).toEqual({ ca: '-----BEGIN CERTIFICATE-----', rejectUnauthorized: true });
    expect(options.verified).toBe(true);
  });

  it('falls back to encryption without verification when no CA is given', () => {
    const options = pgOptions(
      'postgresql://u:p@host:5432/db?sslmode=require&uselibpqcompat=true',
      3,
    );
    expect(options).toMatchObject({ ssl: { rejectUnauthorized: false }, verified: false, max: 3 });
    expect(options.connectionString).not.toContain('sslmode');
  });
});
