import { Module } from '@nestjs/common';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { AdminAssessmentsController } from './admin-assessments.controller';
import { AdminKeyGuard } from './admin-key.guard';

@Module({
  imports: [EvaluationModule],
  controllers: [AdminAssessmentsController],
  providers: [AdminKeyGuard],
})
export class AdminModule {}
