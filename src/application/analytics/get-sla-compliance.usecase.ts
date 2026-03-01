import { Inject, Injectable } from '@nestjs/common';
import type {
  SlaCompliancePort,
  SlaComplianceResult,
} from './sla-compliance.port';
import { SLA_COMPLIANCE_PORT } from './tokens';

export interface GetSlaComplianceInput {
  companyId: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class GetSlaComplianceUseCase {
  constructor(
    @Inject(SLA_COMPLIANCE_PORT)
    private readonly slaCompliancePort: SlaCompliancePort,
  ) {}

  async execute(input: GetSlaComplianceInput): Promise<SlaComplianceResult> {
    return this.slaCompliancePort.getSlaCompliance(
      input.companyId,
      input.from,
      input.to,
    );
  }
}
