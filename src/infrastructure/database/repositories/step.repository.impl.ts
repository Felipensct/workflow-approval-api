import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanceStep } from '../../../domain/entities/instance-step.entity';
import { StepVote } from '../../../domain/entities/step-vote.entity';
import type { StepRepository } from '../../../domain/repositories/step.repository';
import { InstanceStepPersistence } from '../entities/instance-step.persistence';
import { StepVotePersistence } from '../entities/step-vote.persistence';

@Injectable()
export class StepRepositoryImpl implements StepRepository {
  constructor(
    @InjectRepository(InstanceStepPersistence)
    private readonly stepRepo: Repository<InstanceStepPersistence>,
    @InjectRepository(StepVotePersistence)
    private readonly voteRepo: Repository<StepVotePersistence>,
  ) {}

  async findById(
    stepId: string,
    companyId: string,
  ): Promise<InstanceStep | null> {
    const row = await this.stepRepo.findOne({ where: { id: stepId } });
    if (!row) return null;
    const [check] = await this.stepRepo.manager.query<{ n: number }[]>(
      'SELECT 1 AS n FROM workflow_instances WHERE id = $1 AND company_id = $2',
      [row.instance_id, companyId],
    );
    if (!check) return null;
    return this.stepToDomain(row);
  }

  async findByInstanceId(
    instanceId: string,
    companyId: string,
  ): Promise<InstanceStep[]> {
    const [check] = await this.stepRepo.manager.query<{ n: number }[]>(
      'SELECT 1 AS n FROM workflow_instances WHERE id = $1 AND company_id = $2',
      [instanceId, companyId],
    );
    if (!check) return [];
    const rows = await this.stepRepo.find({
      where: { instance_id: instanceId },
      order: { order_index: 'ASC' },
    });
    return rows.map((r) => this.stepToDomain(r));
  }

  async saveStep(step: InstanceStep): Promise<InstanceStep> {
    const row = this.stepToPersistence(step);
    const saved = await this.stepRepo.save(row);
    return this.stepToDomain(saved);
  }

  async saveVote(vote: StepVote): Promise<StepVote> {
    const row = this.voteToPersistence(vote);
    const saved = await this.voteRepo.save(row);
    return this.voteToDomain(saved);
  }

  async findVoteByStepAndApprover(
    stepId: string,
    approverId: string,
  ): Promise<StepVote | null> {
    const row = await this.voteRepo.findOne({
      where: { step_id: stepId, approver_id: approverId },
    });
    return row ? this.voteToDomain(row) : null;
  }

  async findVotesByStepId(stepId: string): Promise<StepVote[]> {
    const rows = await this.voteRepo.find({
      where: { step_id: stepId },
    });
    return rows.map((r) => this.voteToDomain(r));
  }

  private voteToDomain(row: StepVotePersistence): StepVote {
    return new StepVote(
      row.id,
      row.step_id,
      row.approver_id,
      row.decision as 'approve' | 'reject',
      row.delegated_by,
      row.voted_at,
    );
  }

  private voteToPersistence(vote: StepVote): StepVotePersistence {
    const p = new StepVotePersistence();
    p.id = vote.id;
    p.step_id = vote.stepId;
    p.approver_id = vote.approverId;
    p.decision = vote.decision;
    p.delegated_by = vote.delegatedBy;
    p.voted_at = vote.votedAt;
    return p;
  }

  private stepToDomain(row: InstanceStepPersistence): InstanceStep {
    return new InstanceStep(
      row.id,
      row.instance_id,
      row.step_ref,
      row.order_index,
      row.rule as 'ALL' | 'ANY' | 'QUORUM',
      row.quorum_count,
      row.status as 'pending' | 'approved' | 'rejected' | 'skipped',
      row.sla_hours,
      row.sla_deadline,
      row.sla_breached,
      row.resolved_at,
      row.created_at,
    );
  }

  private stepToPersistence(step: InstanceStep): InstanceStepPersistence {
    const p = new InstanceStepPersistence();
    p.id = step.id;
    p.instance_id = step.instanceId;
    p.step_ref = step.stepRef;
    p.order_index = step.orderIndex;
    p.rule = step.rule;
    p.quorum_count = step.quorumCount;
    p.status = step.status;
    p.sla_hours = step.slaHours;
    p.sla_deadline = step.slaDeadline;
    p.sla_breached = step.slaBreached;
    p.resolved_at = step.resolvedAt;
    p.created_at = step.createdAt;
    return p;
  }
}
