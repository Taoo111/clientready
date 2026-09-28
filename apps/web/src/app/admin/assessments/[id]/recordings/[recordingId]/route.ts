import { adminFetch, isAdmin } from '@/lib/admin/session';

/** Streams a recording from the API for the report's audio player (admin session required). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordingId: string }> },
) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const { id, recordingId } = await params;
  const upstream = await adminFetch(
    `/assessments/${encodeURIComponent(id)}/recordings/${encodeURIComponent(recordingId)}`,
  );
  if (!upstream.ok || !upstream.body) {
    return new Response('Not found', { status: upstream.status === 404 ? 404 : 502 });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/webm',
      'Cache-Control': 'private, no-store',
    },
  });
}
