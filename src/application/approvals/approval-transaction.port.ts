export interface ApprovalTransactionInput {
  companyId: string;
  userId: string;
  instanceId: string;
  stepId: string;
  decision: 'approve' | 'reject';
}

export interface ApprovalTransactionPort {
  execute(input: ApprovalTransactionInput): Promise<void>;
}
