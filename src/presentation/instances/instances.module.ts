import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowInstancePersistence } from '../../infrastructure/database/entities/workflow-instance.persistence';
import { InstanceStepPersistence } from '../../infrastructure/database/entities/instance-step.persistence';
import { OrgChartMemberPersistence } from '../../infrastructure/database/entities/org-chart-member.persistence';
import { TemplateVersionPersistence } from '../../infrastructure/database/entities/template-version.persistence';
import { StepVotePersistence } from '../../infrastructure/database/entities/step-vote.persistence';
import { InstanceRepositoryImpl } from '../../infrastructure/database/repositories/instance.repository.impl';
import { StepRepositoryImpl } from '../../infrastructure/database/repositories/step.repository.impl';
import { OrgChartRepositoryImpl } from '../../infrastructure/database/repositories/org-chart.repository.impl';
import { TemplateVersionRepositoryImpl } from '../../infrastructure/database/repositories/template-version.repository.impl';
import { SlaSchedulerImpl } from '../../infrastructure/messaging/sla-scheduler.impl';
import { SLA_QUEUE_NAME } from '../../infrastructure/messaging/sla-scheduler.impl';
import { AuditPublisherImpl, AUDIT_QUEUE_NAME } from '../../infrastructure/messaging/audit-publisher.impl';
import { AUDIT_PUBLISHER_PORT } from '../../application/approvals/tokens';
import {
  INSTANCE_REPOSITORY,
  STEP_REPOSITORY,
  ORG_CHART_REPOSITORY,
  SLA_SCHEDULER,
} from '../../application/instances/repository.tokens';
import { TEMPLATE_VERSION_REPOSITORY } from '../../application/templates/repository.tokens';
import { CreateInstanceUseCase } from '../../application/instances/create-instance.usecase';
import { SubmitInstanceUseCase } from '../../application/instances/submit-instance.usecase';
import { GetInstanceUseCase } from '../../application/instances/get-instance.usecase';
import { ListInstancesUseCase } from '../../application/instances/list-instances.usecase';
import { GetTimelineUseCase } from '../../application/instances/get-timeline.usecase';
import { InstancesController } from './instances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowInstancePersistence,
      InstanceStepPersistence,
      StepVotePersistence,
      OrgChartMemberPersistence,
      TemplateVersionPersistence,
    ]),
    BullModule.registerQueue({ name: SLA_QUEUE_NAME }, { name: AUDIT_QUEUE_NAME }),
  ],
  controllers: [InstancesController],
  providers: [
    { provide: AUDIT_PUBLISHER_PORT, useClass: AuditPublisherImpl },
    {
      provide: INSTANCE_REPOSITORY,
      useClass: InstanceRepositoryImpl,
    },
    {
      provide: STEP_REPOSITORY,
      useClass: StepRepositoryImpl,
    },
    {
      provide: ORG_CHART_REPOSITORY,
      useClass: OrgChartRepositoryImpl,
    },
    {
      provide: TEMPLATE_VERSION_REPOSITORY,
      useClass: TemplateVersionRepositoryImpl,
    },
    {
      provide: SLA_SCHEDULER,
      useClass: SlaSchedulerImpl,
    },
    CreateInstanceUseCase,
    SubmitInstanceUseCase,
    GetInstanceUseCase,
    ListInstancesUseCase,
    GetTimelineUseCase,
  ],
})
export class InstancesModule {}
