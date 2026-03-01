import type { OrgChartMember } from '../entities/org-chart-member.entity';

/**
 * Port para acesso ao organograma (aprovadores por empresa).
 */
export interface OrgChartRepository {
  findById(id: string, companyId: string): Promise<OrgChartMember | null>;
  findByUserId(userId: string, companyId: string): Promise<OrgChartMember | null>;
  listByCompanyId(companyId: string): Promise<OrgChartMember[]>;
}
