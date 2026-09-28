/** Blob storage for recordings: local disk (development) or Supabase Storage (production). */
export abstract class Storage {
  abstract put(key: string, data: Buffer, contentType: string): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
  /**
   * Short-lived URL the browser can play the file from directly, or null when the storage
   * cannot sign URLs (local disk — the file is then streamed through the API).
   */
  abstract signedUrl(key: string, expiresInSec: number): Promise<string | null>;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*(\.[A-Za-z0-9]+)?$/;

/** Keys are relative, slash-separated and contain no `..` or other special segments. */
export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}
