import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertValidKey, Storage } from './storage';

export interface SupabaseStorageOptions {
  url: string;
  /** Secret key (sb_secret_…) or legacy service_role key: server side only, bypasses RLS. */
  secretKey: string;
  bucket: string;
}

/**
 * Recordings in a private Supabase Storage bucket. Nothing is written to the local file
 * system (hosting disks are ephemeral); playback uses short-lived signed URLs.
 */
export class SupabaseStorage extends Storage {
  private readonly client: SupabaseClient;
  private bucketChecked: Promise<void> | undefined;

  constructor(
    private readonly options: SupabaseStorageOptions,
    client?: SupabaseClient,
  ) {
    super();
    this.client =
      client ??
      createClient(options.url, options.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
  }

  private bucket() {
    return this.client.storage.from(this.options.bucket);
  }

  /** Creates the private bucket on first use if it does not exist yet. */
  ensureBucket(): Promise<void> {
    this.bucketChecked ??= (async () => {
      const { data } = await this.client.storage.getBucket(this.options.bucket);
      if (data) {
        if (data.public) throw new Error(`Storage bucket "${this.options.bucket}" must be private`);
        return;
      }
      const { error } = await this.client.storage.createBucket(this.options.bucket, {
        public: false,
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((error: unknown) => {
      this.bucketChecked = undefined;
      throw error;
    });
    return this.bucketChecked;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    assertValidKey(key);
    await this.ensureBucket();
    const { error } = await this.bucket().upload(key, data, { contentType, upsert: false });
    if (error) throw new Error(`Supabase upload failed for ${key}: ${error.message}`);
  }

  async get(key: string): Promise<Buffer> {
    assertValidKey(key);
    const { data, error } = await this.bucket().download(key);
    if (error || !data) throw new Error(`Supabase download failed for ${key}: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    const { error } = await this.bucket().remove([key]);
    if (error) throw new Error(`Supabase delete failed for ${key}: ${error.message}`);
  }

  async signedUrl(key: string, expiresInSec: number): Promise<string | null> {
    assertValidKey(key);
    const { data, error } = await this.bucket().createSignedUrl(key, expiresInSec);
    if (error) throw new Error(`Supabase signed URL failed for ${key}: ${error.message}`);
    return data.signedUrl;
  }
}
