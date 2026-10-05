/**
 * Name of the httpOnly cookie that holds the recruiter's session token. Its own file so the
 * proxy (which must stay light) and the server-side session code share it.
 */
export const SESSION_COOKIE = 'cr_session';
