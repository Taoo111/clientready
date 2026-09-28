import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertValidKey, Storage } from './storage';

export class LocalDiskStorage extends Storage {
  private readonly root: string;

  constructor(rootDir: string) {
    super();
    this.root = path.resolve(rootDir);
  }

  private pathFor(key: string): string {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) {
      throw new Error(`Storage key escapes root: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const full = this.pathFor(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }
}
