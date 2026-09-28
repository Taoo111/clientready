import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Recruiter } from '@clientready/shared';
import type { Env } from '../config/env';
import { AuthService } from './auth.service';

export const ADMIN_KEY_HEADER = 'x-admin-key';

export type AuthenticatedRequest = Request & { recruiter?: Recruiter };

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function bearerToken(request: Request): string | undefined {
  const header = request.header('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

/**
 * Protects /admin endpoints: a recruiter session (Authorization: Bearer <token>, used by
 * the web panel) or ADMIN_API_KEY (x-admin-key header, for scripts and the CLI).
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = bearerToken(request);
    if (token) {
      const recruiter = await this.auth.validate(token);
      if (!recruiter) throw new UnauthorizedException('Session expired or invalid');
      request.recruiter = recruiter;
      return true;
    }

    const expected = this.config.get('ADMIN_API_KEY', { infer: true });
    const provided = request.header(ADMIN_KEY_HEADER);
    // Compare fixed-length digests so the comparison is constant-time regardless of length.
    if (expected && provided && timingSafeEqual(digest(provided), digest(expected))) {
      return true;
    }
    throw new UnauthorizedException();
  }
}
