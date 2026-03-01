import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstancePersistence } from './entities/workflow-instance.persistence';
import { InstanceStepPersistence } from './entities/instance-step.persistence';
import type {
  SlaCompliancePort,
  SlaComplianceResult,
} from '../../application/analytics/sla-compliance.port';

@Injectable()
export class SlaComplianceImpl implements SlaCompliancePort {
  constructor(
    @InjectRepository(WorkflowInstancePersistence)
    private readonly instanceRepo: Repository<WorkflowInstancePersistence>,
    @InjectRepository(InstanceStepPersistence)
    private readonly stepRepo: Repository<InstanceStepPersistence>,
  ) {}

  async getSlaCompliance(
    companyId: string,
    from?: Date,
    to?: Date,
  ): Promise<SlaComplianceResult> {
    const periodFrom = from ?? new Date(0);
    const periodTo = to ?? new Date(8640000000000000);

    const qb = this.instanceRepo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.submitted_at IS NOT NULL')
      .andWhere('i.submitted_at >= :periodFrom', {
        periodFrom: periodFrom.toISOString(),
      })
      .andWhere('i.submitted_at <= :periodTo', {
        periodTo: periodTo.toISOString(),
      });

    const instanceIds = await qb
      .select('i.id', 'id')
      .getRawMany<{ id: string }>();
    const ids = instanceIds.map((r) => r.id);
    if (ids.length === 0) {
      return {
        total_instances: 0,
        total_steps: 0,
        breached_steps: 0,
        compliance_rate: 100,
        breached_by_step: {},
        period: {
          from: periodFrom.toISOString(),
          to: periodTo.toISOString(),
        },
      };
    }

    const totalSteps = await this.stepRepo
      .createQueryBuilder('s')
      .where('s.instance_id IN (:...ids)', { ids })
      .getCount();

    const breachedSteps = await this.stepRepo
      .createQueryBuilder('s')
      .where('s.instance_id IN (:...ids)', { ids })
      .andWhere('s.sla_breached = true')
      .getCount();

    const breachedByStepRows = await this.stepRepo
      .createQueryBuilder('s')
      .select('s.step_ref', 'step_ref')
      .addSelect('COUNT(*)', 'cnt')
      .where('s.instance_id IN (:...ids)', { ids })
      .andWhere('s.sla_breached = true')
      .groupBy('s.step_ref')
      .getRawMany<{ step_ref: string; cnt: string }>();

    const breached_by_step: Record<string, number> = {};
    for (const row of breachedByStepRows) {
      breached_by_step[row.step_ref] = parseInt(row.cnt, 10);
    }

    const compliance_rate =
      totalSteps > 0
        ? Math.round(((totalSteps - breachedSteps) / totalSteps) * 10000) / 100
        : 100;

    return {
      total_instances: ids.length,
      total_steps: totalSteps,
      breached_steps: breachedSteps,
      compliance_rate,
      breached_by_step,
      period: {
        from: periodFrom.toISOString(),
        to: periodTo.toISOString(),
      },
    };
  }
}
