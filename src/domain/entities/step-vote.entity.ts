/**
 * Voto de um aprovador em um step.
 * decision: approve | reject.
 * delegated_by preenchido quando o voto foi feito por delegado.
 */
export class StepVote {
  constructor(
    public readonly id: string,
    public readonly stepId: string,
    public readonly approverId: string,
    public readonly decision: 'approve' | 'reject',
    public readonly delegatedBy: string | null,
    public readonly votedAt: Date,
  ) {}
}
