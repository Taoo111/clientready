import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RecordingUploadResult } from '@clientready/shared';
import { CandidateAccessService } from '../conversation/candidate-access.service';
import type { Recording } from '../generated/prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { Storage } from '../infra/storage/storage';

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

/** Conversation audio: uploaded by the candidate's browser, played back in the panel. */
@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    private readonly access: CandidateAccessService,
    private readonly prisma: PrismaService,
    private readonly storage: Storage,
  ) {}

  async save(
    token: string,
    file: UploadedAudio | undefined,
    durationMs: number | undefined,
  ): Promise<RecordingUploadResult> {
    const assessment = await this.access.findByToken(token);
    this.access.assertAcceptsSessionData(assessment);
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

  /** The recording row and its audio bytes; 404 when either is missing. */
  async load(assessmentId: string, recordingId: string): Promise<[Recording, Buffer]> {
    const recording = await this.prisma.recording.findFirst({
      where: { id: recordingId, assessmentId },
    });
    if (!recording) throw new NotFoundException();
    const data = await this.storage.get(recording.storageKey).catch(() => {
      throw new NotFoundException('Recording file is missing');
    });
    return [recording, data];
  }
}
