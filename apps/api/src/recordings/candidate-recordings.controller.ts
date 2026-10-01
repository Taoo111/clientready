import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { RecordingUploadResult } from '@clientready/shared';
import { z } from 'zod';
import { CandidateTokenPipe } from '../conversation/candidate-token.pipe';
import { ZodValidationPipe } from '../infra/http/zod-validation.pipe';
import { RecordingsService, type UploadedAudio } from './recordings.service';

const RecordingFieldsSchema = z.object({
  durationMs: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(60 * 60_000)
    .optional(),
});

/** Candidate's browser uploads the conversation audio (authorised by the link token). */
@Controller('public/assessments/:token/recording')
export class CandidateRecordingsController {
  constructor(private readonly recordings: RecordingsService) {}

  /** Multipart upload: field `file` (audio) and optional `durationMs`. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('token', CandidateTokenPipe) token: string,
    @UploadedFile() file: UploadedAudio | undefined,
    @Body(new ZodValidationPipe(RecordingFieldsSchema))
    fields: z.infer<typeof RecordingFieldsSchema>,
  ): Promise<RecordingUploadResult> {
    return this.recordings.save(token, file, fields.durationMs);
  }
}
