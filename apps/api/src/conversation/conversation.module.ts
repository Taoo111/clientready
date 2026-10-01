import { Module } from '@nestjs/common';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { CandidateAccessService } from './candidate-access.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { OpenAiRealtimeSecretProvider } from './realtime/openai-realtime-secret.provider';
import { RealtimeSecretProvider } from './realtime/realtime-secret.provider';

@Module({
  imports: [EvaluationModule],
  controllers: [ConversationController],
  providers: [
    CandidateAccessService,
    ConversationService,
    { provide: RealtimeSecretProvider, useClass: OpenAiRealtimeSecretProvider },
  ],
  exports: [CandidateAccessService],
})
export class ConversationModule {}
