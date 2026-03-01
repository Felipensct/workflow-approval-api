import { Inject, Injectable } from '@nestjs/common';
import type { Delegation } from '../../domain/entities/delegation.entity';
import type { DelegationRepository } from '../../domain/repositories/delegation.repository';
import { DELEGATION_REPOSITORY } from './repository.tokens';

@Injectable()
export class ListDelegationsUseCase {
  constructor(
    @Inject(DELEGATION_REPOSITORY)
    private readonly delegationRepository: DelegationRepository,
  ) {}

  async execute(companyId: string): Promise<Delegation[]> {
    return this.delegationRepository.list(companyId);
  }
}
