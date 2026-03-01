import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { AUDIT_QUEUE_NAME } from './audit-publisher.impl';
import type { AuditEvent } from '../../application/approvals/audit-publisher.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import type { AuditRepository } from '../../domain/repositories/audit.repository';
import { AUDIT_REPOSITORY } from '../../application/audit/repository.tokens';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Processor(AUDIT_QUEUE_NAME, {
  concurrency: 10,
})
@Injectable()
export class AuditProcessor extends WorkerHost {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepository,
  ) {
    super();
  }

  async process(job: Job<AuditEvent, void, string>): Promise<void> {
    const event = job.data;
    const log = new AuditLog(
      randomUUID(),
      event.companyId,
      event.entityType,
      event.entityId,
      event.action,
      event.actorId,
      event.payload ?? null,
      new Date(),
    );
    await this.auditRepo.create(log);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<AuditEvent, void, string> | undefined, err: Error): Promise<void> {
    if (!job) return;
    const companyId =
      (job.data && 'companyId' in job.data && job.data.companyId) || NIL_UUID;
    const payload: Record<string, unknown> = {
      jobId: job.id,
      jobName: job.name,
      error: err?.message ?? String(err),
    };
    if (job.data && typeof job.data === 'object') {
      payload.data = job.data;
    }
    const log = new AuditLog(
      randomUUID(),
      companyId,
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
