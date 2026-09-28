import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { memoryStorage } from 'multer';
import type { Env } from '../config/env';
import { OpenAiRealtimeSecretProvider } from '../realtime/openai-realtime-secret.provider';
import { RealtimeSecretProvider } from '../realtime/realtime-secret.provider';
import { PublicAssessmentsController } from './public-assessments.controller';
import { PublicAssessmentsService } from './public-assessments.service';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [
    EvaluationModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        storage: memoryStorage(),
        limits: {
          files: 1,
          fileSize: Math.floor(config.get('MAX_RECORDING_MB', { infer: true }) * 1024 * 1024),
        },
      }),
    }),
  ],
  controllers: [PublicAssessmentsController],
  providers: [
    PublicAssessmentsService,
    RecordingsService,
    { provide: RealtimeSecretProvider, useClass: OpenAiRealtimeSecretProvider },
  ],
})
export class PublicModule {}
