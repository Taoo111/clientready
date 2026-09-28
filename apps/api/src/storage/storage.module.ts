import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { createStorage } from './create-storage';
import { Storage } from './storage';

@Global()
@Module({
  providers: [
    {
      provide: Storage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createStorage({
          STORAGE_DRIVER: config.get('STORAGE_DRIVER', { infer: true }),
          STORAGE_DIR: config.get('STORAGE_DIR', { infer: true }),
          SUPABASE_URL: config.get('SUPABASE_URL', { infer: true }),
          SUPABASE_SECRET_KEY: config.get('SUPABASE_SECRET_KEY', { infer: true }),
          SUPABASE_STORAGE_BUCKET: config.get('SUPABASE_STORAGE_BUCKET', { infer: true }),
        }),
    },
  ],
  exports: [Storage],
})
export class StorageModule {}
