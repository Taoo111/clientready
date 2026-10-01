import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminAssessmentListQuerySchema,
  CreateAssessmentInputSchema,
  type AdminAssessmentDetail,
  type AdminAssessmentList,
  type AdminAssessmentListQuery,
  type CreateAssessmentInput,
  type CreateAssessmentResult,
} from '@clientready/shared';
import { AdminAuthGuard, type AuthenticatedRequest } from '../auth/admin-auth.guard';
import { ZodValidationPipe } from '../infra/http/zod-validation.pipe';
import { AssessmentsService } from './assessments.service';
import { UnknownRoleTemplateError } from './create-assessment';

/** Recruiter panel: list, create and view assessments; delete candidate data. */
@Controller('admin/assessments')
@UseGuards(AdminAuthGuard)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(AdminAssessmentListQuerySchema)) query: AdminAssessmentListQuery,
  ): Promise<AdminAssessmentList> {
    return this.assessments.list(query);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateAssessmentInputSchema)) input: CreateAssessmentInput,
  ): Promise<CreateAssessmentResult> {
    try {
      return await this.assessments.create(input);
    } catch (error) {
      if (error instanceof UnknownRoleTemplateError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<AdminAssessmentDetail> {
    return this.assessments.detail(id);
  }

  @Delete(':id/data')
  deleteData(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminAssessmentDetail> {
    return this.assessments.deleteCandidateData(id, request.recruiter?.email ?? 'admin key');
  }
}
