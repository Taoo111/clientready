import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  TranscriptTurnsInputSchema,
  type PublicAssessmentView,
  type RealtimeSessionResult,
  type TranscriptTurnsInput,
} from '@clientready/shared';
import { PublicError } from '../common/public-error';
import { PublicAssessmentsService } from './public-assessments.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

function checkToken(token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new PublicError('NOT_FOUND');
  return token;
}

/** Candidate-facing endpoints, authorised only by the unguessable link token. */
@Controller('public/assessments/:token')
export class PublicAssessmentsController {
  constructor(private readonly service: PublicAssessmentsService) {}

  @Get()
  async view(@Param('token') token: string): Promise<PublicAssessmentView> {
    return this.service.toView(await this.service.findByToken(checkToken(token)));
  }

  @Post('consent')
  @HttpCode(200)
  consent(@Param('token') token: string): Promise<PublicAssessmentView> {
    return this.service.giveConsent(checkToken(token));
  }

  @Post('realtime-session')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  realtimeSession(@Param('token') token: string): Promise<RealtimeSessionResult> {
    return this.service.createRealtimeSession(checkToken(token));
  }

  @Post('turns')
  @HttpCode(200)
  turns(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(TranscriptTurnsInputSchema)) body: TranscriptTurnsInput,
  ): Promise<{ saved: number }> {
    return this.service.saveTurns(checkToken(token), body.turns);
  }

  @Post('end')
  @HttpCode(200)
  end(@Param('token') token: string): Promise<PublicAssessmentView> {
    return this.service.end(checkToken(token));
  }
}
