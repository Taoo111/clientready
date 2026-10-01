import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../../config/env';
import { PrismaClient } from '../../generated/prisma/client';
import { pgOptions } from './pg-options';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    const { verified, ...options } = pgOptions(
      config.get('DATABASE_URL', { infer: true }),
      config.get('DATABASE_POOL_MAX', { infer: true }),
      config.get('DATABASE_SSL_CA', { infer: true }),
    );
    super({ adapter: new PrismaPg(options) });
    if (options.ssl && !verified) {
      new Logger(PrismaService.name).warn(
        'Database TLS is not verified — set DATABASE_SSL_CA to the provider CA certificate',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
