/**
 * Membro do organograma da empresa (aprovador potencial).
 */
export class OrgChartMember {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly userId: string,
    public name: string,
    public email: string,
    public department: string,
    public role: string,
    public readonly managerId: string | null,
    public readonly createdAt: Date,
  ) {}
}
