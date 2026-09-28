import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RecordingUploadResult } from '@clientready/shared';
import { acceptsSessionData, isFinished } from '../assessments/assessment-rules';
import { Clock } from '../common/clock';
import { PublicError } from '../common/public-error';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '../storage/storage';
import { PublicAssessmentsService } from './public-assessments.service';

const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
};

export interface UploadedAudio {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    private readonly assessments: PublicAssessmentsService,
    private readonly prisma: PrismaService,
    private readonly storage: Storage,
    private readonly clock: Clock,
  ) {}

  async save(
    token: string,
    file: UploadedAudio | undefined,
    durationMs: number | undefined,
  ): Promise<RecordingUploadResult> {
    const assessment = await this.assessments.findByToken(token);
    if (!acceptsSessionData(assessment, this.clock.now())) {
      if (isFinished(assessment.status)) throw new PublicError('ALREADY_COMPLETED');
      throw new ConflictException('Conversation has not started');
    }
    if (!file || file.size === 0) throw new BadRequestException('Missing audio file');

    // e.g. "audio/webm;codecs=opus" -> "audio/webm"
    const baseType = file.mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
    const extension = EXTENSIONS[baseType];
    if (!extension) throw new BadRequestException(`Unsupported audio type: ${file.mimetype}`);

    const storageKey = `recordings/${assessment.id}/${randomUUID()}.${extension}`;
    await this.storage.put(storageKey, file.buffer, file.mimetype);
    const recording = await this.prisma.recording.create({
      data: {
        assessmentId: assessment.id,
        storageKey,
        mimeType: file.mimetype,
        durationMs: durationMs ?? null,
      },
    });
    this.logger.log(
      `Assessment ${assessment.id}: recording ${recording.id} stored (${file.size} bytes)`,
    );
    return { id: recording.id };
  }
}
