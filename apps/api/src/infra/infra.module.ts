import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { Clock, SystemClock } from './clock';
import { PrismaService } from './prisma/prisma.service';
import { createStorage } from './storage/create-storage';
import { Storage } from './storage/storage';

/**
 * Technical building blocks every feature may inject: time, database, file storage.
 * Global, so feature modules import only the features they depend on.
 */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    PrismaService,
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
  exports: [Clock, PrismaService, Storage],
})
export class InfraModule {}
