import type { RoleTemplate, TimeCue } from '@clientready/shared';
import * as v1 from './v1';
import * as v2 from './v2';
import * as v3 from './v3';
import * as v4 from './v4';

export interface ClientPromptModule {
  CLIENT_PROMPT_VERSION: string;
  buildClientInstructions(input: v2.ClientPromptInput): string;
  buildTimeCues(template: RoleTemplate): TimeCue[];
}

/** All client prompt versions (for the simulator's A/B comparisons). */
export const clientPrompts: Record<string, ClientPromptModule> = {
  'client-v1': v1,
  'client-v2': v2,
  'client-v3': v3,
  'client-v4': v4,
};

/** The version used for real conversations. */
export const currentClientPrompt: ClientPromptModule = v4;
