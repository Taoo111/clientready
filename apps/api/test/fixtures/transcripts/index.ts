import { baFluentVagueCandidate } from './ba-fluent-vague';
import { baMediumCandidate } from './ba-medium';
import { baStrongCandidate } from './ba-strong';
import { baWeakCandidate } from './ba-weak';
import { mediumCandidate } from './medium';
import { strongCandidate } from './strong';
import { weakCandidate } from './weak';

/** Per role: strong, medium, weak (in this order), then special cases. */
export const transcriptFixtures = [
  strongCandidate,
  mediumCandidate,
  weakCandidate,
  baStrongCandidate,
  baMediumCandidate,
  baWeakCandidate,
  baFluentVagueCandidate,
];
export type { TranscriptFixture } from './build';
