import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';

@Module({
  imports: [AssessmentsModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
})
export class DecisionsModule {}
