import type { PipeTransform } from '@nestjs/common';
import { PublicError } from '../infra/http/public-error';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

/** Rejects malformed link tokens before they reach the database (same 404 as unknown). */
export class CandidateTokenPipe implements PipeTransform<string, string> {
  transform(token: string): string {
    if (!TOKEN_PATTERN.test(token)) throw new PublicError('NOT_FOUND');
    return token;
  }
}
