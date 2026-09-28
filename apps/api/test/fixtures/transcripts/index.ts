import { baMediumCandidate } from './ba-medium';
import { baStrongCandidate } from './ba-strong';
import { baWeakCandidate } from './ba-weak';
import { mediumCandidate } from './medium';
import { strongCandidate } from './strong';
import { weakCandidate } from './weak';

/** Per role: strong, medium, weak (in this order). */
export const transcriptFixtures = [
  strongCandidate,
  mediumCandidate,
  weakCandidate,
  baStrongCandidate,
  baMediumCandidate,
  baWeakCandidate,
];
export type { TranscriptFixture } from './build';
