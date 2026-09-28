import { SESSION_HARD_LIMIT_MS, type AssessmentStatus } from '@clientready/shared';

/** After the hard limit, the browser may still flush turns / upload audio for this long. */
export const POST_SESSION_GRACE_MS = 5 * 60_000;
/** Not worth reconnecting with less time than this left. */
export const MIN_RESUME_REMAINING_MS = 30_000;

export interface AssessmentTimes {
  status: AssessmentStatus;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

const DAY_MS = 24 * 60 * 60_000;

export function elapsedMs(a: AssessmentTimes, now: Date): number {
  if (!a.startedAt) return 0;
  const end = a.endedAt ?? now;
  return Math.max(0, Math.min(end.getTime() - a.startedAt.getTime(), SESSION_HARD_LIMIT_MS));
}

export function remainingMs(a: AssessmentTimes, now: Date): number {
  return SESSION_HARD_LIMIT_MS - elapsedMs(a, now);
}

/** A link that was never used expires after the TTL; started assessments do not expire. */
export function isLinkExpired(a: AssessmentTimes, now: Date, ttlDays: number): boolean {
  return a.status === 'CREATED' && now.getTime() > a.createdAt.getTime() + ttlDays * DAY_MS;
}

/** In progress but past the hard limit plus grace: the browser is gone, close it. */
export function isOverdue(a: AssessmentTimes, now: Date): boolean {
  return (
    a.status === 'IN_PROGRESS' &&
    a.startedAt !== null &&
    now.getTime() > a.startedAt.getTime() + SESSION_HARD_LIMIT_MS + POST_SESSION_GRACE_MS
  );
}

export function canResume(a: AssessmentTimes, now: Date): boolean {
  return a.status === 'IN_PROGRESS' && remainingMs(a, now) >= MIN_RESUME_REMAINING_MS;
}

/** Transcript turns and recordings are accepted during the call and shortly after it ended. */
export function acceptsSessionData(a: AssessmentTimes, now: Date): boolean {
  if (a.status === 'IN_PROGRESS') return true;
  return (
    a.status === 'COMPLETED' &&
    a.endedAt !== null &&
    now.getTime() <= a.endedAt.getTime() + POST_SESSION_GRACE_MS
  );
}

export function isFinished(status: AssessmentStatus): boolean {
  return status === 'COMPLETED' || status === 'EVALUATED' || status === 'FAILED';
}
