/** Blob storage for recordings. MVP: local disk; later an S3-compatible EU bucket. */
export abstract class Storage {
  abstract put(key: string, data: Buffer, contentType: string): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*(\.[A-Za-z0-9]+)?$/;

/** Keys are relative, slash-separated and contain no `..` or other special segments. */
export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}
