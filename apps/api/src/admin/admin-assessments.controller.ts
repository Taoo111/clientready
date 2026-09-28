import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminAssessmentListQuerySchema,
  CreateAssessmentInputSchema,
  getRoleTemplate,
  ReportSchema,
  type AdminAssessmentDetail,
  type AdminAssessmentList,
  type AdminAssessmentListQuery,
  type CreateAssessmentInput,
  type CreateAssessmentResult,
} from '@clientready/shared';
import { canResume } from '../assessments/assessment-rules';
import {
  candidateLink,
  createAssessment,
  UnknownRoleTemplateError,
} from '../assessments/create-assessment';
import { deleteCandidateData } from '../assessments/delete-candidate-data';
import { AdminAuthGuard, type AuthenticatedRequest } from '../auth/admin-auth.guard';
import { Clock } from '../common/clock';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Env } from '../config/env';
import { EvaluationNotPossibleError, EvaluationService } from '../evaluation/evaluation.service';
import { EvaluationProviderError } from '../evaluation/provider';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '../storage/storage';

const iso = (date: Date | null) => date?.toISOString() ?? null;

@Controller('admin/assessments')
@UseGuards(AdminAuthGuard)
export class AdminAssessmentsController {
  private readonly logger = new Logger(AdminAssessmentsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly evaluation: EvaluationService,
    private readonly storage: Storage,
    private readonly clock: Clock,
  ) {}

  private roleName(roleTemplateId: string): string {
    return getRoleTemplate(roleTemplateId)?.name ?? roleTemplateId;
  }

  /** Newest first; search by candidate name, filter by status and role. */
  @Get()
  async list(
    @Query(new ZodValidationPipe(AdminAssessmentListQuerySchema)) query: AdminAssessmentListQuery,
  ): Promise<AdminAssessmentList> {
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
    return {
      total,
      items: rows.map((a) => {
        const report = a.reports[0] ? ReportSchema.safeParse(a.reports[0].json) : undefined;
        return {
          id: a.id,
          candidateName: a.candidateName,
          roleTemplateId: a.roleTemplateId,
          roleName: this.roleName(a.roleTemplateId),
          targetLevel: a.targetLevel,
          status: a.status,
          recommendation: report?.success ? report.data.recommendation : null,
          reportStatus: report?.success ? report.data.status : null,
          createdAt: a.createdAt.toISOString(),
          endedAt: iso(a.endedAt),
          dataDeleted: a.dataDeletedAt !== null,
        };
      }),
    };
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateAssessmentInputSchema)) input: CreateAssessmentInput,
  ): Promise<CreateAssessmentResult> {
    try {
      const result = await createAssessment(
        this.prisma,
        input,
        this.config.get('WEB_ORIGIN', { infer: true }),
      );
      this.logger.log(
        `Assessment ${result.id} created (role=${input.roleTemplateId}, level=${input.targetLevel})`,
      );
      return result;
    } catch (error) {
      if (error instanceof UnknownRoleTemplateError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /** Assessment with its newest report, transcript and recordings (report page). */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<AdminAssessmentDetail> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        turns: { orderBy: [{ startedAtMs: 'asc' }, { seq: 'asc' }] },
        recordings: { orderBy: { createdAt: 'asc' } },
        reports: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!assessment) throw new NotFoundException();
    const [report] = assessment.reports;

    return {
      id: assessment.id,
      candidateName: assessment.candidateName,
      candidateEmail: assessment.candidateEmail,
      roleTemplateId: assessment.roleTemplateId,
      roleName: this.roleName(assessment.roleTemplateId),
      targetLevel: assessment.targetLevel,
      status: assessment.status,
      candidateLink:
        !assessment.dataDeletedAt &&
        (assessment.status === 'CREATED' || canResume(assessment, this.clock.now()))
          ? candidateLink(this.config.get('WEB_ORIGIN', { infer: true }), assessment.token)
          : null,
      dataDeletedAt: iso(assessment.dataDeletedAt),
      createdAt: assessment.createdAt.toISOString(),
      startedAt: iso(assessment.startedAt),
      endedAt: iso(assessment.endedAt),
      evaluationError: assessment.evaluationError,
      report: report
        ? {
            id: report.id,
            provider: report.provider,
            model: report.model,
            promptVersion: report.promptVersion,
            createdAt: report.createdAt.toISOString(),
            data: ReportSchema.parse(report.json),
          }
        : null,
      turns: assessment.turns.map((t) => ({
        seq: t.seq,
        speaker: t.speaker,
        text: t.text,
        startedAtMs: t.startedAtMs,
      })),
      recordings: assessment.recordings.map((r) => ({
        id: r.id,
        mimeType: r.mimeType,
        durationMs: r.durationMs,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /** Re-runs the evaluation (prompt calibration). Adds a new report; old ones are kept. */
  @Post(':id/evaluate')
  @HttpCode(200)
  async evaluate(@Param('id') id: string): Promise<AdminAssessmentDetail> {
    try {
      await this.evaluation.evaluateNow(id);
    } catch (error) {
      if (error instanceof EvaluationNotPossibleError) {
        if (error.message === 'Assessment not found') throw new NotFoundException();
        throw new ConflictException(error.message);
      }
      if (error instanceof EvaluationProviderError) {
        this.logger.error(`Assessment ${id}: manual evaluation failed: ${error.message}`);
        throw new BadGatewayException(`Evaluation failed: ${error.message}`);
      }
      throw error;
    }
    return this.detail(id);
  }

  /** Deletes the candidate's transcript, recordings and reports (GDPR request). */
  @Delete(':id/data')
  async deleteData(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminAssessmentDetail> {
    const result = await deleteCandidateData(this.prisma, this.storage, id, this.clock.now());
    if (!result) throw new NotFoundException();
    this.logger.log(
      `Assessment ${id}: candidate data deleted by ${request.recruiter?.email ?? 'admin key'} ` +
        `(${result.recordingFiles} recording file(s))`,
    );
    return this.detail(id);
  }

  @Get(':id/recordings/:recordingId')
  async recording(
    @Param('id') id: string,
    @Param('recordingId') recordingId: string,
  ): Promise<StreamableFile> {
    const recording = await this.prisma.recording.findFirst({
      where: { id: recordingId, assessmentId: id },
    });
    if (!recording) throw new NotFoundException();
    const data = await this.storage.get(recording.storageKey).catch(() => {
      throw new NotFoundException('Recording file is missing');
    });
    return new StreamableFile(data, {
      type: recording.mimeType,
      length: data.length,
      disposition: `inline; filename="recording-${recording.id}"`,
    });
  }
}
