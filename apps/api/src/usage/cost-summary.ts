import type { TokenUsage } from '@clientready/shared';
import { estimateCostUsd } from './pricing';

export type UsageSourceName = 'REALTIME' | 'TRANSCRIPTION' | 'EVALUATION';

export interface UsageRow extends TokenUsage {
  source: UsageSourceName;
  model: string;
}

export interface CostSummary {
  /** USD per source; sources without rows are 0. */
  bySource: Record<UsageSourceName, number>;
  totalUsd: number;
  /** Models used but missing from the price list (their cost is not included). */
  unpricedModels: string[];
}

/** Sums the estimated cost of one assessment's usage rows. */
export function summariseCost(rows: readonly UsageRow[]): CostSummary {
  const bySource: Record<UsageSourceName, number> = {
    REALTIME: 0,
    TRANSCRIPTION: 0,
    EVALUATION: 0,
  };
  const unpriced = new Set<string>();
  for (const row of rows) {
    const cost = estimateCostUsd(row.model, row);
    if (cost === null) unpriced.add(row.model);
    else bySource[row.source] += cost;
  }
  return {
    bySource,
    totalUsd: bySource.REALTIME + bySource.TRANSCRIPTION + bySource.EVALUATION,
    unpricedModels: [...unpriced].sort(),
  };
}
