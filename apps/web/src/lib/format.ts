import type { Report } from '@clientready/shared';

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : '-';
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFormat.format(new Date(iso)) : '-';
}

/** m:ss (elapsed time, rounded down) */
export function formatClock(ms: number): string {
  return minutesSeconds(Math.floor(ms / 1000));
}

/** m:ss for a countdown: rounded up, so it shows 0:00 only when time is really up. */
export function formatCountdown(ms: number): string {
  return minutesSeconds(Math.ceil(ms / 1000));
}

function minutesSeconds(totalSec: number): string {
  const total = Math.max(0, totalSec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Plain hyphens instead of typographic dashes (model-written texts use "—" a lot). */
export function plainDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ' - ');
}

/** The report's model-written texts with plain hyphens; evidence quotes stay verbatim. */
export function withPlainDashes(report: Report): Report {
  const plain = (text: string | null) => (text === null ? null : plainDashes(text));
  return {
    ...report,
    summary: plainDashes(report.summary),
    insufficientReason: plain(report.insufficientReason),
    cefr: report.cefr && {
      speaking: {
        ...report.cefr.speaking,
        justification: plainDashes(report.cefr.speaking.justification),
      },
      listening: {
        ...report.cefr.listening,
        justification: plainDashes(report.cefr.listening.justification),
      },
    },
    criteria: report.criteria.map((c) => ({ ...c, comment: plainDashes(c.comment) })),
    language: { ...report.language, notes: plain(report.language.notes) },
  };
}
