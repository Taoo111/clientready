import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clock } from '../common/clock';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '../storage/storage';
import { purgeExpiredData } from './purge';

/**
 * Purges data past DATA_RETENTION_DAYS shortly after startup and then periodically.
 * On a free host that sleeps when idle this still runs at least once per wake-up.
 */
@Injectable()
export class RetentionService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RetentionService.name);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: Storage,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    const hours = this.config.get('RETENTION_PURGE_INTERVAL_HOURS', { infer: true });
    if (hours <= 0) return;
    const run = async () => {
      await this.purge();
      this.timer = setTimeout(() => void run(), hours * 3_600_000);
    };
    // Let the app finish starting (and serve the wake-up request) first.
    this.timer = setTimeout(() => void run(), 60_000);
  }

  onApplicationShutdown(): void {
    clearTimeout(this.timer);
  }

  async purge(): Promise<void> {
    try {
      const result = await purgeExpiredData(this.prisma, this.storage, {
        now: this.clock.now(),
        retentionDays: this.config.get('DATA_RETENTION_DAYS', { infer: true }),
      });
      if (result.assessments > 0) {
        this.logger.log(
          `Purged ${result.assessments} assessment(s), ${result.recordingFiles} recording file(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Retention purge failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
