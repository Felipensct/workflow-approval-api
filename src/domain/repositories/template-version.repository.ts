import type { TemplateVersion } from '../entities/template-version.entity';

/**
 * Port para persistência de versões de template.
 */
export interface TemplateVersionRepository {
  findById(id: string, companyId: string): Promise<TemplateVersion | null>;
  findByTemplateId(templateId: string, companyId: string): Promise<TemplateVersion[]>;
  save(version: TemplateVersion): Promise<TemplateVersion>;
}
