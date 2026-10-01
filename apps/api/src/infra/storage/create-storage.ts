import type { Env } from '../../config/env';
import { LocalDiskStorage } from './local-disk.storage';
import type { Storage } from './storage';
import { SupabaseStorage } from './supabase.storage';

type StorageEnv = Pick<
  Env,
  | 'STORAGE_DRIVER'
  | 'STORAGE_DIR'
  | 'SUPABASE_URL'
  | 'SUPABASE_SECRET_KEY'
  | 'SUPABASE_STORAGE_BUCKET'
>;

/** Picks the storage implementation from STORAGE_DRIVER (env validation checks the keys). */
export function createStorage(env: StorageEnv): Storage {
  if (env.STORAGE_DRIVER === 'supabase') {
    return new SupabaseStorage({
      url: env.SUPABASE_URL!,
      secretKey: env.SUPABASE_SECRET_KEY!,
      bucket: env.SUPABASE_STORAGE_BUCKET,
    });
  }
  return new LocalDiskStorage(env.STORAGE_DIR);
}
