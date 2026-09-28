import { tmpdir } from 'node:os';
import path from 'node:path';
import { TEST_ADMIN_KEY, testDatabaseUrl } from './test-env';

// process.env wins over .env files in @nestjs/config.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.ADMIN_API_KEY = TEST_ADMIN_KEY;
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.LINK_TTL_DAYS = '14';
process.env.MAX_REALTIME_CONNECTS = '3';
process.env.STORAGE_DIR = path.join(tmpdir(), 'clientready-e2e-storage');
process.env.MAX_RECORDING_MB = '1';
process.env.EVAL_START_DELAY_MS = '200';
process.env.EVAL_RETRY_DELAY_MS = '20';
process.env.EVAL_MAX_ATTEMPTS = '3';
process.env.EVAL_MIN_CONVERSATION_SEC = '420';
process.env.EVAL_MIN_CANDIDATE_SPEECH_SEC = '180';
process.env.ADMIN_EMAIL = 'recruiter@example.com';
process.env.ADMIN_PASSWORD = 'correct horse battery staple';
process.env.SESSION_TTL_HOURS = '12';
process.env.RETENTION_PURGE_INTERVAL_HOURS = '0';
