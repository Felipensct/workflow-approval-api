import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Delegation } from '../../domain/entities/delegation.entity';
import { DelegationCycleService } from '../../domain/services/delegation-cycle.service';
import { DelegationCycleException } from '../../domain/exceptions/delegation-cycle.exception';
import type { DelegationRepository } from '../../domain/repositories/delegation.repository';
import type { AuditPublisherPort } from '../approvals/audit-publisher.port';
import { DELEGATION_REPOSITORY } from './repository.tokens';
import { AUDIT_PUBLISHER_PORT } from '../approvals/tokens';

export interface CreateDelegationInput {
  companyId: string;
  delegatorId: string;
  delegateId: string;
  expiresAt: Date;
}

@Injectable()
export class CreateDelegationUseCase {
  private readonly cycleService = new DelegationCycleService();

  constructor(
    @Inject(DELEGATION_REPOSITORY)
    private readonly delegationRepository: DelegationRepository,
    @Inject(AUDIT_PUBLISHER_PORT)
    private readonly auditPublisher: AuditPublisherPort,
  ) {}

  async execute(input: CreateDelegationInput): Promise<Delegation> {
    const active = await this.delegationRepository.listActive(
      input.companyId,
      new Date(),
    );
    const edges = active.map((d) => ({
      delegatorId: d.delegatorId,
      delegateId: d.delegateId,
    }));

    if (this.cycleService.wouldCreateCycle(
      edges,
      input.delegatorId,
      input.delegateId,
    )) {
      throw new DelegationCycleException();
    }

    const delegation = new Delegation(
      randomUUID(),
      input.companyId,
      input.delegatorId,
      input.delegateId,
      input.expiresAt,
      new Date(),
    );
    const saved = await this.delegationRepository.save(delegation);

    await this.auditPublisher.publish({
      companyId: input.companyId,
      entityType: 'delegation',
      entityId: saved.id,
      action: 'DELEGATION_CREATED',
      actorId: input.delegatorId,
      payload: {
        delegator_id: saved.delegatorId,
        delegate_id: saved.delegateId,
        expires_at: saved.expiresAt.toISOString(),
      },
    });

    return saved;
  }
}
