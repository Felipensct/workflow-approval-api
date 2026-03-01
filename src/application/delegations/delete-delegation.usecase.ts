import { Inject, Injectable } from '@nestjs/common';
import type { DelegationRepository } from '../../domain/repositories/delegation.repository';
import type { AuditPublisherPort } from '../approvals/audit-publisher.port';
import { DELEGATION_REPOSITORY } from './repository.tokens';
import { AUDIT_PUBLISHER_PORT } from '../approvals/tokens';

@Injectable()
export class DeleteDelegationUseCase {
  constructor(
    @Inject(DELEGATION_REPOSITORY)
    private readonly delegationRepository: DelegationRepository,
    @Inject(AUDIT_PUBLISHER_PORT)
    private readonly auditPublisher: AuditPublisherPort,
  ) {}

  async execute(id: string, companyId: string): Promise<void> {
    const existing = await this.delegationRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('Delegação não encontrada');
    }

    await this.auditPublisher.publish({
      companyId: companyId,
      entityType: 'delegation',
      entityId: existing.id,
      action: 'DELEGATION_DELETED',
      actorId: existing.delegatorId,
      payload: {
        delegator_id: existing.delegatorId,
        delegate_id: existing.delegateId,
      },
    });

    await this.delegationRepository.delete(id, companyId);
  }
}
