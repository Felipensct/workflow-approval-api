import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { SlaSchedulerPort } from '../../application/instances/sla-scheduler.port';

export const SLA_QUEUE_NAME = 'sla';

@Injectable()
export class SlaSchedulerImpl implements SlaSchedulerPort {
  constructor(
    @InjectQueue(SLA_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async schedule(stepId: string, delayMs: number): Promise<void> {
    await this.queue.add(
      'check',
      { stepId },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
}
