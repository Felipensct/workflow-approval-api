import { Controller, Get, Query } from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';
import { GetSlaComplianceUseCase } from '../../application/analytics/get-sla-compliance.usecase';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly getSlaCompliance: GetSlaComplianceUseCase,
  ) {}

  @Get('sla-compliance')
  async slaCompliance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? this.parseOptionalDate(from) : undefined;
    const toDate = to ? this.parseOptionalDate(to) : undefined;
    return this.getSlaCompliance.execute({
      companyId: this.tenant.companyId,
      from: fromDate,
      to: toDate,
    });
  }

  private parseOptionalDate(value: string): Date | undefined {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
}
