import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApprovalRuleService } from '../../domain/services/approval-rule.service';
import { DelegationExpiredException } from '../../domain/exceptions/delegation-expired.exception';
import { WorkflowInstancePersistence } from './entities/workflow-instance.persistence';
import { InstanceStepPersistence } from './entities/instance-step.persistence';
import { StepVotePersistence } from './entities/step-vote.persistence';
import { DelegationPersistence } from './entities/delegation.persistence';
import type { AuditPublisherPort } from '../../application/approvals/audit-publisher.port';
import { AUDIT_PUBLISHER_PORT } from '../../application/approvals/tokens';
import type {
  ApprovalTransactionPort,
  ApprovalTransactionInput,
} from '../../application/approvals/approval-transaction.port';

@Injectable()
export class ApprovalTransactionService implements ApprovalTransactionPort {
  private readonly logger = new Logger(ApprovalTransactionService.name);
  private readonly approvalRule = new ApprovalRuleService();

  constructor(
    private readonly dataSource: DataSource,
    @Inject(AUDIT_PUBLISHER_PORT)
    private readonly auditPublisher: AuditPublisherPort,
  ) {}

  async execute(input: ApprovalTransactionInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const voteRepo = manager.getRepository(StepVotePersistence);
      const stepRepo = manager.getRepository(InstanceStepPersistence);
      const instanceRepo = manager.getRepository(WorkflowInstancePersistence);
      const delegationRepo = manager.getRepository(DelegationPersistence);

      const existingVote = await voteRepo.findOne({
        where: {
          step_id: input.stepId,
          approver_id: input.userId,
        },
      });
      if (existingVote) {
        return;
      }

      const stepRow = await stepRepo.findOne({
        where: { id: input.stepId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stepRow) {
        throw new Error('Step não encontrado');
      }
      if (stepRow.instance_id !== input.instanceId) {
        throw new Error('Step não pertence à instância');
      }

      const instanceRow = await instanceRepo.findOne({
        where: { id: input.instanceId, company_id: input.companyId },
      });
      if (!instanceRow) {
        throw new Error('Instância não encontrada');
      }
      if (stepRow.status !== 'pending') {
        this.logger.warn(
          `Voto ignorado: step ${input.stepId} já resolvido com status ${stepRow.status}. approver_id: ${input.userId}`,
        );
        return;
      }

      const snapshot = instanceRow.snapshot as {
        resolved_approvers: Record<string, string[]>;
      };
      const approverIds: string[] =
        snapshot?.resolved_approvers?.[stepRow.step_ref] ?? [];
      let approverIdToUse = input.userId;
      let delegatedBy: string | null = null;

      if (approverIds.includes(input.userId)) {
        approverIdToUse = input.userId;
      } else {
        const delegation = await delegationRepo
          .createQueryBuilder('d')
          .where('d.company_id = :companyId', { companyId: input.companyId })
          .andWhere('d.delegate_id = :userId', { userId: input.userId })
          .andWhere('d.delegator_id IN (:...approverIds)', {
            approverIds,
          })
          .andWhere('d.expires_at > :now', { now: new Date() })
          .getOne();
        if (delegation) {
          approverIdToUse = delegation.delegator_id;
          delegatedBy = input.userId;
        } else {
          const expired = await delegationRepo
            .createQueryBuilder('d')
            .where('d.company_id = :companyId', { companyId: input.companyId })
            .andWhere('d.delegate_id = :userId', { userId: input.userId })
            .andWhere('d.delegator_id IN (:...approverIds)', {
              approverIds,
            })
            .getOne();
          if (expired) {
            throw new DelegationExpiredException();
          }
          throw new Error('Usuário não é aprovador nem delegado');
        }
      }

      const duplicateByApprover = await voteRepo.findOne({
        where: {
          step_id: input.stepId,
          approver_id: approverIdToUse,
        },
      });
      if (duplicateByApprover) {
        return;
      }

      const voteRow = new StepVotePersistence();
      voteRow.id = randomUUID();
      voteRow.step_id = input.stepId;
      voteRow.approver_id = approverIdToUse;
      voteRow.decision = input.decision;
      voteRow.delegated_by = delegatedBy;
      voteRow.voted_at = new Date();
      await voteRepo.save(voteRow);

      const allVotes = await voteRepo.find({
        where: { step_id: input.stepId },
      });
      const votes = allVotes.map((v) => v.decision as 'approve' | 'reject');
      const totalApprovers = approverIds.length;
      const resolution = this.approvalRule.resolve(
        stepRow.rule as 'ALL' | 'ANY' | 'QUORUM',
        totalApprovers,
        votes,
      );

      if (resolution) {
        stepRow.status = resolution;
        stepRow.resolved_at = new Date();
        await stepRepo.save(stepRow);

        if (resolution === 'approved' || resolution === 'rejected') {
          const allSteps = await stepRepo.find({
            where: { instance_id: input.instanceId },
            order: { order_index: 'ASC' },
          });
          const allResolved = allSteps.every(
            (s) => s.status === 'approved' || s.status === 'rejected',
          );
          if (allResolved) {
            const hasRejected = allSteps.some((s) => s.status === 'rejected');
            instanceRow.status = hasRejected ? 'rejected' : 'approved';
            await instanceRepo.save(instanceRow);
          }
        }
      }
    });

    await this.auditPublisher.publish({
      companyId: input.companyId,
      entityType: 'instance_step',
      entityId: input.stepId,
      action:
        input.decision === 'approve'
          ? 'STEP_APPROVED'
          : 'STEP_REJECTED',
      actorId: input.userId,
      payload: {
        instanceId: input.instanceId,
        stepId: input.stepId,
        decision: input.decision,
      },
    });
  }
}
