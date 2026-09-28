import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { Clock } from '../src/common/clock';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  RealtimeSecretProvider,
  RealtimeUnavailableError,
  type RealtimeSecret,
  type RealtimeSecretRequest,
} from '../src/realtime/realtime-secret.provider';

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

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  clock: FakeClock;
  realtime: FakeRealtime;
}

export async function createTestApp(): Promise<TestContext> {
  const clock = new FakeClock();
  const realtime = new FakeRealtime();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(RealtimeSecretProvider)
    .useValue(realtime)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, prisma: app.get(PrismaService), clock, realtime };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Recording", "TranscriptTurn", "Report", "Assessment" RESTART IDENTITY CASCADE',
  );
}
