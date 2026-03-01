import type { ApprovalRuleType } from '../value-objects/approval-rule.vo';

/**
 * Step (etapa) de aprovação de uma instância.
 * Status: pending | approved | rejected | skipped.
 */
export class InstanceStep {
  constructor(
    public readonly id: string,
    public readonly instanceId: string,
    public readonly stepRef: string,
    public readonly orderIndex: number,
    public readonly rule: ApprovalRuleType,
    public readonly quorumCount: number | null,
    public status: 'pending' | 'approved' | 'rejected' | 'skipped',
    public readonly slaHours: number,
    public slaDeadline: Date | null,
    public slaBreached: boolean,
    public resolvedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  isPending(): boolean {
    return this.status === 'pending';
  }
}
