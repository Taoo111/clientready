import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  TranscriptTurnsInputSchema,
  UsageReportInputSchema,
  type PublicAssessmentView,
  type RealtimeSessionResult,
  type TranscriptTurnsInput,
  type UsageReportInput,
} from '@clientready/shared';
import { ZodValidationPipe } from '../infra/http/zod-validation.pipe';
import { CandidateTokenPipe } from './candidate-token.pipe';
import { ConversationService } from './conversation.service';

/** Candidate-facing endpoints, authorised only by the unguessable link token. */
@Controller('public/assessments/:token')
export class ConversationController {
  constructor(private readonly conversation: ConversationService) {}

  @Get()
  view(@Param('token', CandidateTokenPipe) token: string): Promise<PublicAssessmentView> {
    return this.conversation.view(token);
  }

  @Post('consent')
  @HttpCode(200)
  consent(@Param('token', CandidateTokenPipe) token: string): Promise<PublicAssessmentView> {
    return this.conversation.giveConsent(token);
  }

  @Post('realtime-session')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  realtimeSession(
    @Param('token', CandidateTokenPipe) token: string,
  ): Promise<RealtimeSessionResult> {
    return this.conversation.startRealtimeSession(token);
  }

  @Post('turns')
  @HttpCode(200)
  turns(
    @Param('token', CandidateTokenPipe) token: string,
    @Body(new ZodValidationPipe(TranscriptTurnsInputSchema)) body: TranscriptTurnsInput,
  ): Promise<{ saved: number }> {
    return this.conversation.saveTurns(token, body.turns);
  }

  @Post('usage')
  @HttpCode(204)
  usage(
    @Param('token', CandidateTokenPipe) token: string,
    @Body(new ZodValidationPipe(UsageReportInputSchema)) body: UsageReportInput,
  ): Promise<void> {
    return this.conversation.saveUsage(token, body);
  }

  @Post('end')
  @HttpCode(200)
  end(@Param('token', CandidateTokenPipe) token: string): Promise<PublicAssessmentView> {
    return this.conversation.end(token);
  }
}
