import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InstanceStepPersistence } from './entities/instance-step.persistence';
import { WorkflowInstancePersistence } from './entities/workflow-instance.persistence';
import { DelegationPersistence } from './entities/delegation.persistence';
import type {
  GetInboxPort,
  GetInboxResult,
  InboxItem,
} from '../../application/approvals/get-inbox.port';

@Injectable()
export class GetInboxImpl implements GetInboxPort {
  constructor(
    @InjectRepository(InstanceStepPersistence)
    private readonly stepRepo: Repository<InstanceStepPersistence>,
    @InjectRepository(WorkflowInstancePersistence)
    private readonly instanceRepo: Repository<WorkflowInstancePersistence>,
    @InjectRepository(DelegationPersistence)
    private readonly delegationRepo: Repository<DelegationPersistence>,
  ) {}

  async getInbox(
    companyId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<GetInboxResult> {
    const now = new Date();
    const delegations = await this.delegationRepo.find({
      where: {
        company_id: companyId,
        delegate_id: userId,
      },
    });
    const delegatorIds = new Set(
      delegations.filter((d) => d.expires_at > now).map((d) => d.delegator_id),
    );

    const steps = await this.stepRepo
      .createQueryBuilder('step')
      .innerJoin(
        'workflow_instances',
        'wi',
        'wi.id = step.instance_id AND wi.company_id = :companyId',
        { companyId },
      )
      .where('step.status = :status', { status: 'pending' })
      .orderBy('step.order_index', 'ASC')
      .getMany();

    const instanceIds = [...new Set(steps.map((s) => s.instance_id))];
    const instances = await this.instanceRepo.find({
      where: { id: In(instanceIds), company_id: companyId },
    });
    const instancesByKey = new Map(instances.map((i) => [i.id, i]));

    const canAct = (step: InstanceStepPersistence): boolean => {
      const instance = instancesByKey.get(step.instance_id);
      if (!instance || instance.company_id !== companyId) return false;
      const snapshot = instance.snapshot as {
        resolved_approvers?: Record<string, string[]>;
      };
      const approvers =
        snapshot?.resolved_approvers?.[step.step_ref] ?? [];
      if (approvers.includes(userId)) return true;
      return approvers.some((id) => delegatorIds.has(id));
    };

    const eligible: Array<{ step: InstanceStepPersistence; instance: WorkflowInstancePersistence }> = [];
    for (const step of steps) {
      const instance = instancesByKey.get(step.instance_id);
      if (instance && canAct(step)) {
        eligible.push({ step, instance });
      }
    }

    eligible.sort((a, b) => {
      const atA = a.instance.submitted_at?.getTime() ?? 0;
      const atB = b.instance.submitted_at?.getTime() ?? 0;
      if (atB !== atA) return atB - atA;
      return a.step.order_index - b.step.order_index;
    });

    const total = eligible.length;
    const start = (page - 1) * limit;
    const slice = eligible.slice(start, start + limit);

    const items: InboxItem[] = slice.map(({ step, instance }) => ({
      stepId: step.id,
      instanceId: step.instance_id,
      stepRef: step.step_ref,
      orderIndex: step.order_index,
      instanceSubmittedAt: instance.submitted_at,
    }));

    return { items, total, page, limit };
  }
}
