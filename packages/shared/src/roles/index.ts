import { roleTemplates } from '../../roles/index.js';
import { RoleTemplateSchema, type RoleTemplate } from './schema.js';

export * from './schema.js';

/** Validates templates and indexes them by id; throws on invalid or duplicate templates. */
export function loadTemplates(raw: readonly unknown[]): ReadonlyMap<string, RoleTemplate> {
  const map = new Map<string, RoleTemplate>();
  for (const item of raw) {
    const template = RoleTemplateSchema.parse(item);
    if (map.has(template.id)) {
      throw new Error(`Duplicate role template id: ${template.id}`);
    }
    map.set(template.id, template);
  }
  return map;
}

const templates = loadTemplates(roleTemplates);

export function listRoleTemplates(): RoleTemplate[] {
  return [...templates.values()];
}

export function getRoleTemplate(id: string): RoleTemplate | undefined {
  return templates.get(id);
}
