import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { LocalDiskStorage } from './local-disk.storage';
import { Storage } from './storage';

@Global()
@Module({
  providers: [
    {
      provide: Storage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new LocalDiskStorage(config.get('STORAGE_DIR', { infer: true })),
    },
  ],
  exports: [Storage],
})
export class StorageModule {}
