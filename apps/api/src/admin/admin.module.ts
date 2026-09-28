import { Module } from '@nestjs/common';
import { AdminAssessmentsController } from './admin-assessments.controller';
import { AdminKeyGuard } from './admin-key.guard';

@Module({
  controllers: [AdminAssessmentsController],
  providers: [AdminKeyGuard],
})
export class AdminModule {}
