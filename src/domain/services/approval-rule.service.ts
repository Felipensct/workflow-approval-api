import type { ApprovalRuleType } from '../value-objects/approval-rule.vo';

export type VoteDecision = 'approve' | 'reject';

/**
 * Resultado da avaliação da regra de aprovação.
 * null = ainda pendente (regra não satisfeita nem rejeitada).
 */
export type StepResolution = 'approved' | 'rejected' | null;

/**
 * Serviço de domínio para regras de aprovação (ALL, ANY, QUORUM).
 * Sem dependência de infraestrutura.
 */
export class ApprovalRuleService {
  /**
   * Calcula o novo status do step com base na regra, total de aprovadores e votos.
   * - ALL: todos aprovaram e nenhum rejeitou -> approved; qualquer reject -> rejected.
   * - ANY: pelo menos um approve -> approved.
   * - QUORUM: aprovações >= floor(total/2)+1 -> approved; se rejeições tornam quorum impossível -> rejected.
   */
  resolve(
    rule: ApprovalRuleType,
    totalApprovers: number,
    votes: VoteDecision[],
  ): StepResolution {
    const approves = votes.filter((v) => v === 'approve').length;
    const rejects = votes.filter((v) => v === 'reject').length;

    switch (rule) {
      case 'ALL':
        if (rejects > 0) return 'rejected';
        return approves === totalApprovers ? 'approved' : null;

      case 'ANY':
        if (approves > 0) return 'approved';
        if (approves + rejects === totalApprovers && rejects > 0) return 'rejected';
        return null;

      case 'QUORUM': {
        const quorumRequired = Math.floor(totalApprovers / 2) + 1;
        if (rejects > 0 && totalApprovers - rejects < quorumRequired) {
          return 'rejected';
        }
        if (approves >= quorumRequired) return 'approved';
        if (rejects > 0 && approves + rejects === totalApprovers) {
          return 'rejected';
        }
        return null;
      }
    }
  }
}
