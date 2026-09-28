import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../config/env';

export const ADMIN_KEY_HEADER = 'x-admin-key';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Temporary admin protection via a shared key header; replaced by recruiter login in M4. */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('ADMIN_API_KEY', { infer: true });
    if (!expected) {
      throw new ServiceUnavailableException('Admin API is disabled (ADMIN_API_KEY not set)');
    }
    const provided = context.switchToHttp().getRequest<Request>().header(ADMIN_KEY_HEADER);
    // Compare fixed-length digests so the comparison is constant-time regardless of length.
    if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
