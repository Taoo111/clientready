import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { LoginResult, Recruiter } from '@clientready/shared';
import { Clock } from '../infra/clock';
import type { Env } from '../config/env';
import { PrismaService } from '../infra/prisma/prisma.service';

/** Verified against when the email is unknown, so both cases take the same time. */
const DUMMY_HASH_PASSWORD = 'clientready-dummy-password';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  /** Creates the admin recruiter from ADMIN_EMAIL / ADMIN_PASSWORD, or updates its password. */
  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true })?.toLowerCase();
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — nobody can log in to the panel');
      return;
    }
    const existing = await this.prisma.recruiter.findUnique({ where: { email } });
    if (existing && (await verify(existing.passwordHash, password).catch(() => false))) return;

    const passwordHash = await hash(password);
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.recruiter.update({ where: { id: existing.id }, data: { passwordHash } }),
        // A changed password logs out all sessions.
        this.prisma.recruiterSession.deleteMany({ where: { recruiterId: existing.id } }),
      ]);
      this.logger.log(`Updated password of recruiter ${email}`);
    } else {
      await this.prisma.recruiter.create({ data: { email, passwordHash } });
      this.logger.log(`Created recruiter ${email}`);
    }
  }

  async login(email: string, password: string): Promise<LoginResult | null> {
    const recruiter = await this.prisma.recruiter.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!recruiter) {
      this.dummyHash ??= hash(DUMMY_HASH_PASSWORD);
      await verify(await this.dummyHash, password).catch(() => false);
      return null;
    }
    const ok = await verify(recruiter.passwordHash, password).catch(() => false);
    if (!ok) return null;

    const token = randomBytes(32).toString('base64url');
    const now = this.clock.now();
    const expiresAt = new Date(
      now.getTime() + this.config.get('SESSION_TTL_HOURS', { infer: true }) * 3_600_000,
    );
    await this.prisma.recruiterSession.create({
      data: { recruiterId: recruiter.id, tokenHash: hashToken(token), expiresAt },
    });
    // Housekeeping: drop expired sessions.
    await this.prisma.recruiterSession.deleteMany({ where: { expiresAt: { lt: now } } });
    this.logger.log(`Recruiter ${recruiter.email} logged in`);
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      recruiter: { id: recruiter.id, email: recruiter.email },
    };
  }

  /** Returns the recruiter for a valid, unexpired session token. */
  async validate(token: string): Promise<Recruiter | null> {
    const session = await this.prisma.recruiterSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { recruiter: true },
    });
    const now = this.clock.now();
    if (!session || session.expiresAt <= now) return null;
    // Record activity at most once a minute.
    if (now.getTime() - session.lastUsedAt.getTime() > 60_000) {
      await this.prisma.recruiterSession
        .update({ where: { id: session.id }, data: { lastUsedAt: now } })
        .catch(() => undefined);
    }
    return { id: session.recruiter.id, email: session.recruiter.email };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.recruiterSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
