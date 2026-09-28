import { BadRequestException, Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateAssessmentInputSchema,
  type CreateAssessmentInput,
  type CreateAssessmentResult,
} from '@clientready/shared';
import { createAssessment, UnknownRoleTemplateError } from '../assessments/create-assessment';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from './admin-key.guard';

@Controller('admin/assessments')
@UseGuards(AdminKeyGuard)
export class AdminAssessmentsController {
  private readonly logger = new Logger(AdminAssessmentsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
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
}
