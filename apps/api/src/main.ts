// Must stay the first import (error monitoring instruments the modules loaded after it).
import './instrument';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Behind the hosting proxy (Render): real client IPs for rate limiting, no framework banner.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true }) ?? config.get('API_PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
