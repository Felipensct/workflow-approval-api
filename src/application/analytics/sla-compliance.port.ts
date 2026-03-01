export interface SlaComplianceResult {
  total_instances: number;
  total_steps: number;
  breached_steps: number;
  compliance_rate: number;
  breached_by_step: Record<string, number>;
  period: { from: string; to: string };
}

export interface SlaCompliancePort {
  getSlaCompliance(
    companyId: string,
    from?: Date,
    to?: Date,
  ): Promise<SlaComplianceResult>;
}
