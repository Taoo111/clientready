import { describe, expect, it } from 'vitest';
import { roleTemplates } from '../roles/index.js';
import { SESSION_HARD_LIMIT_MS, WRAP_UP_AT_MS } from '../src/api/candidate.js';
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

  it.each(roleTemplates.map((t) => [t.id, t] as const))(
    '%s suggests one question at a time (outside the scripted client situation)',
    (_id, t) => {
      for (const phase of t.phases.filter((p) => p.id !== 'client-situation')) {
        for (const question of phase.suggestedQuestions) {
          expect((question.match(/\?/g) ?? []).length, question).toBeLessThanOrEqual(1);
        }
      }
    },
  );

  it.each(roleTemplates.map((t) => [t.id, t] as const))(
    '%s gives the AI client no evaluator framing',
    (_id, t) => {
      // Everything except the rubric ends up in the AI client's instructions.
      const clientText = JSON.stringify({ ...t, rubric: undefined });
      expect(clientText).not.toMatch(
        /\b(see|test|check)s? whether|\bevaluat|\bscor(e|ing)\b|\bassess|clarifying question/i,
      );
    },
  );

  it('registers the QA, frontend and product owner templates', () => {
    for (const id of ['qa-engineer', 'frontend-developer', 'product-owner']) {
      expect(getRoleTemplate(id), id).toBeDefined();
    }
  });

  it.each(roleTemplates.map((t) => [t.id, t] as const))(
    '%s uses the default criteria and the standard phases',
    (_id, t) => {
      expect(t.rubric.map((c) => c.key)).toEqual([...DEFAULT_CRITERIA_KEYS]);
      expect(t.phases.map((p) => p.id)).toEqual([
        'warm-up',
        'project-deep-dive',
        'client-situation',
        'closing',
      ]);
    },
  );

  it('gives every template its own client persona', () => {
    const companies = roleTemplates.map((t) => t.persona.card.company);
    const names = roleTemplates.map((t) => t.persona.card.name);
    expect(new Set(companies).size).toBe(roleTemplates.length);
    expect(new Set(names).size).toBe(roleTemplates.length);
  });

  it('rejects duplicate template ids', () => {
    expect(() => loadTemplates([backend, backend])).toThrow(/Duplicate role template id/);
  });
});

describe('business-analyst template', () => {
  const ba = getRoleTemplate('business-analyst');

  it('is registered with the default criteria and the standard phases', () => {
    expect(ba).toBeDefined();
    expect(ba!.rubric.map((c) => c.key)).toEqual([...DEFAULT_CRITERIA_KEYS]);
    expect(ba!.phases.map((p) => p.id)).toEqual([
      'warm-up',
      'project-deep-dive',
      'client-situation',
      'closing',
    ]);
  });

  it('is clearly different from the backend template', () => {
    expect(ba!.persona.company).not.toEqual(backend!.persona.company);
    expect(ba!.rubric.find((c) => c.key === 'vocabulary_precision')!.name).toMatch(/business/i);
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
