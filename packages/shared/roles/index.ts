import type { RoleTemplate } from '../src/roles/schema.js';

/**
 * Role templates. Add a template by creating `roles/<id>.ts` exporting a
 * `RoleTemplate` and listing it here — no other code changes are needed.
 * Templates are validated with zod when the package loads.
 */
export const roleTemplates: RoleTemplate[] = [];
