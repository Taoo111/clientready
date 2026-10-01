import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { ConversationModule } from './conversation/conversation.module';
import { DecisionsModule } from './decisions/decisions.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { HealthController } from './health/health.controller';
import { InfraModule } from './infra/infra.module';
import { RecordingsModule } from './recordings/recordings.module';
import { RetentionModule } from './retention/retention.module';

@Module({
  imports: [
    // Error monitoring; a no-op unless SENTRY_DSN is set (see instrument.ts).
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // Scripts run from apps/api; the single .env lives at the repo root.
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    // Per-IP rate limit; stricter limits on expensive endpoints via @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    InfraModule,
    AuthModule,
    AssessmentsModule,
    ConversationModule,
    RecordingsModule,
    EvaluationModule,
    DecisionsModule,
    RetentionModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Reports unexpected (non-HTTP) errors to Sentry, then responds as Nest normally would.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
