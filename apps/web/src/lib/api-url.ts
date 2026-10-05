const LOCAL_API = 'http://localhost:3001';

/** API URL as seen from the candidate's browser (NEXT_PUBLIC_*: inlined at build time). */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API;

/** API URL for the panel's server-side calls (read at request time). */
export function serverApiUrl(): string {
  return process.env.API_URL ?? LOCAL_API;
}
