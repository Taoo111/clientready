import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { Clock } from '../src/infra/clock';
import {
  EvaluationProvider,
  EvaluationProviderError,
  type EvaluationRequest,
} from '../src/evaluation/providers/provider';
import type { z } from 'zod';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import {
  RealtimeSecretProvider,
  RealtimeUnavailableError,
  type RealtimeSecret,
  type RealtimeSecretRequest,
} from '../src/conversation/realtime/realtime-secret.provider';

export class FakeClock extends Clock {
  private offsetMs = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
  advance(ms: number): void {
    this.offsetMs += ms;
  }
  reset(): void {
    this.offsetMs = 0;
  }
}

export class FakeRealtime extends RealtimeSecretProvider {
  readonly requests: RealtimeSecretRequest[] = [];
  fail = false;
  async createSecret(request: RealtimeSecretRequest): Promise<RealtimeSecret> {
    if (this.fail) throw new RealtimeUnavailableError('fake failure');
    this.requests.push(request);
    return {
      value: `ek_test_${this.requests.length}`,
      expiresAt: 1_900_000_000,
      model: 'fake-realtime',
    };
  }
}

/** Returns `output` (validated by the request schema) or throws the queued `failures` first. */
export class FakeEvaluation extends EvaluationProvider {
  readonly provider = 'openai' as const;
  readonly model = 'fake-eval';
  calls = 0;
  failures: EvaluationProviderError[] = [];
  output: unknown = undefined;

  async generate<T extends z.ZodType>(request: EvaluationRequest<T>): Promise<z.infer<T>> {
    this.calls++;
    const failure = this.failures.shift();
    if (failure) throw failure;
    return request.schema.parse(this.output) as z.infer<T>;
  }

  reset(): void {
    this.calls = 0;
    this.failures = [];
    this.output = undefined;
  }
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  clock: FakeClock;
  realtime: FakeRealtime;
  evaluation: FakeEvaluation;
}

export async function createTestApp(): Promise<TestContext> {
  const clock = new FakeClock();
  const realtime = new FakeRealtime();
  const evaluation = new FakeEvaluation();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(RealtimeSecretProvider)
    .useValue(realtime)
    .overrideProvider(EvaluationProvider)
    .useValue(evaluation)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, prisma: app.get(PrismaService), clock, realtime, evaluation };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Recording", "TranscriptTurn", "Report", "Assessment" RESTART IDENTITY CASCADE',
  );
}
