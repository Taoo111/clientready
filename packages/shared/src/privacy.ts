/**
 * Candidate link tokens are credentials (whoever has one can take the conversation), so they
 * must never reach logs or error monitoring. Matches the token in candidate page URLs
 * (`/a/<token>`) and in candidate API paths (`/public/assessments/<token>`).
 */
const CANDIDATE_TOKEN = /(\/a\/|\/public\/assessments\/)[A-Za-z0-9_-]{20,100}/g;

export const REDACTED_TOKEN = '[token]';

export function redactCandidateTokens(text: string): string {
  return text.replace(CANDIDATE_TOKEN, `$1${REDACTED_TOKEN}`);
}

/**
 * Returns a copy of a JSON-serialisable value (e.g. an error-monitoring event) with candidate
 * tokens removed from every string in it.
 */
export function redactCandidateTokensDeep<T>(value: T): T {
  return JSON.parse(redactCandidateTokens(JSON.stringify(value))) as T;
}

/**
 * Privacy options for error monitoring (Sentry), shared by the API and the web app: no user
 * info, cookies, headers, query strings or HTTP bodies (bodies carry transcripts and names),
 * and candidate tokens stripped from everything that is sent. Spread into `Sentry.init`.
 */
export const monitoringPrivacyOptions = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [] as never[],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
  },
  beforeSend: <T>(event: T): T => redactCandidateTokensDeep(event),
  beforeBreadcrumb: <T>(breadcrumb: T): T => redactCandidateTokensDeep(breadcrumb),
};
