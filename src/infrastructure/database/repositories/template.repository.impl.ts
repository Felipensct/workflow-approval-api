import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../../domain/entities/template.entity';
import type { TemplateRepository } from '../../../domain/repositories/template.repository';
import { TemplatePersistence } from '../entities/template.persistence';

@Injectable()
export class TemplateRepositoryImpl implements TemplateRepository {
  constructor(
    @InjectRepository(TemplatePersistence)
    private readonly repo: Repository<TemplatePersistence>,
  ) {}

  async findById(id: string, companyId: string): Promise<Template | null> {
    const row = await this.repo.findOne({
      where: { id, company_id: companyId },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(companyId: string): Promise<Template[]> {
    const rows = await this.repo.find({
      where: { company_id: companyId },
      order: { created_at: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(template: Template): Promise<Template> {
    const row = this.toPersistence(template);
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  private toDomain(row: TemplatePersistence): Template {
    return new Template(
      row.id,
      row.company_id,
      row.name,
      row.description,
      row.created_at,
    );
  }

  private toPersistence(template: Template): TemplatePersistence {
    const p = new TemplatePersistence();
    p.id = template.id;
    p.company_id = template.companyId;
    p.name = template.name;
    p.description = template.description;
    p.created_at = template.createdAt;
    return p;
  }
}
