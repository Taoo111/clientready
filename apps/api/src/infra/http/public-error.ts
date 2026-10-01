import { HttpException, HttpStatus } from '@nestjs/common';
import type { PublicErrorCode } from '@clientready/shared';

const STATUS: Record<PublicErrorCode, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  LINK_EXPIRED: HttpStatus.GONE,
  ALREADY_COMPLETED: HttpStatus.CONFLICT,
  CONSENT_REQUIRED: HttpStatus.CONFLICT,
  TIME_UP: HttpStatus.CONFLICT,
  TOO_MANY_CONNECTIONS: HttpStatus.TOO_MANY_REQUESTS,
  REALTIME_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Candidate-facing error with a stable `code` the web app maps to a message. */
export class PublicError extends HttpException {
  constructor(
    readonly code: PublicErrorCode,
    message: string = code,
  ) {
    super({ statusCode: STATUS[code], code, message }, STATUS[code]);
  }
}
