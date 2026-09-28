import { Module } from '@nestjs/common';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { AdminAssessmentsController } from './admin-assessments.controller';

@Module({
  imports: [EvaluationModule],
  controllers: [AdminAssessmentsController],
})
export class AdminModule {}
