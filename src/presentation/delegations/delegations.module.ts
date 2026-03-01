import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DelegationPersistence } from '../../infrastructure/database/entities/delegation.persistence';
import { DelegationRepositoryImpl } from '../../infrastructure/database/repositories/delegation.repository.impl';
import { AuditPublisherImpl, AUDIT_QUEUE_NAME } from '../../infrastructure/messaging/audit-publisher.impl';
import { DELEGATION_REPOSITORY } from '../../application/delegations/repository.tokens';
import { AUDIT_PUBLISHER_PORT } from '../../application/approvals/tokens';
import { CreateDelegationUseCase } from '../../application/delegations/create-delegation.usecase';
import { ListDelegationsUseCase } from '../../application/delegations/list-delegations.usecase';
import { ListActiveDelegationsUseCase } from '../../application/delegations/list-active-delegations.usecase';
import { DeleteDelegationUseCase } from '../../application/delegations/delete-delegation.usecase';
import { DelegationsController } from './delegations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DelegationPersistence]),
    BullModule.registerQueue({ name: AUDIT_QUEUE_NAME }),
  ],
  controllers: [DelegationsController],
  providers: [
    { provide: AUDIT_PUBLISHER_PORT, useClass: AuditPublisherImpl },
    {
      provide: DELEGATION_REPOSITORY,
      useClass: DelegationRepositoryImpl,
    },
    CreateDelegationUseCase,
    ListDelegationsUseCase,
    ListActiveDelegationsUseCase,
    DeleteDelegationUseCase,
  ],
})
export class DelegationsModule {}
