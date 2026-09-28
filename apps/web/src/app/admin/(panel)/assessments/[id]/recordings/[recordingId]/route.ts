import { sessionToken } from '@/lib/admin/session';

/** Streams a recording from the API for the report's audio player (recruiter session required). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; recordingId: string }> },
) {
  const token = await sessionToken();
  if (!token) return new Response('Unauthorized', { status: 401 });
  const { id, recordingId } = await params;
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const upstream = await fetch(
    `${apiUrl}/admin/assessments/${encodeURIComponent(id)}/recordings/${encodeURIComponent(recordingId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: request.signal },
  );
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 404 ? upstream.status : 502;
    return new Response(null, { status });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/webm',
      'Cache-Control': 'private, no-store',
    },
  });
}
