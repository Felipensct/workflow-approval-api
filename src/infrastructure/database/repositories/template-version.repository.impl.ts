import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateVersion } from '../../../domain/entities/template-version.entity';
import type { TemplateVersionRepository } from '../../../domain/repositories/template-version.repository';
import { TemplateVersionPersistence } from '../entities/template-version.persistence';

@Injectable()
export class TemplateVersionRepositoryImpl implements TemplateVersionRepository {
  constructor(
    @InjectRepository(TemplateVersionPersistence)
    private readonly repo: Repository<TemplateVersionPersistence>,
  ) {}

  async findById(id: string, companyId: string): Promise<TemplateVersion | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    const [check] = await this.repo.manager.query<{ n: number }[]>(
      'SELECT 1 AS n FROM templates WHERE id = $1 AND company_id = $2',
      [row.template_id, companyId],
    );
    if (!check) return null;
    return this.toDomain(row);
  }

  async findByTemplateId(
    templateId: string,
    companyId: string,
  ): Promise<TemplateVersion[]> {
    const [check] = await this.repo.manager.query<{ n: number }[]>(
      'SELECT 1 AS n FROM templates WHERE id = $1 AND company_id = $2',
      [templateId, companyId],
    );
    if (!check) return [];
    const rows = await this.repo.find({
      where: { template_id: templateId },
      order: { version_number: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(version: TemplateVersion): Promise<TemplateVersion> {
    const row = this.toPersistence(version);
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  private toDomain(row: TemplateVersionPersistence): TemplateVersion {
    return new TemplateVersion(
      row.id,
      row.template_id,
      row.version_number,
      row.status as 'draft' | 'published',
      row.definition,
      row.published_at,
      row.created_at,
    );
  }

  private toPersistence(version: TemplateVersion): TemplateVersionPersistence {
    const p = new TemplateVersionPersistence();
    p.id = version.id;
    p.template_id = version.templateId;
    p.version_number = version.versionNumber;
    p.status = version.status;
    p.definition = version.definition;
    p.published_at = version.publishedAt;
    p.created_at = version.createdAt;
    return p;
  }
}
