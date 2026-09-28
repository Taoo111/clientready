import { TEST_ADMIN_KEY, testDatabaseUrl } from './test-env';

// process.env wins over .env files in @nestjs/config.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.ADMIN_API_KEY = TEST_ADMIN_KEY;
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.LINK_TTL_DAYS = '14';
process.env.MAX_REALTIME_CONNECTS = '3';
