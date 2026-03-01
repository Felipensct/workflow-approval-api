import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { InstanceStepPersistence } from '../../infrastructure/database/entities/instance-step.persistence';
import { WorkflowInstancePersistence } from '../../infrastructure/database/entities/workflow-instance.persistence';
import { AuditLogPersistence } from '../../infrastructure/database/entities/audit-log.persistence';
import { AuditRepositoryImpl } from '../../infrastructure/database/repositories/audit.repository.impl';
import { SlaProcessor } from '../../infrastructure/messaging/sla.processor';
import { AuditProcessor } from '../../infrastructure/messaging/audit.processor';
import { SLA_QUEUE_NAME } from '../../infrastructure/messaging/sla-scheduler.impl';
import { AUDIT_QUEUE_NAME } from '../../infrastructure/messaging/audit-publisher.impl';
import { AUDIT_REPOSITORY } from '../../application/audit/repository.tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstanceStepPersistence,
      WorkflowInstancePersistence,
      AuditLogPersistence,
    ]),
    BullModule.registerQueue(
      { name: SLA_QUEUE_NAME },
      { name: AUDIT_QUEUE_NAME },
    ),
  ],
  providers: [
    { provide: AUDIT_REPOSITORY, useClass: AuditRepositoryImpl },
    SlaProcessor,
    AuditProcessor,
  ],
})
export class MessagingModule {}
