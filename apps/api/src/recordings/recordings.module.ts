import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Env } from '../config/env';
import { ConversationModule } from '../conversation/conversation.module';
import { AdminRecordingsController } from './admin-recordings.controller';
import { CandidateRecordingsController } from './candidate-recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [
    ConversationModule,
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
  controllers: [CandidateRecordingsController, AdminRecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
