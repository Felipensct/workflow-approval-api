import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { AuditPublisherPort, AuditEvent } from '../../application/approvals/audit-publisher.port';

export const AUDIT_QUEUE_NAME = 'audit';

@Injectable()
export class AuditPublisherImpl implements AuditPublisherPort {
  constructor(
    @InjectQueue(AUDIT_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async publish(event: AuditEvent): Promise<void> {
    await this.queue.add('event', event, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
