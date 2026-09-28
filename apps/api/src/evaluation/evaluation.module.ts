import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { EvaluationService } from './evaluation.service';
import { EvaluationProvider } from './provider';
import { createEvaluationProvider } from './provider-factory';

@Module({
  providers: [
    EvaluationService,
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
  exports: [EvaluationService],
})
export class EvaluationModule {}
