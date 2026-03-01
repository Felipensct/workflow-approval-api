import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowInstancePersistence } from '../../infrastructure/database/entities/workflow-instance.persistence';
import { InstanceStepPersistence } from '../../infrastructure/database/entities/instance-step.persistence';
import { SlaComplianceImpl } from '../../infrastructure/database/sla-compliance.impl';
import { GetSlaComplianceUseCase } from '../../application/analytics/get-sla-compliance.usecase';
import { AnalyticsController } from './analytics.controller';
import { SLA_COMPLIANCE_PORT } from '../../application/analytics/tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowInstancePersistence,
      InstanceStepPersistence,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    { provide: SLA_COMPLIANCE_PORT, useClass: SlaComplianceImpl },
    GetSlaComplianceUseCase,
  ],
})
export class AnalyticsModule {}
