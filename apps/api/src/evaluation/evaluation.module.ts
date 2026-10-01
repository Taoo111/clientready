import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssessmentsModule } from '../assessments/assessments.module';
import type { Env } from '../config/env';
import { EvaluationScheduler } from './evaluation-scheduler.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationProvider } from './providers/provider';
import { createEvaluationProvider } from './providers/provider-factory';

@Module({
  imports: [AssessmentsModule],
  controllers: [EvaluationController],
  providers: [
    EvaluationService,
    EvaluationScheduler,
    {
      provide: EvaluationProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createEvaluationProvider({
          EVAL_PROVIDER: config.get('EVAL_PROVIDER', { infer: true }),
          EVAL_MODEL: config.get('EVAL_MODEL', { infer: true }),
          EVAL_REASONING_EFFORT: config.get('EVAL_REASONING_EFFORT', { infer: true }),
          OPENAI_API_KEY: config.get('OPENAI_API_KEY', { infer: true }),
          ANTHROPIC_API_KEY: config.get('ANTHROPIC_API_KEY', { infer: true }),
        }),
    },
  ],
  exports: [EvaluationScheduler],
})
export class EvaluationModule {}
