import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  let dir: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'cr-storage-'));
    storage = new LocalDiskStorage(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('stores, reads and deletes', async () => {
    await storage.put('recordings/a1/r1.webm', Buffer.from('audio'), 'audio/webm');
    expect((await storage.get('recordings/a1/r1.webm')).toString()).toBe('audio');
    await storage.delete('recordings/a1/r1.webm');
    await expect(storage.get('recordings/a1/r1.webm')).rejects.toThrow();
  });

  it.each(['../evil.webm', 'a/../../evil', '/abs/path', 'a\b', 'a//b', ''])(
    'rejects unsafe key %j',
    async (key) => {
      await expect(storage.put(key, Buffer.from('x'), 'audio/webm')).rejects.toThrow();
    },
  );
});
