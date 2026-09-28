import { roleTemplates } from '../../roles/index.js';
import { RoleTemplateSchema, type RoleTemplate } from './schema.js';

export * from './schema.js';

function loadTemplates(): ReadonlyMap<string, RoleTemplate> {
  const map = new Map<string, RoleTemplate>();
  for (const raw of roleTemplates) {
    const template = RoleTemplateSchema.parse(raw);
    if (map.has(template.id)) {
      throw new Error(`Duplicate role template id: ${template.id}`);
    }
    map.set(template.id, template);
  }
  return map;
}

const templates = loadTemplates();

export function listRoleTemplates(): RoleTemplate[] {
  return [...templates.values()];
}

export function getRoleTemplate(id: string): RoleTemplate | undefined {
  return templates.get(id);
}
