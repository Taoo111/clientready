import type { RoleTemplate } from '../src/roles/schema.js';
import { backendDeveloper } from './backend-developer.js';
import { businessAnalyst } from './business-analyst.js';
import { frontendDeveloper } from './frontend-developer.js';
import { productOwner } from './product-owner.js';
import { qaEngineer } from './qa-engineer.js';

/**
 * Role templates. Add a template by creating `roles/<id>.ts` exporting a
 * `RoleTemplate` and listing it here — no other code changes are needed.
 * Templates are validated with zod when the package loads.
 */
export const roleTemplates: RoleTemplate[] = [
  backendDeveloper,
  frontendDeveloper,
  qaEngineer,
  businessAnalyst,
  productOwner,
];
