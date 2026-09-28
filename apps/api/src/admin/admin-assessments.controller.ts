import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateAssessmentInputSchema,
  getRoleTemplate,
  ReportSchema,
  type AdminAssessmentDetail,
  type CreateAssessmentInput,
  type CreateAssessmentResult,
} from '@clientready/shared';
import { createAssessment, UnknownRoleTemplateError } from '../assessments/create-assessment';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Env } from '../config/env';
import { EvaluationNotPossibleError, EvaluationService } from '../evaluation/evaluation.service';
import { EvaluationProviderError } from '../evaluation/provider';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '../storage/storage';
import { AdminKeyGuard } from './admin-key.guard';

const iso = (date: Date | null) => date?.toISOString() ?? null;

@Controller('admin/assessments')
@UseGuards(AdminKeyGuard)
export class AdminAssessmentsController {
  private readonly logger = new Logger(AdminAssessmentsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly evaluation: EvaluationService,
    private readonly storage: Storage,
  ) {}

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
      roleName: getRoleTemplate(assessment.roleTemplateId)?.name ?? assessment.roleTemplateId,
      targetLevel: assessment.targetLevel,
      status: assessment.status,
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
