import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseStorage } from './supabase.storage';

function fakeClient(bucket: { public: boolean } | null = { public: false }) {
  const files = new Map<string, Buffer>();
  const api = {
    upload: vi.fn(async (key: string, data: Buffer) => {
      files.set(key, data);
      return { data: { path: key }, error: null };
    }),
    download: vi.fn(async (key: string) =>
      files.has(key)
        ? { data: new Blob([new Uint8Array(files.get(key)!)]), error: null }
        : { data: null, error: { message: 'Object not found' } },
    ),
    remove: vi.fn(async (keys: string[]) => {
      for (const key of keys) files.delete(key);
      return { data: [], error: null };
    }),
    createSignedUrl: vi.fn(async (key: string, expiresIn: number) => ({
      data: {
        signedUrl: `https://project.supabase.co/storage/v1/object/sign/recordings/${key}?e=${expiresIn}`,
      },
      error: null,
    })),
  };
  const storage = {
    from: vi.fn(() => api),
    getBucket: vi.fn(async () => ({
      data: bucket,
      error: bucket ? null : { message: 'not found' },
    })),
    createBucket: vi.fn(async () => ({ data: { name: 'recordings' }, error: null })),
  };
  return { client: { storage } as unknown as SupabaseClient, api, storage };
}

const options = {
  url: 'https://project.supabase.co',
  secretKey: 'sb_secret_x',
  bucket: 'recordings',
};

describe('SupabaseStorage', () => {
  it('uploads, downloads, signs and deletes in the configured bucket', async () => {
    const { client, api, storage } = fakeClient();
    const store = new SupabaseStorage(options, client);

    await store.put('recordings/a1/r1.webm', Buffer.from('audio'), 'audio/webm');
    expect(api.upload).toHaveBeenCalledWith('recordings/a1/r1.webm', expect.any(Buffer), {
      contentType: 'audio/webm',
      upsert: false,
    });
    expect(storage.from).toHaveBeenCalledWith('recordings');
    expect((await store.get('recordings/a1/r1.webm')).toString()).toBe('audio');
    expect(await store.signedUrl('recordings/a1/r1.webm', 3600)).toContain('e=3600');

    await store.delete('recordings/a1/r1.webm');
    await expect(store.get('recordings/a1/r1.webm')).rejects.toThrow(/download failed/);
  });

  it('creates the private bucket once when it is missing', async () => {
    const { client, storage } = fakeClient(null);
    const store = new SupabaseStorage(options, client);
    await store.put('recordings/a/1.webm', Buffer.from('x'), 'audio/webm');
    await store.put('recordings/a/2.webm', Buffer.from('y'), 'audio/webm');
    expect(storage.createBucket).toHaveBeenCalledTimes(1);
    expect(storage.createBucket).toHaveBeenCalledWith('recordings', { public: false });
  });

  it('refuses a public bucket', async () => {
    const { client } = fakeClient({ public: true });
    const store = new SupabaseStorage(options, client);
    await expect(store.put('recordings/a/1.webm', Buffer.from('x'), 'audio/webm')).rejects.toThrow(
      /must be private/,
    );
  });

  it('rejects unsafe keys before calling Supabase', async () => {
    const { client, api } = fakeClient();
    const store = new SupabaseStorage(options, client);
    await expect(store.put('../x.webm', Buffer.from('x'), 'audio/webm')).rejects.toThrow();
    expect(api.upload).not.toHaveBeenCalled();
  });
});
