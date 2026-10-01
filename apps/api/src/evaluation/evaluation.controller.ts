import {
  BadGatewayException,
  ConflictException,
  Controller,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AdminAssessmentDetail } from '@clientready/shared';
import { AssessmentsService } from '../assessments/assessments.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { EvaluationScheduler } from './evaluation-scheduler.service';
import { AssessmentNotFoundError, EvaluationNotPossibleError } from './evaluation.service';
import { EvaluationProviderError } from './providers/provider';

/** Recruiter panel: re-run the evaluation (prompt calibration). */
@Controller('admin/assessments/:id/evaluate')
@UseGuards(AdminAuthGuard)
export class EvaluationController {
  private readonly logger = new Logger(EvaluationController.name);

  constructor(
    private readonly scheduler: EvaluationScheduler,
    private readonly assessments: AssessmentsService,
  ) {}

  /** Adds a new report; old ones are kept. Returns the refreshed assessment. */
  @Post()
  @HttpCode(200)
  async evaluate(@Param('id') id: string): Promise<AdminAssessmentDetail> {
    try {
      await this.scheduler.evaluateNow(id);
    } catch (error) {
      if (error instanceof AssessmentNotFoundError) throw new NotFoundException();
      if (error instanceof EvaluationNotPossibleError) throw new ConflictException(error.message);
      if (error instanceof EvaluationProviderError) {
        this.logger.error(`Assessment ${id}: manual evaluation failed: ${error.message}`);
        throw new BadGatewayException(`Evaluation failed: ${error.message}`);
      }
      throw error;
    }
    return this.assessments.detail(id);
  }
}
