import { Module } from '@nestjs/common';
import { OpenAiRealtimeSecretProvider } from '../realtime/openai-realtime-secret.provider';
import { RealtimeSecretProvider } from '../realtime/realtime-secret.provider';
import { PublicAssessmentsController } from './public-assessments.controller';
import { PublicAssessmentsService } from './public-assessments.service';

@Module({
  controllers: [PublicAssessmentsController],
  providers: [
    PublicAssessmentsService,
    { provide: RealtimeSecretProvider, useClass: OpenAiRealtimeSecretProvider },
  ],
})
export class PublicModule {}
