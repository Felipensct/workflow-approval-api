import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Job } from 'bullmq';
import { SLA_QUEUE_NAME } from './sla-scheduler.impl';
import { InstanceStepPersistence } from '../database/entities/instance-step.persistence';
import { WorkflowInstancePersistence } from '../database/entities/workflow-instance.persistence';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import type { AuditRepository } from '../../domain/repositories/audit.repository';
import { AUDIT_REPOSITORY } from '../../application/audit/repository.tokens';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Processor(SLA_QUEUE_NAME, {
  concurrency: 5,
})
@Injectable()
export class SlaProcessor extends WorkerHost {
  constructor(
    @InjectRepository(InstanceStepPersistence)
    private readonly stepRepo: Repository<InstanceStepPersistence>,
    @InjectRepository(WorkflowInstancePersistence)
    private readonly instanceRepo: Repository<WorkflowInstancePersistence>,
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepository,
  ) {
    super();
  }

  async process(job: Job<{ stepId: string }, void, string>): Promise<void> {
    const { stepId } = job.data;
    const step = await this.stepRepo.findOne({ where: { id: stepId } });
    if (!step) return;
    if (step.status !== 'pending') return;

    const instance = await this.instanceRepo.findOne({
      where: { id: step.instance_id },
    });
    if (!instance) return;

    step.sla_breached = true;
    await this.stepRepo.save(step);

    const auditLog = new AuditLog(
      randomUUID(),
      instance.company_id,
      'instance_step',
      stepId,
      'SLA_BREACHED',
      '00000000-0000-0000-0000-000000000000',
      { instance_id: step.instance_id, step_ref: step.step_ref },
      new Date(),
    );
    await this.auditRepo.create(auditLog);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<{ stepId: string }, void, string> | undefined,
    err: Error,
  ): Promise<void> {
    if (!job) return;
    const isPermanentFailure =
      job.attemptsMade >= (job.opts?.attempts ?? 3);
    if (!isPermanentFailure) {
      return;
    }
    const payload: Record<string, unknown> = {
      jobId: job.id,
      jobName: job.name,
      error: err?.message ?? String(err),
    };
    if (job.data && typeof job.data === 'object') {
      payload.stepId = job.data.stepId;
    }
    const log = new AuditLog(
      randomUUID(),
      NIL_UUID,
      'job',
      NIL_UUID,
      'JOB_FAILED',
      NIL_UUID,
      payload,
      new Date(),
    );
    try {
      await this.auditRepo.create(log);
    } catch {
      // Evitar falha em cascata; log já tentado
    }
  }
}
