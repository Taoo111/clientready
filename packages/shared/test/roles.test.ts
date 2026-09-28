import { describe, expect, it } from 'vitest';
import { roleTemplates } from '../roles/index.js';
import { SESSION_HARD_LIMIT_MS, WRAP_UP_AT_MS } from '../src/api/assessments.js';
import {
  DEFAULT_CRITERIA_KEYS,
  RoleTemplateSchema,
  getRoleTemplate,
  listRoleTemplates,
  loadTemplates,
  type RoleTemplate,
} from '../src/roles/index.js';

const backend = getRoleTemplate('backend-developer');

function clone(template: RoleTemplate): RoleTemplate {
  return structuredClone(template);
}

describe('role template registry', () => {
  it('registers backend-developer as the first template', () => {
    expect(roleTemplates[0]?.id).toBe('backend-developer');
    expect(backend).toBeDefined();
  });

  it.each(roleTemplates.map((t) => [t.id, t] as const))('%s is a valid template', (_id, t) => {
    expect(() => RoleTemplateSchema.parse(t)).not.toThrow();
  });

  it.each(roleTemplates.map((t) => [t.id, t] as const))(
    '%s phases fit between wrap-up and the hard limit',
    (_id, t) => {
      const totalMs = t.phases.reduce((sum, p) => sum + p.targetDurationSec * 1000, 0);
      expect(totalMs).toBeGreaterThanOrEqual(WRAP_UP_AT_MS - 60_000);
      expect(totalMs).toBeLessThanOrEqual(SESSION_HARD_LIMIT_MS);
    },
  );

  it('lists every registered template', () => {
    expect(listRoleTemplates().map((t) => t.id)).toEqual(roleTemplates.map((t) => t.id));
  });

  it('rejects duplicate template ids', () => {
    expect(() => loadTemplates([backend, backend])).toThrow(/Duplicate role template id/);
  });
});

describe('backend-developer template', () => {
  it('uses the five default criteria', () => {
    expect(backend!.rubric.map((c) => c.key)).toEqual([...DEFAULT_CRITERIA_KEYS]);
  });

  it('has the four planned phases in order', () => {
    expect(backend!.phases.map((p) => [p.id, p.targetDurationSec])).toEqual([
      ['warm-up', 90],
      ['project-deep-dive', 300],
      ['client-situation', 240],
      ['closing', 30],
    ]);
  });

  it('has distinct guidance per level', () => {
    const { B1, B2, C1 } = backend!.levels;
    expect(new Set([B1.guidance, B2.guidance, C1.guidance]).size).toBe(3);
  });
});

describe('RoleTemplateSchema', () => {
  it('rejects a non-kebab-case id', () => {
    const t = clone(backend!);
    t.id = 'Backend Developer';
    expect(RoleTemplateSchema.safeParse(t).success).toBe(false);
  });

  it('rejects a missing level', () => {
    const t = clone(backend!) as Partial<RoleTemplate> & { levels: Record<string, unknown> };
    delete t.levels.C1;
    expect(RoleTemplateSchema.safeParse(t).success).toBe(false);
  });

  it('rejects duplicate rubric keys', () => {
    const t = clone(backend!);
    t.rubric.push(t.rubric[0]!);
    expect(RoleTemplateSchema.safeParse(t).success).toBe(false);
  });

  it('rejects duplicate phase ids', () => {
    const t = clone(backend!);
    t.phases.push(t.phases[0]!);
    expect(RoleTemplateSchema.safeParse(t).success).toBe(false);
  });

  it('rejects a phase without suggested questions', () => {
    const t = clone(backend!);
    t.phases[0]!.suggestedQuestions = [];
    expect(RoleTemplateSchema.safeParse(t).success).toBe(false);
  });
});
