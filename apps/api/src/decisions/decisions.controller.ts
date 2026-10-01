import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  RecruiterDecisionInputSchema,
  type AdminAssessmentDetail,
  type RecruiterDecisionInput,
} from '@clientready/shared';
import { AssessmentsService } from '../assessments/assessments.service';
import { AdminAuthGuard, type AuthenticatedRequest } from '../auth/admin-auth.guard';
import { ZodValidationPipe } from '../infra/http/zod-validation.pipe';
import { DecisionCommentRequiredError, DecisionNotAllowedError } from './decision-rules';
import { DecisionsService } from './decisions.service';

/** Recruiter panel: the human verdict on the AI recommendation. */
@Controller('admin/assessments/:id/decision')
@UseGuards(AdminAuthGuard)
export class DecisionsController {
  constructor(
    private readonly decisions: DecisionsService,
    private readonly assessments: AssessmentsService,
  ) {}

  /** Returns the refreshed assessment. */
  @Post()
  @HttpCode(200)
  async decide(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecruiterDecisionInputSchema)) input: RecruiterDecisionInput,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminAssessmentDetail> {
    try {
      await this.decisions.record(id, input, request.recruiter?.email ?? 'admin key');
    } catch (error) {
      if (error instanceof DecisionNotAllowedError) throw new ConflictException(error.message);
      if (error instanceof DecisionCommentRequiredError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    return this.assessments.detail(id);
  }
}
