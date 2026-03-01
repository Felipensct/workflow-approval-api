import { Inject, Injectable } from '@nestjs/common';
import type { ApprovalTransactionPort } from './approval-transaction.port';
import { APPROVAL_TRANSACTION_PORT } from './tokens';

export interface RejectStepInput {
  companyId: string;
  userId: string;
  instanceId: string;
  stepId: string;
}

@Injectable()
export class RejectStepUseCase {
  constructor(
    @Inject(APPROVAL_TRANSACTION_PORT)
    private readonly transactionService: ApprovalTransactionPort,
  ) {}

  async execute(input: RejectStepInput): Promise<void> {
    await this.transactionService.execute({
      ...input,
      decision: 'reject',
    });
  }
}
