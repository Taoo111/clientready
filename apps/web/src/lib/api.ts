const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** Server-side check that the API (and its database) is reachable. */
export async function isApiHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
