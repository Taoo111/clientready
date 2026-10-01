import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminAssessmentDetail,
  AdminAssessmentList,
  AdminAssessmentListQuery,
  CreateAssessmentInput,
  CreateAssessmentResult,
} from '@clientready/shared';
import type { Env } from '../config/env';
import type { Recording } from '../generated/prisma/client';
import { Clock } from '../infra/clock';
import { PrismaService } from '../infra/prisma/prisma.service';
import { Storage } from '../infra/storage/storage';
import { canResume } from './assessment-rules';
import { toDetail, toListItem } from './assessment.mapper';
import { candidateLink, createAssessment } from './create-assessment';
import { deleteCandidateData } from './delete-candidate-data';

/** Recruiter-side use cases: list, create, read and anonymise assessments. */
@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: Storage,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  /** Newest first; search by candidate name, filter by status and role. */
  async list(query: AdminAssessmentListQuery): Promise<AdminAssessmentList> {
    const [rows, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          candidateName: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
          status: query.status,
          roleTemplateId: query.role,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: {
          reports: { orderBy: { createdAt: 'desc' }, take: 1, select: { json: true } },
        },
      }),
      this.prisma.assessment.count(),
    ]);
    return { total, items: rows.map(toListItem) };
  }

  /** Throws `UnknownRoleTemplateError` for a role that does not exist. */
  async create(input: CreateAssessmentInput): Promise<CreateAssessmentResult> {
    const result = await createAssessment(this.prisma, input, this.webOrigin());
    this.logger.log(
      `Assessment ${result.id} created (role=${input.roleTemplateId}, level=${input.targetLevel})`,
    );
    return result;
  }

  /** Assessment with its newest report, transcript and recordings (report page). */
  async detail(id: string): Promise<AdminAssessmentDetail> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        turns: { orderBy: [{ startedAtMs: 'asc' }, { seq: 'asc' }] },
        recordings: { orderBy: { createdAt: 'asc' } },
        reports: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!assessment) throw new NotFoundException();

    const linkUsable =
      !assessment.dataDeletedAt &&
      (assessment.status === 'CREATED' || canResume(assessment, this.clock.now()));

    return toDetail({
      assessment,
      latestReport: assessment.reports[0],
      turns: assessment.turns,
      recordings: await Promise.all(
        assessment.recordings.map(async (recording) => ({
          ...recording,
          playbackUrl: await this.playbackUrl(recording),
        })),
      ),
      candidateLink: linkUsable ? candidateLink(this.webOrigin(), assessment.token) : null,
    });
  }

  /** Deletes the candidate's transcript, recordings and reports (GDPR request). */
  async deleteCandidateData(id: string, deletedBy: string): Promise<AdminAssessmentDetail> {
    const result = await deleteCandidateData(this.prisma, this.storage, id, this.clock.now());
    if (!result) throw new NotFoundException();
    this.logger.log(
      `Assessment ${id}: candidate data deleted by ${deletedBy} ` +
        `(${result.recordingFiles} recording file(s))`,
    );
    return this.detail(id);
  }

  /** A short-lived signed URL, or null (logged) when the storage cannot provide one. */
  private playbackUrl(recording: Recording): Promise<string | null> {
    const ttlSec = this.config.get('RECORDING_URL_TTL_SEC', { infer: true });
    return this.storage.signedUrl(recording.storageKey, ttlSec).catch((error: unknown) => {
      this.logger.warn(`Recording ${recording.id}: no signed URL (${String(error)})`);
      return null;
    });
  }

  private webOrigin(): string {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }
}
