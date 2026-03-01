import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowInstancePersistence } from '../../infrastructure/database/entities/workflow-instance.persistence';
import { InstanceStepPersistence } from '../../infrastructure/database/entities/instance-step.persistence';
import { StepVotePersistence } from '../../infrastructure/database/entities/step-vote.persistence';
import { DelegationPersistence } from '../../infrastructure/database/entities/delegation.persistence';
import { ApprovalTransactionService } from '../../infrastructure/database/approval-transaction.service';
import { AuditPublisherImpl, AUDIT_QUEUE_NAME } from '../../infrastructure/messaging/audit-publisher.impl';
import { GetInboxImpl } from '../../infrastructure/database/get-inbox.impl';
import { GetInboxUseCase } from '../../application/approvals/get-inbox.usecase';
import { ApproveStepUseCase } from '../../application/approvals/approve-step.usecase';
import { RejectStepUseCase } from '../../application/approvals/reject-step.usecase';
import { ApprovalsController } from './approvals.controller';
import {
  AUDIT_PUBLISHER_PORT,
  APPROVAL_TRANSACTION_PORT,
  GET_INBOX_PORT,
} from '../../application/approvals/tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowInstancePersistence,
      InstanceStepPersistence,
      StepVotePersistence,
      DelegationPersistence,
    ]),
    BullModule.registerQueue({ name: AUDIT_QUEUE_NAME }),
  ],
  controllers: [ApprovalsController],
  providers: [
    { provide: AUDIT_PUBLISHER_PORT, useClass: AuditPublisherImpl },
    { provide: APPROVAL_TRANSACTION_PORT, useClass: ApprovalTransactionService },
    { provide: GET_INBOX_PORT, useClass: GetInboxImpl },
    GetInboxUseCase,
    ApproveStepUseCase,
    RejectStepUseCase,
  ],
})
export class ApprovalsModule {}
