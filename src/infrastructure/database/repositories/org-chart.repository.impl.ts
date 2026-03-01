import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgChartMember } from '../../../domain/entities/org-chart-member.entity';
import type { OrgChartRepository } from '../../../domain/repositories/org-chart.repository';
import { OrgChartMemberPersistence } from '../entities/org-chart-member.persistence';

@Injectable()
export class OrgChartRepositoryImpl implements OrgChartRepository {
  constructor(
    @InjectRepository(OrgChartMemberPersistence)
    private readonly repo: Repository<OrgChartMemberPersistence>,
  ) {}

  async findById(id: string, companyId: string): Promise<OrgChartMember | null> {
    const row = await this.repo.findOne({
      where: { id, company_id: companyId },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    companyId: string,
  ): Promise<OrgChartMember | null> {
    const row = await this.repo.findOne({
      where: { user_id: userId, company_id: companyId },
    });
    return row ? this.toDomain(row) : null;
  }

  async listByCompanyId(companyId: string): Promise<OrgChartMember[]> {
    const rows = await this.repo.find({
      where: { company_id: companyId },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: OrgChartMemberPersistence): OrgChartMember {
    return new OrgChartMember(
      row.id,
      row.company_id,
      row.user_id,
      row.name,
      row.email,
      row.department,
      row.role,
      row.manager_id,
      row.created_at,
    );
  }
}
