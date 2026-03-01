/**
 * Regra de aprovação de um step.
 * ALL: todos devem aprovar e nenhum rejeitar.
 * ANY: pelo menos um deve aprovar.
 * QUORUM: aprovações >= floor(total/2) + 1.
 */
export type ApprovalRuleType = 'ALL' | 'ANY' | 'QUORUM';

export const APPROVAL_RULES: readonly ApprovalRuleType[] = [
  'ALL',
  'ANY',
  'QUORUM',
] as const;

export function isApprovalRuleType(value: string): value is ApprovalRuleType {
  return APPROVAL_RULES.includes(value as ApprovalRuleType);
}
