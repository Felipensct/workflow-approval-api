import type { Template } from '../entities/template.entity';

/**
 * Port para persistência de templates.
 * Implementação em infrastructure filtra por company_id.
 */
export interface TemplateRepository {
  findById(id: string, companyId: string): Promise<Template | null>;
  list(companyId: string): Promise<Template[]>;
  save(template: Template): Promise<Template>;
}
