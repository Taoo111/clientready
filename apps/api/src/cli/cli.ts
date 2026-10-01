import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { validateEnv, type Env } from '../config/env';

/** Shared plumbing for the CLI scripts in this folder (run with tsx, no Nest). */

export const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** Loads the repo-root .env and validates it exactly like the API does. */
export function loadEnv(): Env {
  loadDotenv({ path: path.join(REPO_ROOT, '.env'), quiet: true });
  return validateEnv(process.env);
}

/** Script arguments; pnpm forwards a literal "--" when called as `pnpm <script> -- ...`. */
export function cliArgs(): string[] {
  return process.argv.slice(2).filter((arg) => arg !== '--');
}

/** Runs the entry point; failures print just the message and set a non-zero exit code. */
export function runCli(main: () => Promise<void>): void {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
